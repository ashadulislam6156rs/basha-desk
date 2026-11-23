import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { apiRateLimit } from "../middleware/rate-limit.js";
import { platformRouter } from "../modules/platform/platform.routes.js";

export const apiRouter = Router();

apiRouter.use(apiRateLimit);
apiRouter.use("/platform", platformRouter);

apiRouter.get("/", (_request, response) => {
  response.json({ name: "Basha Desk API", version: "v1" });
});

// Public readiness check; does not expose database errors or credentials.
apiRouter.get("/public/status", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({
      service: "Basha Desk API",
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: { api: "ok", database: "ok" },
    });
  } catch {
    response.status(503).json({
      service: "Basha Desk API",
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks: { api: "ok", database: "unavailable" },
    });
  }
});
