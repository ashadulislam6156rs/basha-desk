# 06 — Plan (Atomic Implementation Checklist) · Basha Desk

> **এই ফাইল জীবন্ত।** কোডিং এজেন্ট প্রতিটি টাস্ক শেষ হলে `[ ]` → `[x]` করবে এবং নিচের "Progress Log" এ এক লাইন যোগ করবে (তারিখ, টাস্ক ID, কী করা হলো, কোনো সিদ্ধান্ত/বিচ্যুতি)।
> টাস্ক **ক্রমানুসারে** করতে হবে। Dependency অসম্পূর্ণ থাকলে পরের টাস্কে যাওয়া নিষেধ।
> প্রতিটি টাস্ক "Done when" শর্ত পূরণ হলেই সম্পূর্ণ। শর্ত পূরণ ছাড়া `[x]` দেওয়া যাবে না।

**ফরম্যাট:** `- [ ] ID — টাস্ক · (Req: FR/NFR) · Done when: ...`

---

## Phase 0 — প্রকল্প ভিত্তি (Foundation)

- [ ] P0-01 — GitHub repo, `main` ব্রাঞ্চ প্রোটেকশন, PR টেমপ্লেট (Req ID ফিল্ডসহ) · Done when: PR ছাড়া `main` এ push বন্ধ
- [ ] P0-02 — `docs/` ও `CLAUDE.md`, `.cursorrules` কমিট · Done when: ৮টি ফাইল repo তে আছে
- [ ] P0-03 — pnpm workspace + Turborepo স্ক্যাফোল্ড (`apps/web, apps/api, apps/worker, packages/{db,shared,ui,config,testing}`); প্রতিটি ডিপেন্ডেন্সি `npm view` দিয়ে যাচাই করে **exact ভার্সন** লক; `04_TRD.md` এর "Locked patch" কলাম পূরণ · Done when: `pnpm install && pnpm build` সফল
- [ ] P0-04 — TypeScript strict কনফিগ (`tsconfig.base.json`), ESLint flat config, Prettier, Husky + lint-staged, commitlint · Done when: ইচ্ছাকৃত লিন্ট ভুলে commit ব্লক
- [ ] P0-05 — `infra/docker-compose.yml` (postgres 17, redis, minio, mailpit) · Done when: `docker compose up` এ সব healthy
- [ ] P0-06 — `.env.example` ও Zod env validation (`packages/shared/env`) · Done when: কী না থাকলে app boot ব্যর্থ
- [ ] P0-07 — GitHub Actions CI: install, lint, typecheck, unit, build, `pnpm audit --audit-level=high` · Done when: খালি PR এ CI সবুজ
- [ ] P0-08 — ADR ০০০১: hosting runtime বাছাই (Fly/Railway/ECS) ও ADR ০০০২: SMS provider ও ADR ০০০৩: PDF লাইব্রেরি · Done when: `docs/adr/` এ তিনটি ফাইল ও `04_TRD.md` আপডেট
- [ ] P0-09 — `packages/shared`: money utils (decimal), error codes, ID utils (UUIDv7), Result/DomainError · Done when: unit টেস্ট (rounding half-up সহ) পাস
- [ ] P0-10 — `packages/testing`: Testcontainers Postgres helper, tenant factory (`createTenant()`, `createUser()`), DB reset · Done when: নমুনা integration টেস্ট চলে
- [x] P0-11 — API contract foundation: safe ProblemDetails errors ও shared collection `page/pageSize/search/sort/order` helper · Done when: helper আছে, বর্তমান platform roles/users/invites list-এ contract কাজ করে, TRD ও agent rules-এ এটি বাধ্যতামূলক

---

## Phase 1 — Database ও Auth

