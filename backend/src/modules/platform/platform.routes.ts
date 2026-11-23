import { createHash, randomBytes } from "node:crypto";
import { Router, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../../common/app-error.js";
import { prisma } from "../../db/prisma.js";
import { loginRateLimit } from "../../middleware/rate-limit.js";
import { createTotpSecret, decryptTotpSecret, encryptTotpSecret, totpUri, verifyTotp } from "./totp.js";

const router = Router();
const PLATFORM_COOKIE = "platform_sid";
const SESSION_HOURS = 8;
const inviteTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

router.get("/accept-invite", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#114f4d"><title>Join Basha Desk</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#183330;background:#f3f7f6}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:min(100%,520px);background:#fff;border:1px solid #dce8e5;border-radius:18px;padding:32px;box-shadow:0 18px 55px #123b3512}.brand{color:#114f4d;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:14px 0 8px;font-size:28px;letter-spacing:-.03em}p{color:#526663;line-height:1.55}.field{display:grid;gap:7px;margin:16px 0}label{font-size:13px;font-weight:650}input{width:100%;padding:12px;border:1px solid #cbd9d6;border-radius:9px;font:inherit}button{width:100%;padding:12px;border:0;border-radius:9px;background:#114f4d;color:white;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.55;cursor:wait}.notice{padding:12px;border-radius:9px;background:#eef5f3;color:#38514d;font-size:13px;overflow-wrap:anywhere}.error{color:#a52e2e}.hidden{display:none!important}code{overflow-wrap:anywhere}footer{margin-top:22px;color:#71827f;font-size:12px}
</style></head><body><main><div class="brand">Basha Desk</div><h1>Accept platform invitation</h1><p id="intro">Checking your invitation…</p><p id="error" class="error hidden" role="alert"></p>
<form id="accept" class="hidden"><div class="notice" id="invite"></div><div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120"></div><div class="field"><label for="password">Create password</label><input id="password" name="password" type="password" autocomplete="new-password" required minlength="12"><small>Use at least 12 characters.</small></div><button id="acceptButton">Create account and continue</button></form>
<section id="mfa" class="hidden"><h2>Secure your account with MFA</h2><p>Add this secret to your authenticator app. Enter the six-digit code to finish setup.</p><div class="notice"><strong>Secret:</strong> <code id="secret"></code><br><br><strong>Authenticator URI:</strong> <code id="uri"></code></div><div class="field"><label for="code">Authenticator code</label><input id="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"></div><button id="confirmButton">Enable MFA</button></section>
<section id="done" class="hidden"><div class="notice">Your platform account is ready and MFA is enabled. This page can now be closed.</div></section><footer>Invitation links expire after 72 hours and can be used once.</footer></main><script src="/api/v1/platform/accept-invite.js" defer></script></body></html>`);
});

router.get("/accept-invite.js", (_request, response) => {
  response.type("application/javascript").send(`(() => {
const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1);
history.replaceState(null, "", location.pathname);
let email = "";
let password = "";
let accepted = false;
function showError(message) { $("error").textContent = message; $("error").classList.remove("hidden"); }
async function post(path, body) {
  const response = await fetch("/api/v1/platform" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "The request could not be completed.");
  return data;
}
(async () => {
  if (!token) throw new Error("This invitation link is missing its token.");
  const data = await post("/invites/validate", { token });
  email = data.email;
  $("intro").textContent = "You are invited to join the Basha Desk platform team as " + data.role + ".";
  $("invite").textContent = "Invitation for " + email + " · expires " + new Date(data.expiresAt).toLocaleString();
  $("accept").classList.remove("hidden");
})().catch((error) => showError(error.message));

$("accept").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("acceptButton"); button.disabled = true;
  password = $("password").value;
  try {
    if (!accepted) {
      await post("/invites/accept", { token, name: $("name").value, password });
      accepted = true;
    }
    const setup = await post("/auth/mfa/setup", { email, password });
    $("accept").classList.add("hidden"); $("mfa").classList.remove("hidden");
    $("secret").textContent = setup.secret; $("uri").textContent = setup.otpauthUrl;
    $("intro").textContent = "Account created. Finish MFA setup before using the platform.";
  } catch (error) { showError(error.message); button.disabled = false; }
});

$("confirmButton").addEventListener("click", async () => {
  const button = $("confirmButton"); button.disabled = true;
  try {
    await post("/auth/mfa/confirm", { email, password, code: $("code").value });
    password = ""; $("mfa").classList.add("hidden"); $("done").classList.remove("hidden");
    $("intro").textContent = "Welcome to Basha Desk.";
  } catch (error) { showError(error.message); button.disabled = false; }
});
})();`);
});

function setSessionCookie(response: Parameters<RequestHandler>[1], token: string) {
  response.cookie(PLATFORM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });
}

async function audit(
  platformUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  after: Prisma.InputJsonObject,
  request: Parameters<RequestHandler>[0],
  before?: Prisma.InputJsonObject,
) {
  await prisma.platformAuditLog.create({
    data: {
      platformUserId,
      action,
      entityType,
      entityId,
      before,
      after,
      ip: request.ip,
      requestId: String(request.id),
    },
  });
}

async function credentials(email: string, password: string) {
  const user = await prisma.platformUser.findUnique({
    where: { email },
    include: { role: true, platformMfa: true },
  });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "ERR_INVALID_CREDENTIALS", "Unauthorized", "Email or password is incorrect.");
  }
  if (!user.role.isActive) {
    throw new AppError(403, "ERR_PLATFORM_ROLE_INACTIVE", "Forbidden", "This platform role is inactive.");
  }
  return user;
}

async function issueSession(userId: string, request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await prisma.platformSession.create({
    data: {
      platformUserId: userId,
      tokenHash: inviteTokenHash(token),
      ip: request.ip,
      userAgent: request.get("user-agent")?.slice(0, 500),
      expiresAt,
    },
  });
  setSessionCookie(response, token);
}

const platformAuth: RequestHandler = async (request, response, next) => {
  try {
    const token = request.cookies?.[PLATFORM_COOKIE];
    if (typeof token !== "string" || token.length < 40) {
      throw new AppError(401, "ERR_UNAUTHENTICATED", "Unauthorized", "Platform login is required.");
    }
    const session = await prisma.platformSession.findUnique({
      where: { tokenHash: inviteTokenHash(token) },
      include: {
        platformUser: {
          include: { role: true, platformMfa: true },
        },
      },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.platformUser.isActive) {
      throw new AppError(401, "ERR_UNAUTHENTICATED", "Unauthorized", "Platform session is invalid or expired.");
    }
    if (!session.platformUser.platformMfa?.enabledAt) {
      throw new AppError(403, "ERR_MFA_REQUIRED", "Forbidden", "Enable MFA before using platform administration.");
    }
    if (!session.platformUser.role.isActive) {
      throw new AppError(403, "ERR_PLATFORM_ROLE_INACTIVE", "Forbidden", "This platform role is inactive.");
    }
    response.locals.platformUser = session.platformUser;
    response.locals.platformSessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
};

const requireSuperAdmin: RequestHandler = (_request, response, next) => {
  const user = response.locals.platformUser;
  if (!user?.role?.isSuperAdmin) {
    next(new AppError(403, "ERR_FORBIDDEN", "Forbidden", "Only a Platform Super Admin can manage platform invitations."));
    return;
  }
  next();
};

router.post("/auth/mfa/setup", loginRateLimit, async (request, response) => {
  const input = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).parse(request.body);
  const user = await credentials(input.email, input.password);
  if (user.platformMfa?.enabledAt) {
    throw new AppError(409, "ERR_MFA_ALREADY_ENABLED", "Conflict", "MFA is already enabled for this account.");
  }
  const secret = createTotpSecret();
  await prisma.platformMfa.upsert({
    where: { platformUserId: user.id },
    create: { platformUserId: user.id, totpSecretEnc: encryptTotpSecret(secret), recoveryCodesHash: [] },
    update: { totpSecretEnc: encryptTotpSecret(secret), enabledAt: null, recoveryCodesHash: [] },
  });
  response.json({
    message: "Add this account to an authenticator app, then confirm with the current six-digit code.",
    secret,
    otpauthUrl: totpUri(secret, user.email),
  });
});

router.post("/auth/mfa/confirm", loginRateLimit, async (request, response) => {
  const input = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200), code: z.string().regex(/^\d{6}$/) }).parse(request.body);
  const user = await credentials(input.email, input.password);
  const mfa = user.platformMfa;
  if (!mfa || mfa.enabledAt || !verifyTotp(decryptTotpSecret(mfa?.totpSecretEnc ?? ""), input.code)) {
    throw new AppError(401, "ERR_INVALID_MFA_CODE", "Unauthorized", "MFA setup or verification failed.");
  }
  await prisma.platformMfa.update({ where: { platformUserId: user.id }, data: { enabledAt: new Date() } });
  await issueSession(user.id, request, response);
  await audit(user.id, "platform.auth.mfa_enabled", "platform_user", user.id, { enabled: true }, request);
  response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role.code } });
});

router.post("/auth/login", loginRateLimit, async (request, response) => {
  const input = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200), code: z.string().regex(/^\d{6}$/).optional() }).parse(request.body);
  const user = await credentials(input.email, input.password);
  const mfa = user.platformMfa;
  if (!mfa?.enabledAt) {
    throw new AppError(403, "ERR_MFA_SETUP_REQUIRED", "MFA Setup Required", "Set up MFA before signing in to the platform.");
  }
  if (!input.code || !verifyTotp(decryptTotpSecret(mfa.totpSecretEnc), input.code)) {
    throw new AppError(401, "ERR_INVALID_MFA_CODE", "Unauthorized", "Email, password, or MFA code is incorrect.");
  }
  await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await issueSession(user.id, request, response);
  await audit(user.id, "platform.auth.login", "platform_user", user.id, {}, request);
  response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role.code } });
});

router.post("/auth/logout", platformAuth, async (_request, response) => {
  await prisma.platformSession.update({ where: { id: response.locals.platformSessionId }, data: { revokedAt: new Date() } });
  response.clearCookie(PLATFORM_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  response.status(204).end();
});

router.get("/auth/me", platformAuth, (_request, response) => {
  const user = response.locals.platformUser;
  response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role.code, isSuperAdmin: user.role.isSuperAdmin } });
});

// Keep invite tokens in POST bodies so access logs never record them in URLs.
router.post("/invites/validate", loginRateLimit, async (request, response) => {
  const { token } = z.object({ token: z.string().min(40).max(200) }).parse(request.body);
  const invite = await prisma.platformInvite.findUnique({ where: { tokenHash: inviteTokenHash(token) }, include: { role: true } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt <= new Date() || !invite.role.isActive) {
    throw new AppError(404, "ERR_INVITE_INVALID", "Not Found", "This platform invitation is invalid or expired.");
  }
  response.json({ email: invite.email, role: invite.role.nameEn, expiresAt: invite.expiresAt });
});

// Public, one-time acceptance. A platform account with this email must use the
// authenticated role-assignment endpoint instead of creating a duplicate.
router.post("/invites/accept", loginRateLimit, async (request, response) => {
  const input = z.object({ token: z.string().min(40).max(200), name: z.string().trim().min(2).max(120), password: z.string().min(12).max(200) }).parse(request.body);
  if (bcrypt.truncates(input.password)) {
    throw new AppError(422, "ERR_PASSWORD_TOO_LONG", "Validation Error", "Password must be at most 72 UTF-8 bytes.");
  }
  const invite = await prisma.platformInvite.findUnique({ where: { tokenHash: inviteTokenHash(input.token) }, include: { role: true } });
  if (!invite || invite.status !== "PENDING" || invite.expiresAt <= new Date() || !invite.role.isActive) {
    throw new AppError(404, "ERR_INVITE_INVALID", "Not Found", "This platform invitation is invalid or expired.");
  }
  if (await prisma.platformUser.findUnique({ where: { email: invite.email }, select: { id: true } })) {
    throw new AppError(409, "ERR_PLATFORM_USER_EXISTS", "Conflict", "An account already exists. Sign in and ask a Super Admin to assign the role.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const accepted = await tx.platformInvite.updateMany({
      where: { id: invite.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (accepted.count !== 1) throw new AppError(409, "ERR_INVITE_ALREADY_USED", "Conflict", "This platform invitation has already been used.");
    const created = await tx.platformUser.create({
      data: { email: invite.email, name: input.name, passwordHash, roleId: invite.roleId },
      select: { id: true, email: true, name: true },
    });
    await tx.platformAuditLog.create({
      data: { platformUserId: created.id, action: "platform.invite.accept", entityType: "platform_invite", entityId: invite.id, after: { email: invite.email, roleId: invite.roleId } },
    });
    return created;
  });
  response.status(201).json({ user: result, mfaSetupRequired: true, next: "/api/v1/platform/auth/mfa/setup" });
});

router.use(platformAuth, requireSuperAdmin);

router.get("/invites", async (_request, response) => {
  const invites = await prisma.platformInvite.findMany({
    where: { status: "PENDING", expiresAt: { gt: new Date() } },
    include: { role: { select: { id: true, code: true, nameBn: true, nameEn: true } } },
    orderBy: { createdAt: "desc" },
  });
  response.json({ invites });
});

router.get("/roles", async (_request, response) => {
  const roles = await prisma.platformRole.findMany({
    select: { id: true, code: true, nameBn: true, nameEn: true, description: true, isSuperAdmin: true, isSystem: true, isActive: true },
    orderBy: { code: "asc" },
  });
  response.json({ roles });
});

router.get("/users", async (_request, response) => {
  const users = await prisma.platformUser.findMany({
    select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true, role: { select: { id: true, code: true, nameBn: true, nameEn: true, isSuperAdmin: true } } },
    orderBy: { email: "asc" },
  });
  response.json({ users });
});

router.post("/invites", async (request, response) => {
  const input = z.object({ email: z.string().email().max(254), roleId: z.string().uuid() }).parse(request.body);
  const email = input.email.toLowerCase();
  const existingUser = await prisma.platformUser.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new AppError(409, "ERR_PLATFORM_USER_EXISTS", "Conflict", "Assign an existing user's role with PATCH /users/:id/role.");
  const role = await prisma.platformRole.findUnique({ where: { id: input.roleId } });
  if (!role?.isActive) throw new AppError(404, "ERR_PLATFORM_ROLE_NOT_FOUND", "Not Found", "The selected platform role is unavailable.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const invite = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`;
    await tx.platformInvite.updateMany({ where: { email, status: "PENDING" }, data: { status: "REVOKED", revokedAt: new Date() } });
    const created = await tx.platformInvite.create({
      data: { email, roleId: role.id, invitedByPlatformUserId: response.locals.platformUser.id, tokenHash: inviteTokenHash(token), expiresAt },
    });
    await tx.platformAuditLog.create({
      data: { platformUserId: response.locals.platformUser.id, action: "platform.invite.create", entityType: "platform_invite", entityId: created.id, after: { email, roleId: role.id, expiresAt: expiresAt.toISOString() }, ip: request.ip, requestId: String(request.id) },
    });
    return created;
  });
  const origin = process.env.PLATFORM_INVITE_ORIGIN ?? "http://localhost:4000";
  response.status(201).json({
    id: invite.id,
    email: invite.email,
    role: { id: role.id, code: role.code, nameBn: role.nameBn, nameEn: role.nameEn },
    expiresAt: invite.expiresAt,
    acceptUrl: `${origin.replace(/\/$/, "")}/api/v1/platform/accept-invite#${token}`,
    acceptEndpoint: "/api/v1/platform/invites/accept",
    delivery: "manual",
  });
});

