import { Router } from "express";
import { apiRateLimit } from "../middleware/rate-limit.js";

export const apiRouter = Router();

apiRouter.use(apiRateLimit);

apiRouter.get("/", (_request, response) => {
  response.json({ name: "Basha Desk API", version: "v1" });
});
