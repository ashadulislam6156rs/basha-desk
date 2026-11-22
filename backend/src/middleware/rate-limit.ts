import { rateLimit } from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

function problemRateLimitHandler(detail: string) {
  return (request: Request, response: Response) => {
    response.status(429).type("application/problem+json").json({
      type: "about:blank",
      title: "Too Many Requests",
      status: 429,
      detail,
      instance: request.path,
      code: "ERR_RATE_LIMITED",
      requestId: request.id,
    });
  };
}

const sharedOptions = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
};

export const apiRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  limit: env.API_RATE_LIMIT_MAX,
  handler: problemRateLimitHandler("Too many API requests. Please try again later."),
});

// Mount on login routes. This IP-based limiter counts failed responses only;
// account-level lockout must also be implemented in the auth service.
export const loginRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  handler: problemRateLimitHandler("Too many failed login attempts. Please try again later."),
});

// Mount separately on OTP request routes; add phone/account-level cooldown too.
export const otpRequestRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  handler: problemRateLimitHandler("Too many OTP requests. Please try again later."),
});
