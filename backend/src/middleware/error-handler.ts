import type { ErrorRequestHandler, RequestHandler, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../common/app-error.js";
import { env } from "../config/env.js";

function problem(
  request: Request,
  response: Response,
  status: number,
  code: string,
  title: string,
  detail: string,
  extensions: Record<string, unknown> = {},
) {
  response.status(status).type("application/problem+json").json({
    type: "about:blank",
    title,
    status,
    detail,
    instance: request.path,
    code,
    requestId: request.id,
    ...extensions,
  });
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, "ERR_NOT_FOUND", "Not Found", "The requested resource was not found."));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (response.headersSent) return;

  if (error instanceof AppError) {
    request.log.warn({ code: error.code, requestId: request.id }, error.message);
    problem(request, response, error.status, error.code, error.message, error.detail);
    return;
  }

  if (error instanceof ZodError) {
    problem(request, response, 422, "ERR_VALIDATION", "Validation Error", "One or more fields are invalid.", {
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error) {
    const parserError = error as { type?: unknown };
    if (parserError.type === "entity.parse.failed") {
      problem(request, response, 400, "ERR_INVALID_JSON", "Invalid JSON", "The request body contains invalid JSON.");
      return;
    }
    if (parserError.type === "entity.too.large") {
      problem(request, response, 413, "ERR_BODY_TOO_LARGE", "Payload Too Large", "The request body exceeds the allowed size.");
      return;
    }
  }

  const safeError = error instanceof Error ? error : new Error("Unknown request error");
  request.log.error({
    errorName: safeError.name,
    ...(env.NODE_ENV === "development" ? { stack: safeError.stack } : {}),
    requestId: request.id,
  }, "Unhandled request error");
  problem(request, response, 500, "ERR_INTERNAL", "Internal Server Error", "An unexpected error occurred.");
};
