import type { RequestHandler } from "express";
import { AppError } from "../common/app-error.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export type TenantContext = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  defaultLocale: string;
  resolvedHost: string;
};

export const resolveTenantContext: RequestHandler = async (request, response, next) => {
  try {
    const devSlug = env.NODE_ENV === "development"
      ? request.get("x-tenant-slug")?.trim().toLowerCase()
      : undefined;

    const tenant = devSlug
      ? await prisma.tenant.findFirst({
          where: { slug: devSlug },
          select: { id: true, slug: true, name: true, timezone: true, currency: true, defaultLocale: true, status: true },
        })
      : await prisma.tenantDomain.findFirst({
          where: {
            hostname: request.hostname.toLowerCase(),
            isActive: true,
            OR: [
              { type: "SUBDOMAIN" },
              { type: "CUSTOM", verificationStatus: "VERIFIED", sslStatus: "ACTIVE" },
            ],
            tenant: { status: "READY" },
          },
          select: {
            hostname: true,
            tenant: { select: { id: true, slug: true, name: true, timezone: true, currency: true, defaultLocale: true, status: true } },
          },
        }).then((domain) => domain ? { ...domain.tenant, resolvedHost: domain.hostname } : null);

    if (!tenant) {
      throw new AppError(404, "ERR_TENANT_NOT_FOUND", "Tenant Not Found", "No active workspace is configured for this host.");
    }
    if (tenant.status !== "READY") {
      throw new AppError(403, "ERR_TENANT_UNAVAILABLE", "Workspace Unavailable", "This workspace is not available for sign-in.");
    }
    const resolvedHost = devSlug
      ? request.hostname.toLowerCase()
      : (tenant as typeof tenant & { resolvedHost?: string }).resolvedHost ?? request.hostname.toLowerCase();

    response.locals.tenantContext = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      timezone: tenant.timezone,
      currency: tenant.currency,
      defaultLocale: tenant.defaultLocale,
      resolvedHost,
    } satisfies TenantContext;
    next();
  } catch (error) {
    next(error);
  }
};