### 1A. Database
- [ ] P1-01 — `packages/db` Drizzle সেটআপ + `drizzle-kit` কনফিগ + migration runner (`app_migrator` রোলে) · Done when: `pnpm db:migrate` খালি DB তে চলে
- [ ] P1-02 — Migration 0001: extensions (`pgcrypto citext pg_trgm btree_gist`) + DB রোল (`app_migrator app_user app_worker app_platform`) + GRANT · Done when: রোল তালিকা `\du` তে
- [ ] P1-03 — Migration 0002: সব enum (`05_Schema.md §0.2`) · Done when: সব enum তৈরি
- [ ] P1-04 — Migration 0003: control-plane (`plans, plan_entitlements, tenants, tenant_domains, reserved_slugs, slug_reservations, subscriptions, platform_invoices, platform_payments, platform_users, platform_sessions, platform_mfa, support_access_grants, platform_audit_logs, tenant_usage_counters`) · Done when: টেবিল ও constraint স্কিমার সাথে মেলে
- [ ] P1-05 — Migration 0004: identity/access (`users, sessions, otp_challenges, permissions, roles, role_permissions, memberships, membership_property_scopes, invites`) · Done when: composite FK ও partial unique কাজ করে
- [ ] P1-06 — Migration 0005: `portfolios, properties, buildings, floors, spaces` · Done when: টেবিল+ইনডেক্স স্কিমা অনুযায়ী
- [ ] P1-07 — Migration 0006: `renters, renter_documents, agreements, agreement_spaces (EXCLUDE overlap), charge_types, agreement_charges, rent_escalations` · Done when: ওভারল্যাপিং agreement_spaces INSERT ব্যর্থ হয় (টেস্ট)
- [ ] P1-08 — Migration 0007: `invoice_counters, invoices, invoice_lines, payments, payment_allocations, late_fee_rules, utility_meters, meter_readings` · Done when: constraint (paid ≤ total, unique auto-invoice) টেস্টে প্রমাণিত
- [ ] P1-09 — Migration 0008: `deposits, deposit_transactions, ledger_accounts, journals, ledger_entries` + ভারসাম্য constraint trigger · Done when: অসমান journal COMMIT ব্যর্থ
- [ ] P1-10 — Migration 0009: `expense_categories, vendors, expenses, ownership_shares, maintenance_*, notices, notice_recipients` · Done when: স্কিমা মিল
- [ ] P1-11 — Migration 0010–0011: `notification_outbox, in_app_notifications, sms_usage, documents, import_jobs, idempotency_keys, audit_logs, tenant_feature_flags` · Done when: স্কিমা মিল
- [ ] P1-12 — Migration 0012: `app_tenant_id()` + সব tenant টেবিলে `ENABLE+FORCE RLS` + `tenant_isolation` policy · Done when: স্ক্রিপ্ট দিয়ে যাচাই: কোনো tenant টেবিল RLS ছাড়া নয়
- [ ] P1-13 — Migration 0013: immutability triggers (`invoices` ISSUED+, `invoice_lines`, `payments`, `ledger_*`, `audit_logs`, `deposit_transactions`) + GRANT (INSERT/SELECT only) · Done when: UPDATE/DELETE প্রচেষ্টা এরর
- [ ] P1-14 — Migration 0014 + seed: global (`permissions`, `plans`, `plan_entitlements`, `reserved_slugs`) · Done when: seed idempotent (২ বার চালালেও একই)
- [ ] P1-15 — **RLS টেস্ট স্যুট**: প্রতিটি tenant টেবিলে tenant A এর context এ tenant B এর সারি `SELECT/INSERT/UPDATE/DELETE` → ০/ব্যর্থ; context ছাড়া → ০ সারি; `app_user` এ `BYPASSRLS` নেই · Done when: স্বয়ংক্রিয় স্যুট সব টেবিল ঘুরে সবুজ (নতুন টেবিল যোগে স্বয়ংক্রিয় ধরা পড়ে)
- [ ] P1-16 — `DbModule` + `UnitOfWork.run(ctx, fn)` (set_config transaction-local) + `DbRouter` ইন্টারফেস (শুধু SHARED) · Done when: pool লিক টেস্ট (পরপর দুই request, ভিন্ন tenant) পাস

