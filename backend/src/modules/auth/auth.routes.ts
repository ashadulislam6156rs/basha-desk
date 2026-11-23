import { Router } from "express";
import { loginRateLimit } from "../../middleware/rate-limit.js";
import { resolveTenantContext } from "../../middleware/tenant-context.js";
import {
  loginController,
  logoutController,
  profileController,
  updateProfileController,
} from "./auth.controller.js";
import {
  requireTenantSession,
  requireTrustedOrigin,
} from "./auth.middleware.js";

export const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

authRouter.post("/login", resolveTenantContext, loginRateLimit, loginController);
authRouter.get(
  "/profile",
  resolveTenantContext,
  requireTenantSession,
  profileController,
);
authRouter.patch(
  "/profile",
  resolveTenantContext,
  requireTenantSession,
  requireTrustedOrigin,
  updateProfileController,
);
authRouter.post(
  "/logout",
  resolveTenantContext,
  requireTenantSession,
  requireTrustedOrigin,
  logoutController,
);
