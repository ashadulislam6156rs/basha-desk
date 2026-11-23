import { createHash, randomBytes } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/app-error.js";
import { prisma } from "../../db/prisma.js";
import { withTenantTransaction } from "../../db/tenant-transaction.js";
import type { TenantContext } from "../../middleware/tenant-context.js";
import type { LoginInput, ProfileUpdateInput } from "./auth.validation.js";

const INACTIVITY_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const FAILED_LOGIN_LIMIT = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("BashaDesk-invalid-login-dummy", 12);

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  return trimmed.includes("@")
    ? trimmed.toLowerCase()
    : trimmed.replace(/[\s()-]/g, "");
}

export type AuditRequestMetadata = {
  ip?: string;
  requestId: string;
  userAgent?: string;
};

export class TenantAccountLockedError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      423,
      "ERR_ACCOUNT_LOCKED",
      "Account Locked",
      "Too many failed sign-in attempts. Try again after the lock expires.",
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }

  readonly retryAfterSeconds: number;
}

export async function loadMembership(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
) {
  const membership = await tx.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: {
      role: {
        include: {
          rolePermissionsByRole: {
            include: { permission: { select: { code: true } } },
          },
        },
      },
      membershipPropertyScopesByMembership: { select: { propertyId: true } },
    },
  });
  if (!membership || !membership.isActive) return null;
  if (
    membership.role.isSystem
      ? membership.role.tenantId !== null
      : membership.role.tenantId !== tenantId
  ) {
    return null;
  }
  return membership;
}

export type TenantMembership = NonNullable<
  Awaited<ReturnType<typeof loadMembership>>
>;

export function profileData(
  tenant: TenantContext,
  user: Pick<User, "id" | "name" | "email" | "phone" | "locale" | "theme">,
  membership: TenantMembership,
  session?: { expiresAt: Date; absoluteExpiresAt: Date },
) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      locale: user.locale,
      theme: user.theme,
    },
    tenant,
    membership: {
      id: membership.id,
      role: {
        id: membership.role.id,
        code: membership.role.code,
        nameBn: membership.role.nameBn,
        nameEn: membership.role.nameEn,
      },
      scopeAll: membership.scopeAll,
      propertyIds: membership.membershipPropertyScopesByMembership.map(
        (scope) => scope.propertyId,
      ),
    },
    permissions: membership.role.rolePermissionsByRole
      .map((item) => item.permission.code)
      .sort(),
    ...(session ? { session } : {}),
  };
}

export async function signInTenantUser(
  tenant: TenantContext,
  input: LoginInput,
  request: AuditRequestMetadata,
) {
  const identifier = normalizeIdentifier(input.identifier);
  const user = await withTenantTransaction(tenant.id, (tx) =>
    tx.user.findFirst({
      where: {
        tenantId: tenant.id,
        kind: "STAFF",
        isActive: true,
        OR: [{ email: identifier }, { phone: identifier }],
      },
    }),
  );

  if (!user) {
    await bcrypt.compare(input.password, DUMMY_PASSWORD_HASH);
    throw new AppError(
      401,
      "ERR_INVALID_CREDENTIALS",
      "Unauthorized",
      "Email/phone or password is incorrect.",
    );
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    throw new TenantAccountLockedError(
      Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000),
    );
  }
  if (user.lockedUntil && user.lockedUntil <= now) {
    await withTenantTransaction(tenant.id, (tx) =>
      tx.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      }),
    );
  }

  if (
    !(await bcrypt.compare(
      input.password,
      user.passwordHash ?? DUMMY_PASSWORD_HASH,
    )) ||
    !user.passwordHash
  ) {
    await withTenantTransaction(tenant.id, async (tx) => {
      await tx.$executeRaw`
        UPDATE "users"
        SET "failed_login_count" = "failed_login_count" + 1,
            "updated_at" = NOW(),
            "locked_until" = CASE
              WHEN "failed_login_count" + 1 >= ${FAILED_LOGIN_LIMIT}
              THEN NOW() + (${ACCOUNT_LOCK_MS} * INTERVAL '1 millisecond')
              ELSE "locked_until"
            END
        WHERE "tenant_id" = ${tenant.id}::uuid AND "id" = ${user.id}::uuid
      `;
    });
    throw new AppError(
      401,
      "ERR_INVALID_CREDENTIALS",
      "Unauthorized",
      "Email/phone or password is incorrect.",
    );
  }

  const membership = await withTenantTransaction(tenant.id, (tx) =>
    loadMembership(tx, tenant.id, user.id),
  );
  if (!membership) {
    throw new AppError(
      403,
      "ERR_MEMBERSHIP_REQUIRED",
      "Workspace Access Required",
      "This account does not have an active role in this workspace.",
    );
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INACTIVITY_MS);
  const absoluteExpiresAt = new Date(Date.now() + ABSOLUTE_SESSION_MS);
  const session = await withTenantTransaction(tenant.id, async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    const createdSession = await tx.session.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tokenHash: hashToken(token),
        ip: request.ip,
        userAgent: request.userAgent?.slice(0, 500),
        expiresAt,
        absoluteExpiresAt,
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        actorKind: "USER",
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        ip: request.ip,
        requestId: request.requestId,
      },
    });
    return createdSession;
  });

  return { token, user, membership, session };
}

export async function authenticateTenantSession(
  tenant: TenantContext,
  token: string,
) {
  const sessionIndex = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, tenantId: true },
  });
  if (!sessionIndex) return null;

  if (sessionIndex.tenantId !== tenant.id) {
    await prisma.session.updateMany({
      where: { id: sessionIndex.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      401,
      "ERR_TENANT_SESSION_MISMATCH",
      "Unauthorized",
      "This session belongs to a different workspace. Sign in again.",
    );
  }

  const now = new Date();
  return withTenantTransaction(tenant.id, async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionIndex.id },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.absoluteExpiresAt <= now ||
      !session.user.isActive ||
      session.user.kind !== "STAFF"
    ) {
      if (session && !session.revokedAt) {
        await tx.session.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });
      }
      return null;
    }

    const membership = await loadMembership(tx, tenant.id, session.userId);
    if (!membership) {
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return null;
    }

    const renewedExpiresAt = new Date(
      Math.min(
        now.getTime() + INACTIVITY_MS,
        session.absoluteExpiresAt.getTime(),
      ),
    );
    await tx.session.update({
      where: { id: session.id },
      data: { lastSeenAt: now, expiresAt: renewedExpiresAt },
    });
    return { session, membership, renewedExpiresAt };
  });
}

export async function updateTenantProfile(
  tenantId: string,
  user: Pick<User, "id" | "name" | "locale" | "theme">,
  input: ProfileUpdateInput,
  request: Pick<AuditRequestMetadata, "ip" | "requestId">,
) {
  return withTenantTransaction(tenantId, async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: input,
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        actorKind: "USER",
        action: "profile.update",
        entityType: "user",
        entityId: user.id,
        before: { name: user.name, locale: user.locale, theme: user.theme },
        after: {
          name: updatedUser.name,
          locale: updatedUser.locale,
          theme: updatedUser.theme,
        },
        ip: request.ip,
        requestId: request.requestId,
      },
    });
    return updatedUser;
  });
}

export async function signOutTenantSession(
  tenantId: string,
  sessionId: string,
  userId: string,
  request: Pick<AuditRequestMetadata, "ip" | "requestId">,
) {
  await withTenantTransaction(tenantId, async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        actorKind: "USER",
        action: "auth.logout",
        entityType: "session",
        entityId: sessionId,
        ip: request.ip,
        requestId: request.requestId,
      },
    });
  });
}
