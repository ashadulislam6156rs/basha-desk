# CLAUDE.md — Basha Desk (বাসা ডেস্ক) · Property & Rental Management SaaS (Bangladesh)

You are the coding agent for **Basha Desk**, a **multi-tenant B2B Property & Rental Management SaaS**. Brand: name "Basha Desk", Brand Teal `#114F4D`, Brand Amber `#E6A34B`, fonts Baloo Da 2 / Hind Siliguri / Inter (see `03_UI_Spec.md §0`; logo in `docs/brand/`). Never hardcode brand colors; use tokens. npm scope `@bashadesk/*`. The team and docs are Bangla-first (technical terms in English). Code, identifiers, commits and PR text are in **English**; user-facing UI strings are Bangla/English via i18n keys.

## 1. MANDATORY: Read before every task

Before executing **any** task (code, test, migration, refactor, bugfix), read these files in full:

1. `docs/01_PRD.md` — what/why, requirement IDs, **Non-Goals**
2. `docs/02_AppFlow.md` — screens, routes, state machines, error/empty states
3. `docs/03_UI_Spec.md` — design tokens, components, i18n/format rules
4. `docs/04_TRD.md` — locked stack, folder structure, security constraints, coding standards
5. `docs/05_Schema.md` — tables, constraints, RLS, auth/money flows
6. `docs/06_Plan.md` — the ordered checklist and progress log

Reference docs (read when the task touches their area; they never override the 6 above): `docs/SRS.md` (full requirements baseline), `docs/SRA.md` (architecture rationale).

If a file is missing or unreadable, **stop and tell the human**. Do not guess.

## 2. Workflow (spec-driven)

1. Open `docs/06_Plan.md`. Pick the **first unchecked task** whose dependencies are done. Do not skip ahead. Do not start a task not in the plan; propose adding it instead.
2. Restate the task, its `Req` IDs and its `Done when` criterion in 2-3 lines.
3. Plan briefly (files to touch, tests to write). For anything touching money, auth, RLS or migrations, show the plan first and wait for approval.
4. Implement in small steps. Write the tests **with** the code, not after.
5. Run: `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm test:tenant-isolation` / `pnpm test:invariants` when relevant). Fix failures; never disable or skip a test to make it pass.
6. Verify the task's `Done when` condition with evidence (test name or command output).
7. **Update `docs/06_Plan.md` after every completed step** (see §3).
8. Commit with Conventional Commits and the requirement ID, e.g. `feat(payments): record payment with allocation (FR-042, FR-043)`.

## 3. Updating `06_Plan.md` (required, every time)

After finishing a task:
- Change `- [ ]` to `- [x]` for that task only if `Done when` is truly met.
- Append one row to **Progress Log**: `date | task ID | what was done | decisions / deviations / blockers`.
- If you discovered new required work, add it as a new task in the correct phase (next free ID) and say so in the log.
- If you were blocked, leave it unchecked, log the blocker, and add a row to **ব্লকার ও খোলা প্রশ্ন**.

Never mark a task done that has failing or missing tests.

## 4. Conflict & ambiguity rules

