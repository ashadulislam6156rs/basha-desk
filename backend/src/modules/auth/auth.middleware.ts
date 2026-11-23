import type { RequestHandler } from "express";
import { AppError } from "../../common/app-error.js";
import { corsOrigins, env } from "../../config/env.js";
import { authenticateTenantSession } from "./auth.service.js";

const cookieName = env.NODE_ENV === "production" ? "__Host-sid" : "tenant_sid";

export function setTenantSessionCookie(
  response: Parameters<RequestHandler>[1],
  token: string,
  maxAge: number,
) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearTenantSessionCookie(response: Parameters<RequestHandler>[1]) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export const requireTenantSession: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const tenant = response.locals.tenantContext;
    const token = request.cookies?.[cookieName];
    if (typeof token !== "string" || token.length < 40) {
      throw new AppError(
        401,
        "ERR_UNAUTHENTICATED",
        "Unauthorized",
        "Sign-in is required.",
      );
    }

    const result = await authenticateTenantSession(tenant, token);
    if (!result) {
      clearTenantSessionCookie(response);
      throw new AppError(
        401,
        "ERR_UNAUTHENTICATED",
        "Unauthorized",
        "Session is no longer valid for this workspace.",
      );
    }

    setTenantSessionCookie(
      response,
      token,
      result.renewedExpiresAt.getTime() - Date.now(),
    );
    response.locals.tenantAuth = {
      sessionId: result.session.id,
      sessionExpiresAt: result.renewedExpiresAt,
      absoluteExpiresAt: result.session.absoluteExpiresAt,
      user: result.session.user,
      membership: result.membership,
    };
    next();
  } catch (error) {
    if (error instanceof AppError && error.code === "ERR_TENANT_SESSION_MISMATCH") {
      clearTenantSessionCookie(response);
    }
    next(error);
  }
};

export function requireTenantPermission(
  permissionCode: string,
): RequestHandler {
  return (_request, response, next) => {
    const auth = response.locals.tenantAuth;
    const allowed = auth?.membership.role.rolePermissionsByRole.some(
      (entry: { permission: { code: string } }) =>
        entry.permission.code === permissionCode,
    );
    if (!allowed) {
      next(
        new AppError(
          403,
          "ERR_PERMISSION_DENIED",
          "Forbidden",
          "You do not have permission to perform this action.",
        ),
      );
      return;
    }
    next();
  };
}

export const requireTrustedOrigin: RequestHandler = (
  request,
  _response,
  next,
) => {
  const origin = request.get("origin");
  const marker = request.get("x-requested-with");
  if (!origin || !corsOrigins.has(origin) || marker !== "XMLHttpRequest") {
    next(
      new AppError(
        403,
        "ERR_CSRF",
        "Forbidden",
        "This request did not pass the workspace origin check.",
      ),
    );
    return;
  }
  next();
};
