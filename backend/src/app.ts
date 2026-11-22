import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigins, env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { apiRouter } from "./routes/api.routes.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);

app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || corsOrigins.has(origin)),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "Idempotency-Key",
      "X-Requested-With",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "RateLimit",
      "RateLimit-Policy",
      "Retry-After",
    ],
    maxAge: 600,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(healthRouter);
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