### 1B. Auth ও Access
- [ ] P1-17 — NestJS `apps/api` বুটস্ট্র্যাপ (Fastify, pino, requestId, ProblemDetails filter, config) · Done when: `/health/live`, `/health/ready` কাজ করে
- [ ] P1-18 — Zod pipe (`nestjs-zod`), ProblemDetails এরর ম্যাপিং, i18n এরর কোড · Done when: ভুল ইনপুটে 422 + ফিল্ড map
- [ ] P1-19 — Tenant resolution: `TenantResolver` (host → registry, Redis cache ৬০s, invalidation) + `TenantGuard` (status READY, host tenant = session tenant) · Done when: SUSPENDED/অজানা host এ সঠিক এরর; mismatch এ 401
- [ ] P1-20 — Password hashing (`bcryptjs`, work factor ≥10; প্রাথমিক 12, benchmark-সহ), `Session` সার্ভিস (opaque token, hash সংরক্ষণ, rolling expiry, revoke) · Done when: 72-byte password limit enforce হয়; ভুল/মেয়াদোত্তীর্ণ/revoked token প্রত্যাখ্যাত
- [ ] P1-21 — Staff login/logout/me API + brute-force lock (৫ ব্যর্থ → ১৫মি) + rate limit · Done when: লক ও আনলক টেস্ট পাস
- [ ] P1-22 — Renter OTP: request-otp / verify-otp (Redis TTL, attempts, cooldown, enumeration-safe বার্তা) · Done when: সব সীমা টেস্টে প্রমাণিত
- [ ] P1-23 — CSRF/Origin গার্ড, cookie `__Host-sid` কনফিগ, CORS allow-list · Done when: ভুল Origin এ POST প্রত্যাখ্যাত
- [ ] P1-24 — Tenant RBAC: `PermissionGuard`, `@RequirePermission`, system role seed, Owner-এর tenant-local role create/clone ও module/action permission CRUD, grant-authority check; property scope helper ও repository স্তরে scope filter · Done when: Manager অনুমতিহীন action/property-তে 403/০ সারি; custom role cross-tenant ব্যবহার অসম্ভব
- [ ] P1-25 — Platform auth + Platform RBAC: `platform_users`, TOTP MFA, আলাদা session cookie/guard; Super Admin-এর platform role create/permission select; existing user role change এবং platform invite/accept · Done when: MFA ছাড়া platform API বন্ধ; tenant permission দিয়ে platform access বা উল্টোটা অসম্ভব; শেষ Super Admin সুরক্ষিত
- [ ] P1-26 — Audit সার্ভিস (`AuditService.record`) + `@Audited` ইন্টারসেপ্টর + PII মাস্কিং লগার · Done when: লগইন ও permission পরিবর্তন audit এ আসে; লগে ফোন মাস্কড
- [ ] P1-27 — Entitlement সার্ভিস (`assert`, usage counter transactional) · Done when: লিমিট ছাড়ালে `ERR_PLAN_LIMIT` 403/409
- [ ] P1-28 — **Provisioning**: signup API (slug check, reserved, Turnstile, OTP), `provision-tenant` BullMQ job (idempotent ধাপভিত্তিক), invite · Done when: ব্যর্থ job পুনরায় চালালে আধা-তৈরি workspace নেই (টেস্ট)
- [ ] P1-29 — Invite flow (create/accept/revoke/expire) + tenant user management API: existing member role change; নতুন user invite/accept; role, property scope, deactivate → session revoke · Done when: existing/new user দু’ভাবেই role assignment কাজ করে; privilege escalation ও cross-tenant assignment ব্লক; শেষ Owner নামানো ব্লক
- [ ] P1-30 — Phase 1 গেট: cross-tenant টেস্ট স্যুট CI তে বাধ্যতামূলক জব হিসেবে যুক্ত · Done when: CI তে `test:tenant-isolation` required check

**Phase 1 Exit Criteria:** সব migration চলে; RLS স্যুট সবুজ; auth/MFA/OTP কাজ করে; provisioning idempotent; CI সবুজ।

---

## Phase 2 — Core API

