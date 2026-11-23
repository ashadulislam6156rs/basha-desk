import { Router } from "express";
import { prisma } from "../db/prisma.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_request, response) => {
  let database: "ok" | "unavailable" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  const healthy = database === "ok";
  response.status(healthy ? 200 : 503).json({
    service: "Basha Desk API",
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? "unknown",
    checks: {
      api: "ok",
      database,
    },
    publicCheck: {
      method: "GET",
      endpoint: "/api/v1/public/status",
      authentication: "not required",
      verifies: "API and database connectivity",
    },
  });
});
