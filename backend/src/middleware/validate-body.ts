import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../common/app-error.js";

export function validateBody<TSchema extends ZodType>(schema: TSchema): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new AppError(422, "ERR_VALIDATION", "Validation Error", "One or more fields are invalid."));
      return;
    }
    request.body = result.data;
    next();
  };
}