### 2A. Property ও Renter
- [ ] P2-01 — `properties` CRUD (+archive, entitlement, scope, audit) · Done when: integration + cross-tenant টেস্ট
- [ ] P2-02 — `buildings`, `floors` CRUD · Done when: টেস্ট পাস
- [ ] P2-03 — `spaces` CRUD + status ট্রানজিশন (state machine ক্লাস) + সার্চ/ফিল্টার + OCCUPIED আর্কাইভ ব্লক · Done when: অবৈধ ট্রানজিশনে `ERR_INVALID_STATE`
- [ ] P2-04 — `renters` CRUD + NID এনক্রিপশন (AES-256-GCM, key রোটেশন সাপোর্ট) + phone ইউনিক 409 · Done when: DB তে NID প্লেইনটেক্সট নেই (টেস্ট)
- [ ] P2-05 — `documents`: presigned upload/download URL (tenant-prefix, ≤৫মি), MIME/magic-byte যাচাই, সাইজ সীমা · Done when: ভিন্ন tenant এর key এ অনুমতি নেই
- [ ] P2-06 — Excel import (properties/spaces/renters): upload → map → validate → import job; CSV-injection স্যানিটাইজ; সারি-ভিত্তিক error রিপোর্ট; entitlement প্রিভিউ · Done when: ভুল সারিসহ ফাইলে শুধু ভ্যালিড সারি import

### 2B. Agreement
- [ ] P2-07 — `agreements` create/update(draft)/activate/end/cancel (state machine) + `agreement_spaces` ওভারল্যাপ রোধ + concurrency (version/lock) · Done when: দুই সমান্তরাল activate এ একটি 409
- [ ] P2-08 — `agreement_charges` ও `charge_types` API · Done when: টেস্ট পাস
- [ ] P2-09 — Deposit রেকর্ড (activate এ) ও deposit transaction API (append-only) · Done when: balance ঋণাত্মক হয় না
- [ ] P2-10 — Agreement PDF (ড্রাফট টেমপ্লেট; ডিজিটাল সই V2) — **[V2] স্কিপ**, শুধু stub ইন্টারফেস

### 2C. Billing (সবচেয়ে সংবেদনশীল; প্রতিটিতে invariants টেস্ট)
- [ ] P2-11 — Invoice নম্বর counter (gap-free, `FOR UPDATE`) · Done when: ১০০ সমান্তরাল ইস্যুতে ডুপ্লিকেট/গ্যাপ নেই
- [ ] P2-12 — Invoice generator সার্ভিস (agreement+period থেকে lines, proration, rounding half-up) · Done when: unit টেস্ট (মাসের মাঝে শুরু, ফেব্রুয়ারি, লিপ ইয়ার)
- [ ] P2-13 — `generate-monthly-invoices` worker job (idempotent, `UNIQUE(agreement_id, period_start)`, পার-tenant context, ব্যর্থতা আলাদা) · Done when: দুবার চালালে ডুপ্লিকেট ০
- [ ] P2-14 — Invoice API: list/get/manual create/issue/void + immutability · Done when: ISSUED এর lines সম্পাদনা ব্যর্থ
- [ ] P2-15 — `mark-overdue` job · Done when: due পার ও বকেয়া → OVERDUE
- [ ] P2-16 — Payment রেকর্ড API (Idempotency-Key বাধ্যতামূলক, allocation অটো/ম্যানুয়াল, partial, advance→credit, duplicate trx ref সতর্কতা) §05 §13.5 অনুযায়ী · Done when: একই key দুবার → একই response, একটি রেকর্ড
- [ ] P2-17 — Payment VOID (reversal allocation, journal, credit সমন্বয়) · Done when: invariants (ক-ঘ) সবুজ
- [ ] P2-18 — Receipt জেনারেশন (PDF, বাংলা ফন্ট এম্বেড, ক্রমিক নম্বর) · Done when: PDF এ বাংলা সংখ্যা/টেক্সট ঠিক (ভিজুয়াল স্ন্যাপশট)
- [ ] P2-19 — Ledger posting service (invoice issue/payment/void/deposit/expense) + reconciliation কোয়েরি §05 §13.6 + নিশাচর reconciliation job · Done when: **property-based টেস্ট** (র‍্যান্ডম payment/void ক্রম) এ reconciliation ০
- [ ] P2-20 — Arrears/aging কোয়েরি API · Done when: aging বাকেট হাতে-গোনা ডাটার সাথে মেলে

