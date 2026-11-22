import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

healthRouter.get("/health/live", (_request, response) => {
  response.json({ status: "alive" });
});
