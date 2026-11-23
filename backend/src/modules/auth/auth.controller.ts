import type { RequestHandler } from "express";
import { AppError } from "../../common/app-error.js";
import {
  clearTenantSessionCookie,
  setTenantSessionCookie,
} from "./auth.middleware.js";
import {
  profileData,
  signInTenantUser,
  signOutTenantSession,
  TenantAccountLockedError,
  updateTenantProfile,
} from "./auth.service.js";
import {
  assertBcryptPasswordLength,
  loginSchema,
  profileUpdateSchema,
} from "./auth.validation.js";

export const loginController: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  assertBcryptPasswordLength(input.password);
  const tenant = response.locals.tenantContext;

  try {
    const result = await signInTenantUser(tenant, input, {
      ip: request.ip,
      requestId: String(request.id),
      userAgent: request.get("user-agent"),
    });
    setTenantSessionCookie(
      response,
      result.token,
      result.session.expiresAt.getTime() - Date.now(),
    );
    response.json({
      data: profileData(tenant, result.user, result.membership, {
        expiresAt: result.session.expiresAt,
        absoluteExpiresAt: result.session.absoluteExpiresAt,
      }),
    });
  } catch (error) {
    if (error instanceof TenantAccountLockedError) {
      response.setHeader("Retry-After", String(error.retryAfterSeconds));
    }
    if (error instanceof AppError && error.code === "ERR_INVALID_CREDENTIALS") {
      request.log?.warn(
        { tenantId: tenant.id, requestId: String(request.id) },
        "Tenant staff sign-in failed",
      );
    }
    throw error;
  }
};

export const profileController: RequestHandler = (_request, response) => {
  const tenant = response.locals.tenantContext;
  const auth = response.locals.tenantAuth;
  response.json({
    data: profileData(tenant, auth.user, auth.membership, {
      expiresAt: auth.sessionExpiresAt,
      absoluteExpiresAt: auth.absoluteExpiresAt,
    }),
  });
};

export const updateProfileController: RequestHandler = async (
  request,
  response,
) => {
  const input = profileUpdateSchema.parse(request.body);
  const tenant = response.locals.tenantContext;
  const auth = response.locals.tenantAuth;
  const updatedUser = await updateTenantProfile(tenant.id, auth.user, input, {
    ip: request.ip,
    requestId: String(request.id),
  });
  response.json({
    data: profileData(tenant, updatedUser, auth.membership, {
      expiresAt: auth.sessionExpiresAt,
      absoluteExpiresAt: auth.absoluteExpiresAt,
    }),
  });
};

export const logoutController: RequestHandler = async (request, response) => {
  const tenant = response.locals.tenantContext;
  const auth = response.locals.tenantAuth;
  await signOutTenantSession(tenant.id, auth.sessionId, auth.user.id, {
    ip: request.ip,
    requestId: String(request.id),
  });
  clearTenantSessionCookie(response);
  response.status(204).end();
};
