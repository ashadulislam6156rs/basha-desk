import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const migrationUrl = env("DATABASE_MIGRATE_URL");
const prismaArgs = process.argv.slice(2);
const isDatabaseWriteCommand =
  (prismaArgs[0] === "migrate" && ["dev", "deploy", "reset"].includes(prismaArgs[1] ?? "")) ||
  (prismaArgs[0] === "db" && ["push", "execute", "seed"].includes(prismaArgs[1] ?? ""));

if (isDatabaseWriteCommand) {
  const target = process.env.DATABASE_TARGET;
  const productionWriteIsExplicit =
    target === "production" && process.env.ALLOW_PRODUCTION_MIGRATIONS === "YES";
  if (target !== "development" && !productionWriteIsExplicit) {
    throw new Error(
      "Database write blocked: set DATABASE_TARGET=development, or explicitly enable production with DATABASE_TARGET=production and ALLOW_PRODUCTION_MIGRATIONS=YES.",
    );
  }
  if (new URL(migrationUrl).hostname.includes("-pooler")) {
    throw new Error("Database writes blocked: DATABASE_MIGRATE_URL must use the direct (non-pooler) endpoint.");
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI uses the direct migration connection, never the app pooler URL.
    url: migrationUrl,
  },
});