### 2D. অন্যান্য মডিউল
- [ ] P2-21 — `expenses`, `expense_categories` API · Done when: টেস্ট পাস
- [ ] P2-22 — Reports API (collection, outstanding, property-wise আয়-ব্যয়, নিট লাভ) + Excel/PDF export (বড় হলে async job) · Done when: রিপোর্ট মোট = ledger/সরাসরি যোগফল
- [ ] P2-23 — `maintenance` API (state machine, কমেন্ট, ছবি) + scope/renter সীমা · Done when: Renter শুধু নিজের request দেখে
- [ ] P2-24 — `notices` API + audience resolve + outbox · Done when: প্রাপক সঠিক
- [ ] P2-25 — Notification outbox processor: SMS/Email provider ইন্টারফেস + প্রথম বাস্তব provider + retry/backoff + SMS quota + DLR · Done when: কোটা শেষে `SKIPPED_QUOTA`
- [ ] P2-26 — `send-reminders` job (কোটা-সচেতন) · Done when: টেস্ট পাস
- [ ] P2-27 — Platform API: tenants, suspend/reactivate (domain নিষ্ক্রিয়/ক্যাশ invalidate), plans, subscriptions, platform invoices, support grants, ops (failed job retry) · Done when: suspend হলে লগইন ও হোস্ট বন্ধ
- [ ] P2-28 — Renter Portal API (`/portal/*`): me, invoices, payments, receipts, agreement, notices, requests · Done when: অন্য renter এর ID অনুমান করে পড়া যায় না
- [ ] P2-29 — OpenAPI স্পেক জেনারেট ও `packages/shared` এ টাইপ-সেফ client · Done when: web ক্লায়েন্ট টাইপ-চেক পাস
- [ ] P2-30 — Phase 2 গেট: invariants স্যুট + cross-tenant স্যুট + coverage (billing/payments ≥ 90%) CI এ · Done when: গেট সবুজ

**Phase 2 Exit Criteria:** সব API OpenAPI তে; tenant isolation ও আর্থিক invariants CI তে সবুজ।

---

## Phase 3 — UI Integration

### 3A. ভিত্তি
- [ ] P3-01 — `apps/web` Next.js + Tailwind v4 + `packages/ui` টোকেন (`03_UI_Spec.md` অনুযায়ী CSS variables, light/dark) · Done when: টোকেন পেজ (Storybook-সদৃশ `/dev/tokens`) দেখায়
- [ ] P3-01a — **[ডিজাইনার/মানুষ]** লোগোর SVG সেট (পূর্ণ, আইকন-একক, mono-light, favicon/PWA 192/512/maskable) `docs/brand/` ও `apps/web/public/brand/` এ; wordmark ফন্টের আসল নাম নিশ্চিত · Done when: ফাইল কমিট ও `03_UI_Spec §0` আপডেট
- [ ] P3-02 — ফন্ট (`next/font`), `next-intl` (bn/en), টাকা/তারিখ ফরম্যাটার (`bn-BD`), বাংলা সংখ্যা · Done when: ফরম্যাট unit টেস্ট (`১,২৫,০০০.০০`)
- [ ] P3-03 — কোর কম্পোনেন্ট: Button, Input (money/phone/date), Select, Table/DataGrid, Badge/StatusPill, Card/KPI, Modal/Sheet, Toast, Tabs, EmptyState, ErrorState, Skeleton, Wizard, FileUpload · Done when: প্রতিটির সব স্টেট (`03_UI_Spec §6`) রেন্ডার ও a11y চেক
- [ ] P3-04 — `middleware.ts` (host → surface/tenant, status পেজ), সেশন হেল্পার, API client (TanStack Query, error → ProblemDetails ম্যাপ) · Done when: ৪ সারফেস সঠিক রুট হয়
- [ ] P3-05 — Layout: Workspace shell (sidebar, bottom-nav, property switcher, ভাষা/থিম টগল, role-ভিত্তিক মেনু) · Done when: ৩৬০px ও ১২৮০px এ ঠিক

