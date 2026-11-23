import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";

export const requestLogger = pinoHttp({
  level: env.LOG_LEVEL,
  genReqId: (_request, response) => {
    const requestId = randomUUID();
    response.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customLogLevel: (_request, response, error) => {
    if (error || response.statusCode >= 500) return "error";
    if (response.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (request) => ({
      id: request.id,
      method: request.method,
      url: request.url?.split("?")[0],
      remoteAddress: request.socket?.remoteAddress,
    }),
  },
  autoLogging: {
    ignore: (request) => request.url === "/health" || request.url === "/health/live",
  },
});