router.delete("/invites/:id", async (request, response) => {
  const id = z.string().uuid().parse(request.params.id);
  const invite = await prisma.platformInvite.findUnique({ where: { id } });
  if (!invite || invite.status !== "PENDING") throw new AppError(404, "ERR_INVITE_NOT_FOUND", "Not Found", "Pending invitation not found.");
  await prisma.platformInvite.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
  await audit(response.locals.platformUser.id, "platform.invite.revoke", "platform_invite", id, { email: invite.email }, request);
  response.status(204).end();
});

router.patch("/users/:id/role", async (request, response) => {
  const id = z.string().uuid().parse(request.params.id);
  const input = z.object({ roleId: z.string().uuid() }).parse(request.body);
  const [target, nextRole] = await Promise.all([
    prisma.platformUser.findUnique({ where: { id }, include: { role: true } }),
    prisma.platformRole.findUnique({ where: { id: input.roleId } }),
  ]);
  if (!target) throw new AppError(404, "ERR_PLATFORM_USER_NOT_FOUND", "Not Found", "Platform user not found.");
  if (!nextRole?.isActive) throw new AppError(404, "ERR_PLATFORM_ROLE_NOT_FOUND", "Not Found", "The selected platform role is unavailable.");
  if (target.roleId !== nextRole.id && target.role.isSuperAdmin && !nextRole.isSuperAdmin) {
    const activeSuperAdmins = await prisma.platformUser.count({ where: { isActive: true, role: { isSuperAdmin: true } } });
    if (activeSuperAdmins <= 1) throw new AppError(409, "ERR_LAST_SUPER_ADMIN", "Conflict", "The last active Platform Super Admin cannot be demoted.");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.platformUser.update({ where: { id }, data: { roleId: nextRole.id }, select: { id: true, email: true, name: true, roleId: true } });
    await tx.platformSession.updateMany({ where: { platformUserId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.platformAuditLog.create({
      data: { platformUserId: response.locals.platformUser.id, action: "platform.user.role_change", entityType: "platform_user", entityId: id, before: { roleId: target.roleId }, after: { roleId: nextRole.id }, ip: request.ip, requestId: String(request.id) },
    });
    return user;
  });
  response.json({ user: updated, role: { id: nextRole.id, code: nextRole.code, nameBn: nextRole.nameBn, nameEn: nextRole.nameEn } });
});

export const platformRouter = router;