### 3B. Marketing ও Signup
- [ ] P3-06 — Marketing পেজ (হোম, pricing, contact, terms, privacy) · Done when: Lighthouse perf ≥ 90 (মোবাইল)
- [ ] P3-07 — Signup wizard (§AppFlow 2.2) + subdomain availability + provisioning পোলিং · Done when: E2E: signup → READY → workspace লগইন

### 3C. Client Workspace
- [ ] P3-08 — Login, accept-invite, onboarding উইজার্ড · Done when: E2E পাস
- [ ] P3-09 — Dashboard (কার্ড, চেকলিস্ট, empty/error) · Done when: সংখ্যা API এর সাথে মেলে
- [ ] P3-10 — Properties/Buildings/Floors/Spaces স্ক্রিন + ট্রি + Excel import UI · Done when: AppFlow §4.4, §4.12 সব স্টেট
- [ ] P3-11 — Renters স্ক্রিন + ডকুমেন্ট আপলোড (ক্যামেরা, কমপ্রেশন) · Done when: মোবাইলে ছবি আপলোড কাজ করে
- [ ] P3-12 — Agreement উইজার্ড ও ডিটেইল + state বাটন · Done when: AppFlow §4.6 অনুযায়ী
- [ ] P3-13 — Invoices তালিকা/ডিটেইল, void ডায়ালগ · Done when: §4.7
- [ ] P3-14 — Payment রেকর্ড ফর্ম (idempotency key ক্লায়েন্টে তৈরি, retry নিরাপদ), রিসিট পেজ · Done when: ডাবল-ক্লিক/নেটওয়ার্ক retry এ একটি পেমেন্ট
- [ ] P3-15 — Arrears, Deposits, Expenses স্ক্রিন · Done when: §4.9
- [ ] P3-16 — Reports স্ক্রিন + export · Done when: Excel/PDF ডাউনলোড
- [ ] P3-17 — Maintenance বোর্ড, Notices · Done when: §4.10–4.11
- [ ] P3-18 — Settings: profile, workspace (লোগো স্যানিটাইজ), users/invites, tenant role builder (module/action permission matrix)/scope, billing-config, subscription · Done when: §4.13; Owner role create/assign flow সম্পন্ন
- [ ] P3-19 — Audit log স্ক্রিন · Done when: ফিল্টার কাজ করে

### 3D. Renter Portal ও Platform Admin
- [ ] P3-20 — Renter Portal (লগইন OTP, হোম, invoices, payments+ডাউনলোড, notices, requests, profile) · Done when: §5 সব রুট
- [ ] P3-21 — Platform Admin (login+MFA, dashboard, tenants, tenant ডিটেইল, plans, subscriptions, support, platform users/role builder, audit, ops) · Done when: §3 সব রুট; platform RBAC UI tenant RBAC থেকে বিচ্ছিন্ন
- [ ] P3-22 — PWA (manifest, offline read cache, install prompt) · Done when: Lighthouse PWA চেক পাস
- [ ] P3-23 — a11y ও i18n অডিট (সব স্ট্রিং কী থেকে, `03_UI_Spec §7`) · Done when: axe কোনো সিরিয়াস ইস্যু নেই; hardcoded স্ট্রিং লিন্ট ০

**Phase 3 Exit Criteria:** সব MVP user story (US-001…014) UI থেকে সম্পাদনযোগ্য।

---

## Phase 4 — Edge-case টেস্ট ও হার্ডনিং