- Precedence on conflict: `05_Schema.md` (data) > `04_TRD.md` (tech/security) > `01_PRD.md` (scope) > `02_AppFlow.md` > `03_UI_Spec.md` > `06_Plan.md`.
- If docs contradict each other, or a requirement is ambiguous, **ask the human**. Do not silently pick.
- If you must deviate from a doc, **update the doc first** (with the human's approval), then the code. Docs and code must never drift.
- Anything in PRD §11 "Out of Scope" is **forbidden** without written human approval. `[V2]`/`[Future]` items stay behind feature flags and are not built unless the plan says so.

## 5. Non-negotiable invariants

**Naming:** `Tenant` = our SaaS client. `Renter` = occupant paying rent. Never use `tenant` to mean renter, in code, DB, API, logs or comments.

**Tenant isolation**
- Every tenant-scoped table has `tenant_id NOT NULL`, composite FKs `(tenant_id, id)`, `ENABLE` + `FORCE` RLS and the `tenant_isolation` policy.
- `tenant_id` comes from the authenticated session/host resolution, **never** from request body/params/query.
- Each request/job runs inside `UnitOfWork.run(ctx, fn)` which sets `app.tenant_id` transaction-locally (`set_config(..., true)`).
- Host tenant must equal session tenant, otherwise 401 and revoke session.
- Every new table or endpoint ships with a **cross-tenant test**. No exceptions.

**Money**
- DB `NUMERIC(14,2)` + `currency`; code uses decimal (`decimal.js`/integer paisa). **Never JS `number` for money.** JSON money = string decimal.
- Invoices (non-DRAFT), payments, ledger entries, deposit transactions, audit logs are **immutable**. Corrections = void/reversal + new record.
- Payments need an `Idempotency-Key`. Payment ≠ Invoice; link only via `payment_allocations`.
- Two money flows are separate domains: SaaS subscription (`platform_*`) vs rental collection (`invoices/payments`). Never share tables or joins.
- Never build anything that holds or settles renters' rent through the platform account (PRD §1.2).

**Security** (full list: TRD §5)
- Validate every input with Zod on the server. Parameterized SQL only.
- Cookies: `__Host-sid`, HttpOnly, Secure, SameSite=Lax, host-only.
- No secrets in code or logs; mask PII (phone, NID) in logs; NID encrypted at rest.
- Plan limits are enforced in the backend (`EntitlementService`), not just the UI.
- AI features are read-only and permission-checked; **AI never mutates financial data.**

**Idempotency:** background jobs and payment/invoice-generation endpoints must be safe to run twice with the same result.

## 6. Tech stack (locked; details in TRD §1)

TypeScript strict · pnpm + Turborepo · Next.js (App Router) + React + Tailwind + shadcn/ui · NestJS (Fastify) modular monolith · Drizzle ORM + PostgreSQL 17+ (RLS) · Redis + BullMQ · Zod · Vitest + Testcontainers + Playwright.
- **Do not add a dependency or technology not listed in `04_TRD.md`.** If you need one, propose it with reasons and wait for approval; then record it in TRD and an ADR.
- Pin exact versions (no `^`). Check `npm view <pkg> version` before adding.

## 7. Code & UI conventions

- Folder structure and naming exactly as TRD §3. `apps/*` import only from `packages/*`.
- Controllers thin, business logic in services, SQL only in repositories. Modules call each other through public services only.
- Domain errors via `DomainError(code)` → RFC 9457 problem+json. No bare `throw new Error`.
- No `any`. Prefer types derived from Zod schemas in `packages/shared`.
- UI: use design tokens from `03_UI_Spec.md` only (no raw hex/px). All strings via `next-intl` keys in `messages/{bn,en}.json`. Format money/dates with `Intl` (`bn-BD`), Asia/Dhaka. Every list/screen implements loading, empty, error states per AppFlow §1.3. Mobile-first at 360px.
- Status UI = color **and** icon/label.

## 8. Testing rules

- New table → cross-tenant test. Money logic → invariants test (`paid_amount = Σ allocations`, `payment = Σ allocations`, ledger balanced, `paid ≤ total`). API → integration test against real Postgres (Testcontainers). Core flow → Playwright.
- Coverage target for `billing`, `payments`, `ledger`, `access`: ≥ 90%.
- Never use mocks for the database in integration tests.

## 9. Safe-operation rules

- **Ask first** before: destructive migrations, changing RLS or auth, modifying anything in `payments/ledger/invoices`, adding dependencies, changing CI, touching infra or secrets.
- Never run commands against production. Never commit `.env*` (except `.env.example`).
- Never rewrite git history on shared branches. Small PRs, one purpose each.
- Do not print or echo secrets. Do not weaken security headers, RLS or rate limits to get something working.

## 10. Commands (fill in exact scripts at P0-03/P0-04)

```
pnpm install            pnpm dev               pnpm build
pnpm lint               pnpm typecheck         pnpm test
pnpm test:tenant-isolation    pnpm test:invariants    pnpm test:e2e
pnpm db:generate        pnpm db:migrate        pnpm db:seed
docker compose -f infra/docker-compose.yml up -d
```

## 11. Definition of Done (every task)

- [ ] Matches the task's `Done when` and the cited requirement IDs
- [ ] Tests written and passing (including isolation/invariants where applicable)
- [ ] Lint, typecheck, build green
- [ ] No Non-Goal violated; no undocumented dependency
- [ ] Docs updated if behavior or schema changed
- [ ] `docs/06_Plan.md` checkbox + Progress Log updated
