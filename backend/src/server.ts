import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