### 4A. নিরাপত্তা ও আইসোলেশন
- [ ] P4-01 — Playwright cross-tenant E2E: tenant A সেশনে tenant B এর URL/ID অনুমান (IDOR) · Done when: সব ক্ষেত্রে 403/404
- [ ] P4-02 — Host/session mismatch, suspended tenant, reserved slug, subdomain takeover পুনঃব্যবহার টেস্ট · Done when: প্রত্যাশিত ব্লক
- [ ] P4-03 — Entitlement bypass টেস্ট (UI লুকানো বাইপাস করে সরাসরি API) · Done when: ব্যাকএন্ড ব্লক করে
- [ ] P4-04 — Rate limit/brute-force/OTP abuse টেস্ট · Done when: সীমা কার্যকর
- [ ] P4-05 — XSS/CSV-injection/ফাইল-টাইপ ছদ্মবেশ টেস্ট · Done when: সব নিষ্ক্রিয়
- [ ] P4-06 — Security headers/CSP চেক, `pnpm audit`, Trivy, secret scan (gitleaks) CI · Done when: ব্লকিং চেক সবুজ
- [ ] P4-07 — STRIDE threat model সম্পূর্ণ ও `docs/adr/` এ · Done when: ঝুঁকি-তালিকা ও প্রতিকার লেখা

### 4B. আর্থিক এজ-কেস
- [ ] P4-08 — Concurrency: একই invoice এ দুই পেমেন্ট সমান্তরাল; একই idempotency key সমান্তরাল · Done when: invariants অক্ষুণ্ণ
- [ ] P4-09 — Overpayment → credit; credit পরের invoice এ অটো প্রয়োগ · Done when: balance সঠিক
- [ ] P4-10 — Void-after-allocation, void-ed invoice এ পেমেন্ট চেষ্টা, partial void · Done when: সঠিক এরর/reversal
- [ ] P4-11 — Proration/তারিখ প্রান্ত: মাসের শেষ দিন, billing_day=28, Asia/Dhaka মধ্যরাত, DST-নিরপেক্ষতা · Done when: unit টেস্ট
- [ ] P4-12 — Agreement lifecycle: end এ অপরিশোধিত invoice, deposit adjust > balance, rent পরিবর্তনের "সংশোধন" · Done when: নিয়ম অনুযায়ী
- [ ] P4-13 — Property-based টেস্ট: র‍্যান্ডম অপারেশন ক্রমে reconciliation সর্বদা ০ · Done when: ১০,০০০ রান সবুজ
- [ ] P4-14 — Job টেস্ট: কর্মীর মাঝপথে ক্র্যাশ, retry, DLQ · Done when: ডুপ্লিকেট নেই

### 4C. UX ও অপারেশন
- [ ] P4-15 — Empty/error/offline/slow-network স্টেট (3G throttle) E2E · Done when: AppFlow §1.3 সব স্টেট
- [ ] P4-16 — Playwright E2E: সব MVP user story (US-001…014) · Done when: CI তে সবুজ
- [ ] P4-17 — Load টেস্ট (k6): ১০০ tenant × সিমুলেটেড লোড; মাসিক invoice job ১০,০০০ agreement · Done when: p95 টার্গেট পূরণ বা সীমা নথিবদ্ধ
- [ ] P4-18 — Backup/restore drill ও রানবুক `docs/runbooks/` · Done when: PITR থেকে সফল restore নথিবদ্ধ
- [ ] P4-19 — Observability: Sentry, মেট্রিক, alert, dashboard · Done when: ইচ্ছাকৃত ব্যর্থতায় alert আসে

**Phase 4 Exit Criteria:** NFR-001, NFR-002, NFR-012 স্বয়ংক্রিয় টেস্টে প্রমাণিত; কোনো open Sev1/Sev2 নেই।

---

## Phase 5 — Pilot প্রস্তুতি (মানুষের সিদ্ধান্ত ও এজেন্ট টাস্ক মিশ্র)

- [ ] P5-01 — **[মানুষ]** ৫-১০ জন বাড়িওয়ালার সাথে customer discovery সম্পন্ন ও ফলাফল `docs/research/` এ
- [ ] P5-02 — **[মানুষ]** আইনজীবীর পর্যালোচনা: payment নিয়ন্ত্রক, ডাটা প্রটেকশন, e-agreement, NID সংরক্ষণ
- [ ] P5-03 — **[মানুষ]** SMS sender ID/masking অনুমোদন; domain কেনা; Cloudflare সেটআপ
- [ ] P5-04 — Production ইনফ্রা (Terraform বা ম্যানুয়াল রানবুক), wildcard DNS+SSL, secret manager · Done when: staging = production কাঠামো
- [ ] P5-05 — Staging এ anonymized ডাটা + smoke টেস্ট স্যুট · Done when: প্রতি deploy তে সবুজ
- [ ] P5-06 — Pilot ৩-৫ ক্লায়েন্ট onboarding, ফিডব্যাক লুপ, মেট্রিক বেসলাইন (activation, support) · Done when: ২ সপ্তাহ চলার পর রিপোর্ট
- [ ] P5-07 — পাইলট ফিডব্যাক অনুযায়ী `01_PRD.md` এর V2 তালিকা পুনঃঅগ্রাধিকার · Done when: PRD আপডেট

---

## V2 / Future ব্যাকলগ (MVP এর পরে; ফিচার ফ্ল্যাগের পেছনে)

| ID | আইটেম | Req |
|---|---|---|
| V2-01 | অনলাইন পেমেন্ট গেটওয়ে (bKash/Nagad/SSLCommerz), signed webhook, reconciliation | FR-106 |
| V2-02 | Custom domain (Cloudflare for SaaS) | FR-005 |
| V2-03 | Late fee অটো | FR-047 |
| V2-04 | ইউটিলিটি মিটার রিডিং বিল | FR-049 |
| V2-05 | বার্ষিক ভাড়া বৃদ্ধি | FR-034 |
| V2-06 | Agreement PDF ও ডিজিটাল সই | FR-036 |
| V2-07 | Move-in/out চেকলিস্ট | FR-035 |
| V2-08 | Vendor ম্যানেজমেন্ট | FR-072 |
| V2-09 | Co-owner রিপোর্ট ও মুনাফা ভাগ | FR-062 |
| V2-10 | থানা ফরম্যাট প্রিন্ট | FR-037 |
| V2-11 | Accounting export/ট্যাক্স রিপোর্ট | FR-063 |
| V2-12 | AI FAQ + escalation (read-only) | FR-100 |
| V2-13 | প্যাকেজ বদল (upgrade/downgrade) | FR-093 |
| F-01 | Dedicated DB migration tooling | FR-007 |
| F-02 | AI read-only business query | FR-101 |
| F-03 | WhatsApp নোটিফিকেশন | FR-083 |
| F-04 | Marketplace/listing | FR-103 |
| F-05 | Native mobile app | — |

---

## Progress Log (এজেন্ট এখানে যোগ করবে)

| তারিখ | টাস্ক ID | কী করা হলো | সিদ্ধান্ত / বিচ্যুতি / ব্লকার |
|---|---|---|---|
| 2026-11-24 | P0-11 | Shared API list-query helper ও ProblemDetails conventions; platform list endpoint-এ search/sort/pagination | Page-based default; বড় তালিকায় cursor pagination অতিরিক্তভাবে করা যাবে |

## ব্লকার ও খোলা প্রশ্ন (মানুষের উত্তর দরকার)

| # | প্রশ্ন | কে সমাধান করবে | স্ট্যাটাস |
|---|---|---|---|
| Q-01 | SMS provider কোনটি? | Product/Eng | খোলা |
| Q-02 | Hosting runtime কোনটি? | Eng | খোলা |
| Q-03 | NID সংরক্ষণ আইনসম্মত কি, না কেবল শেষ ৪ সংখ্যা? | আইনজীবী | খোলা |
| Q-04 | প্যাকেজ মূল্য | Product | খোলা |
| Q-05 | ডাটা রেসিডেন্সি (দেশের বাইরে হোস্টিং চলবে?) | আইনজীবী | খোলা |
