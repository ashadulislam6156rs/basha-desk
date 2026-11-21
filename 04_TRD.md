# 04 — TRD (Technical Requirements Document / System Reference Architecture) · Basha Desk

> এই ফাইলই সিস্টেমের আর্কিটেকচারের **single source of truth**। Stack, ফোল্ডার, নিয়ম ও নিরাপত্তা এখানে locked।
> কোনো টেকনোলজি/লাইব্রেরি এই ফাইলে নেই মানে ব্যবহার নিষেধ, যতক্ষণ না মানুষ এই ফাইলে যোগ করে।

---

> **ব্র্যান্ড:** প্রোডাক্ট নাম **Basha Desk**; primary ডোমেইন `bashadesk.com` (কেনা বাকি, টাস্ক `P5-03`; ডোমেইন ভিন্ন হলে এই ফাইলে ও সব ডকে একসাথে বদলান)। npm scope: `@bashadesk/*` (`@bashadesk/web`, `@bashadesk/api`, `@bashadesk/db`, `@bashadesk/shared`, `@bashadesk/ui`)। ইমেইল প্রেরক: `Basha Desk <noreply@bashadesk.com>`; SMS sender ID প্রস্তাব: `BashaDesk` (অনুমোদন সাপেক্ষে)। ফন্ট: Baloo Da 2 (display), Hind Siliguri, Inter।

## 0. ভার্সন নীতি (গুরুত্বপূর্ণ)

নিচের টেবিলে **major ভার্সন locked**। এই ডকুমেন্ট লেখার সময় (অক্টোবর ২০২৬) যেসব major release স্থিতিশীল ধরা হয়েছে সেগুলো বসানো। exact patch ভার্সন **Phase 0, টাস্ক P0-03 এ** `pnpm install` চালিয়ে `pnpm-lock.yaml` এ লক হবে, এবং `package.json` এ `^` ছাড়া exact ভার্সন (`"next": "16.x.y"`) বসবে। তারপর এই ফাইলের "Locked patch" কলাম আপডেট করতে হবে।
**প্রজেক্ট শুরুর দিন প্রতিটির ভার্সন `npm view <pkg> version` দিয়ে একবার যাচাই করুন।** কোনো major এখানকার চেয়ে আলাদা হলে এখানে লিখে মানুষের অনুমোদন নিন, তারপর এগোন।

---

## 1. Locked Tech Stack

### 1.1 Runtime ও টুলিং

| বিষয় | পছন্দ | Locked major | Locked patch |
|---|---|---|---|
| Runtime | Node.js LTS | **24.x** | P0-03 এ পূরণ |
| Package manager | pnpm | **10.x** | " |
| Monorepo | Turborepo | **2.x** | " |
| ভাষা | TypeScript (`strict: true`) | **5.9+ (5.x)** | " |
| Lint/Format | ESLint (flat config) + Prettier | ESLint **9.x**, Prettier **3.x** | " |
| Git hooks | Husky + lint-staged | latest stable | " |
| Commit | Conventional Commits | — | — |

### 1.2 Frontend (`apps/web`)

| বিষয় | পছন্দ | Locked major |
|---|---|---|
| Framework | Next.js (App Router) | **16.x** |
| UI lib | React | **19.x** |
| Styling | Tailwind CSS | **4.x** |
| Component base | shadcn/ui + Radix UI | latest (কোড কপি করা) |
| Icons | lucide-react | latest stable |
| Forms | react-hook-form + zod resolver | RHF **7.x** |
| Validation | Zod | **4.x** |
| Server state | TanStack Query | **5.x** |
| Client state | Zustand (শুধু UI স্টেটে) | **5.x** |
| i18n | next-intl | **4.x** |
| Theme | next-themes | **0.4.x** |
| Tables | TanStack Table | **8.x** |
| Charts | Recharts | **3.x** |
| Dates | date-fns + date-fns-tz | **4.x** |
| PWA | Serwist (service worker) | latest stable |

### 1.3 Backend (`apps/api`, `apps/worker`)

| বিষয় | পছন্দ | Locked major |
|---|---|---|
| Framework | **NestJS (Modular Monolith)** | **11.x** |
| HTTP adapter | Fastify | **5.x** |
| ORM/Query | **Drizzle ORM** + `drizzle-kit` (migration) | latest stable (**0.4x**; P0-03 এ লক) |
| DB driver | `pg` (node-postgres) | **8.x** |
| Validation | Zod (`nestjs-zod`) — shared schema `packages/shared` | Zod **4.x** |
| Auth | নিজস্ব: `argon2` পাসওয়ার্ড হ্যাশ + opaque session token (DB-backed) | argon2 **0.4x** |
| MFA (platform) | `otplib` (TOTP) | latest |
| Queue | BullMQ | **5.x** |
| Cache/Queue broker | Redis | **7.x/8.x** |
| PDF | `@react-pdf/renderer` বা Playwright PDF (Bengali ফন্ট এম্বেডসহ) | P0-03 এ চূড়ান্ত |
| Excel | `exceljs` | **4.x** |
| File storage | S3-compatible (Cloudflare R2 বা AWS S3), SDK `@aws-sdk/client-s3` | v3 |
| Logging | `pino` (structured JSON) | **9.x/10.x** |
| API docs | OpenAPI via `@nestjs/swagger` | 11.x |
| Scheduler | BullMQ repeatable jobs | — |
| Error tracking | Sentry | latest |
| Metrics/Tracing | OpenTelemetry | latest |

> **ORM সিদ্ধান্ত কেন Drizzle?** RLS এর জন্য প্রতিটি transaction এ `SET LOCAL app.tenant_id` দিতে হয়। Drizzle এ transaction ও raw SQL নিয়ন্ত্রণ সহজ, ও SQL-কাছাকাছি schema টাইপ-সেফ থাকে।

### 1.4 ডাটাবেস ও ইনফ্রা

| বিষয় | পছন্দ |
|---|---|
| Primary DB | **PostgreSQL 17+** (Managed; PITR সহ) |
| Extensions | `pgcrypto`, `citext`, `pg_trgm`, `btree_gist` |
| Cache/Queue | Redis (Managed) |
| Object storage | S3-compatible |
| DNS/CDN/WAF/SSL | **Cloudflare** (wildcard SSL, WAF, rate limit) |
| Custom domain [V2] | Cloudflare for SaaS (Custom Hostnames) |
| Container | Docker (multi-stage), রানটাইম: Fly.io / Railway / AWS ECS (P0 এ একটি বেছে এখানে লিখুন) |
| Region | সিঙ্গাপুর বা মুম্বাই (latency); ডাটা রেসিডেন্সি আইনি যাচাই বাকি |
| CI/CD | GitHub Actions |
| IaC | Terraform (Phase 5; MVP তে ম্যানুয়াল + রানবুক) |

### 1.5 Testing

| স্তর | টুল |
|---|---|
| Unit | Vitest |
| API integration | Vitest + Supertest, **Testcontainers (real Postgres)** |
| E2E | Playwright |
| Component | Testing Library |
| Load (Phase 5) | k6 |
| Security | ESLint security rules, `pnpm audit`, Dependabot, Trivy (image) |

---

## 2. আর্কিটেকচার ওভারভিউ

```
                     Cloudflare (DNS *.bashadesk.com, CDN, WAF, wildcard SSL)
                                        │
                              Load Balancer / Platform
                                        │
         ┌──────────────────────────────┼───────────────────────────────┐
         ▼                              ▼                               ▼
   apps/web (Next.js)           apps/api (NestJS)               apps/worker (NestJS+BullMQ)
   SSR + middleware             REST /api/v1                    invoice, SMS, import, report,
   host → tenant resolve        auth, RBAC, RLS ctx             provisioning, reminders
         │                              │                               │
         └──────────────► (server-to-server API call) ◄─────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────┐
              ▼                         ▼                      ▼
        PostgreSQL (shared pool,   Redis (BullMQ,         Object Storage (R2/S3)
        RLS) + dedicated DBs       rate limit, OTP TTL)
        ▲
        └── Tenant Registry (control-plane tables)
                                        │
                        SMS gateway · Email · (V2) Payment gateway
```

### 2.1 Modular Monolith: API মডিউল

প্রতিটি মডিউল নিজের `controller / service / repository / dto` রাখে; অন্য মডিউলের repository সরাসরি ডাকা **নিষেধ**, শুধু public service ইন্টারফেস।

| মডিউল | দায়িত্ব |
|---|---|
| `platform-tenants` | registry, domains, provisioning, suspend |
| `platform-billing` | plans, entitlements, subscriptions, platform invoices (**প্রবাহ ১**) |
| `identity` | users, sessions, OTP, MFA, invites |
| `access` | roles, permissions, memberships, property scopes |
| `properties` | property, building, floor, space |
| `renters` | renter profile, documents |
| `agreements` | agreement, charges, lifecycle |
| `billing` | invoices, lines, scheduler logic (**প্রবাহ ২**) |
| `payments` | payment records, allocation, voids, credit |
| `deposits` | deposit ledger |
| `ledger` | append-only ledger entries, reconciliation |
| `expenses` | expense, vendor, category |
| `reports` | queries, export |
| `maintenance` | requests, comments |
| `notices` | notices, recipients |
| `notifications` | outbox, channels, SMS quota, provider abstraction |
| `documents` | file metadata, presigned URL |
| `imports` | Excel import jobs |
| `audit` | audit log writer/reader |
| `ai` | **[V2]** FAQ, ticket escalation (read-only) |
| `common` | guards, interceptors, pipes, tenant-context, errors |

**নিষিদ্ধ নির্ভরতা:** `platform-billing` (প্রবাহ ১) ↔ `billing/payments` (প্রবাহ ২) এর মধ্যে কোনো টেবিল শেয়ার/JOIN নেই।

### 2.2 Multi-tenancy কৌশল (hybrid)

1. **ডিফল্ট: shared pool।** সব tenant-scoped টেবিলে `tenant_id UUID NOT NULL` + **PostgreSQL RLS**।
2. **প্রিমিয়াম [Future]:** dedicated DB; `tenants.db_mode` ও `db_connection_ref` দিয়ে routing। কোড ঠিক সেই `DbRouter` ইন্টারফেস দিয়েই কাজ করবে, MVP তে শুধু `shared` বাস্তবায়িত।
3. প্রতিটি request এর DB transaction এর শুরুতে:
   ```sql
   SELECT set_config('app.tenant_id', $1, true);   -- transaction-local
   SELECT set_config('app.user_id',   $2, true);
   SELECT set_config('app.role',      $3, true);
   ```
4. অ্যাপ DB রোল (`app_user`) **সুপারইউজার নয়, `BYPASSRLS` নেই**; সব tenant টেবিলে `FORCE ROW LEVEL SECURITY`।
5. Migration রোল (`app_migrator`) আলাদা; worker এর জন্য `app_worker` (প্রতি job এ tenant context সেট করে)।
6. Control-plane টেবিল (tenants, plans, platform_users) RLS ছাড়া কিন্তু আলাদা রোল দিয়ে নিয়ন্ত্রিত।

### 2.3 Request lifecycle (API)

```
HTTP → Fastify
 → RequestId + logging
 → RateLimit (IP + tenant)
 → AuthGuard (session cookie/bearer → user, tenant_id, role)
 → TenantGuard (session.tenant_id == resolved host tenant_id, status READY)
 → PermissionGuard (@RequirePermission('invoice.create'), property scope)
 → ZodValidationPipe
 → Controller → Service
     └─ UnitOfWork.run(tenantCtx, async tx => { SET LOCAL ...; repo ops; audit; outbox })
 → Response (envelope) / ProblemDetails error
```

### 2.4 API নিয়ম

- Base: `/api/v1`। REST + JSON। RFC 9457 `application/problem+json` এরর।
- Success envelope: `{ "data": ..., "meta": { "nextCursor": "..." } }`।
- Error shape: `{ "type": "ERR_INVOICE_ALREADY_VOID", "title": "...", "status": 409, "detail": "...", "errors": {field: [...]}, "requestId": "..." }`।
- Pagination: cursor-ভিত্তিক (`?limit=20&cursor=...`)।
- **Idempotency:** `POST /payments`, `POST /invoices/generate`, `POST /payments/:id/void` এ `Idempotency-Key` হেডার বাধ্যতামূলক; `idempotency_keys` টেবিলে (tenant, key, request hash, response) 24h রাখা।
- সময় ISO 8601 UTC; টাকা JSON এ **string decimal** (`"12500.00"`), কখনো float নয়।
- ID: UUID v7।
- Versioning: ব্রেকিং বদলে `/v2`।

### 2.5 টাকার নিয়ম (কঠোর)

1. DB: `NUMERIC(14,2)`; কোডে `decimal.js` বা integer paisa; **JS `number` দিয়ে টাকার গণনা নিষেধ।**
2. প্রতিটি টাকার কলামের পাশে `currency CHAR(3) DEFAULT 'BDT'` (invoice/payment স্তরে)।
3. Rounding: half-up, ২ দশমিক, শুধু invoice line স্তরে; মোট = lines এর যোগফল।
4. ISSUED+ invoice ও সব payment **immutable**; DB trigger দিয়ে UPDATE/DELETE প্রতিরোধ (status ও allocation ছাড়া)।
5. সংশোধন = reversal/void entry + নতুন রেকর্ড।
6. `ledger_entries` append-only (double-entry: প্রতিটি `journal` এর debit যোগফল = credit যোগফল, DB constraint trigger)।
7. **Invariants (টেস্ট বাধ্যতামূলক):** (ক) `invoice.paid_amount = Σ allocations`, (খ) `payment.amount = Σ allocations + unallocated credit`, (গ) ledger ভারসাম্য, (ঘ) কোনো invoice এর `paid_amount > total` নয়।

### 2.6 Background jobs (worker)

- সব job **idempotent** ও re-runnable; job payload এ `tenantId` বাধ্যতামূলক।
- ব্যর্থতা: exponential backoff (৫ বার), তারপর dead-letter queue + Platform `/ops` এ দৃশ্যমান।
- `generate-monthly-invoices` ইউনিকনেস: `UNIQUE (agreement_id, period_start)`।
- Outbox pattern: ঘটনা + `notification_outbox` একই transaction এ।

### 2.7 Subdomain ও hostname ম্যানেজমেন্ট

- DNS: `*.bashadesk.com → Cloudflare → LB`। একবারের সেটআপ; ক্লায়েন্ট আনলে DNS বদলায় না।
- Next.js `middleware.ts` Host থেকে slug বের করে; `tenant_domains` লুকআপ (Redis cache ৬০s, suspend এ invalidate)।
- Reserved slug তালিকা: `www app api admin mail smtp support billing status docs blog help dashboard portal static cdn assets auth login signup staging dev test demo`।
- Cookie: **host-only** (`Domain` অ্যাট্রিবিউট নেই), `HttpOnly; Secure; SameSite=Lax; Path=/`; নাম `__Host-sid`।
- Tenant সাসপেন্ড/মুছলে hostname নিষ্ক্রিয়, slug ৯০ দিন রিজার্ভ (takeover রোধ)।
- Custom domain [V2]: CNAME → `cname.bashadesk.com` + TXT `_bashadesk-verify`; verification worker; Cloudflare Custom Hostnames API; ssl_status ট্র্যাক।
- ইমেইল প্রেরক: `noreply@bashadesk.com`; tenant নিজের ডোমেইন থেকে ইমেইল [Future] (SPF/DKIM)।

### 2.8 Authentication ও Authorization ডিজাইন

**Session:** opaque 256-bit random token, DB এ SHA-256 হ্যাশ সংরক্ষিত; ইনঅ্যাক্টিভ ৩০ মিনিট (staff) / ৩০ দিন rolling (renter portal), অ্যাবসোলিউট ৩০ দিন; লগআউটে সার্ভারে বাতিল।
**Password:** argon2id (memory 64MB, t=3, p=1), ন্যূনতম ১০ অক্ষর, breached-password চেক (HIBP k-anonymity [V2])।
**Brute-force:** অ্যাকাউন্ট + IP উভয় ভিত্তিতে রেট লিমিট; ৫ ব্যর্থ → ১৫ মিনিট লক।
**OTP:** ৬ সংখ্যা, TTL ৫ মিনিট, Redis এ হ্যাশ, ৫ চেষ্টা, রিসেন্ড cooldown ৬০s।
**CSRF:** SameSite=Lax + কাস্টম হেডার (`X-Requested-With`) + Origin চেক; state-changing শুধু POST/PUT/PATCH/DELETE।
**RBAC:** `permissions` (যেমন `invoice.create`, `payment.record`, `payment.void`), `roles`, `role_permissions`; `memberships` (user, tenant, role) + `membership_property_scopes`। System role (Owner, Manager, Accountant, Caretaker, Renter) seed হবে; কাস্টম role [V2]।
**Property scope:** Manager/Caretaker এর কোয়েরিতে `property_id IN (scoped)` ফিল্টার repository স্তরে বাধ্যতামূলক (শুধু controller এ নয়)।
**Platform:** আলাদা `platform_users` টেবিল, আলাদা session কুকি/হোস্ট, MFA বাধ্যতামূলক।
**Support access:** `support_access_grants` (scope, expires_at, granted_by); middleware প্রতি request এ যাচাই; ডিফল্টে ফাইন্যান্সিয়াল টেবিল ব্লক।

### 2.9 Plan entitlement enforcement

`EntitlementService.assert('max_spaces', tenantId)` সব create ফ্লোতে ব্যাকএন্ডে ডাকা হবে (property, space, user, SMS)। ব্যবহার গণনা `tenant_usage_counters` এ transactionally আপডেট। UI শুধু প্রতিফলন।

---

## 3. Monorepo ফোল্ডার কাঠামো

```
/
├─ CLAUDE.md
├─ .cursorrules
├─ docs/
│   ├─ 01_PRD.md  02_AppFlow.md  03_UI_Spec.md
│   ├─ 04_TRD.md  05_Schema.md   06_Plan.md
│   └─ adr/                         # Architecture Decision Records (0001-...md)
├─ apps/
│   ├─ web/                         # Next.js
│   │   ├─ src/
│   │   │   ├─ app/
│   │   │   │   ├─ (marketing)/
│   │   │   │   ├─ (platform)/
│   │   │   │   ├─ (workspace)/
│   │   │   │   ├─ (portal)/
│   │   │   │   └─ api/ (শুধু health, auth callback)
│   │   │   ├─ middleware.ts        # host → surface + tenant
│   │   │   ├─ features/<module>/{components,hooks,api,schemas}
│   │   │   ├─ lib/ (api-client, auth, format, i18n)
│   │   │   └─ messages/{bn,en}.json
│   │   └─ public/
│   ├─ api/                         # NestJS
│   │   ├─ src/
│   │   │   ├─ main.ts, app.module.ts
│   │   │   ├─ modules/<module>/{*.controller.ts,*.service.ts,*.repository.ts,dto/,*.spec.ts}
│   │   │   └─ common/{guards,interceptors,filters,tenant-context,db,errors}
│   │   └─ test/ (integration, cross-tenant, invariants)
│   └─ worker/                      # NestJS standalone + BullMQ processors
│       └─ src/processors/
├─ packages/
│   ├─ db/                          # Drizzle schema, migrations, RLS SQL, seeds
│   │   ├─ src/schema/*.ts
│   │   ├─ migrations/*.sql
│   │   └─ seed/
│   ├─ shared/                      # Zod schemas, types, enums, error codes, money utils
│   ├─ ui/                          # shadcn-based components, tokens
│   ├─ config/                      # eslint, tsconfig, tailwind presets
│   └─ testing/                     # factories, tenant fixtures, test DB helpers
├─ infra/                           # docker, compose, terraform (later)
├─ .github/workflows/
├─ turbo.json  pnpm-workspace.yaml  package.json  tsconfig.base.json
└─ .env.example
```

**নামকরণ:** ফাইল `kebab-case`; কম্পোনেন্ট `PascalCase`; DB `snake_case` (plural টেবিল); enum মান `UPPER_SNAKE`; env `UPPER_SNAKE`।
**ইমপোর্ট নিয়ম:** `apps/*` শুধু `packages/*` কে ইমপোর্ট করবে, অন্য app কে নয়। `packages/shared` এ কোনো Node/React নির্ভরতা নেই।

---

## 4. Third-party APIs ও ইন্টিগ্রেশন

| সেবা | উদ্দেশ্য | পর্যায় | নোট |
|---|---|---|---|
| **SMS Gateway** (BD: যেমন SSL Wireless / BulkSMSBD / Infobip; **P0 এ একটি বাছাই, ADR লিখুন**) | OTP, রিমাইন্ডার, নোটিশ | MVP | `SmsProvider` ইন্টারফেস পেছনে; masking/sender-ID অনুমোদন BTRC নিয়ম অনুযায়ী যাচাই |
| Email (Resend / AWS SES / Postmark) | ইনভাইট, রিসিট | MVP | `EmailProvider` ইন্টারফেস |
| Cloudflare (DNS, WAF, R2) | edge ও স্টোরেজ | MVP | API token সর্বনিম্ন scope |
| Cloudflare for SaaS | custom domain | V2 | |
| bKash / Nagad / Rocket / SSLCommerz | অনলাইন পেমেন্ট | V2 | `PaymentGateway` ইন্টারফেস; **Tenant এর নিজস্ব merchant credential**; signed webhook যাচাই; আমাদের অ্যাকাউন্টে ভাড়ার টাকা নয় |
| Sentry | error tracking | MVP | PII স্ক্রাব |
| LLM API (Anthropic) | AI সাপোর্ট | V2 | শুধু `AiGateway` মডিউলের মাধ্যমে; read-only টুল; PII মাস্ক |
| WhatsApp Business API | নোটিফিকেশন | Future | |

প্রতিটি provider ইন্টিগ্রেশনে: timeout, retry (idempotent হলে), circuit breaker, ও কোনো secret লগে নয়।

---

## 5. Security Constraints (বাধ্যতামূলক)

### 5.1 Tenant isolation
- S-01: সব tenant টেবিলে `tenant_id NOT NULL` + RLS `FORCE`। রিপোজিটরি **কখনো** `tenant_id` ক্লায়েন্ট ইনপুট থেকে নেয় না; session থেকে।
- S-02: `app_user` এর `BYPASSRLS` ও সুপারইউজার নেই; CI তে যাচাই টেস্ট।
- S-03: প্রতিটি নতুন টেবিলের জন্য **cross-tenant টেস্ট বাধ্যতামূলক** (tenant A এর টোকেনে tenant B এর ডাটা read/write চেষ্টা → ০ সারি/403)।
- S-04: Host-এর tenant ≠ session এর tenant → ৪০১, সেশন বাতিল।
- S-05: ফাইল স্টোরেজ কী `tenants/{tenant_id}/...`; presigned URL ছোট মেয়াদ (≤ ৫ মিনিট) ও ডাউনলোডের আগে permission যাচাই।

### 5.2 ইনপুট ও আউটপুট
- S-10: সব ইনপুট Zod দিয়ে সার্ভারে যাচাই। ক্লায়েন্ট validation শুধু UX।
- S-11: SQL শুধু parameterized (Drizzle/pg placeholders); string concatenation নিষেধ।
- S-12: ইউজার কনটেন্ট (tenant নাম, লোগো ক্যাপশন, নোটিশ, কমেন্ট) রেন্ডারে escape; rich-text নেই (শুধু plain)। লোগো আপলোড: MIME ও magic-byte যাচাই, SVG নিষেধ (বা sanitize), সর্বোচ্চ ১MB।
- S-13: ফাইল আপলোড: টাইপ/সাইজ allow-list, ভাইরাস স্ক্যান [V2], মূল ফাইলনাম সংরক্ষণ কিন্তু স্টোরেজ নাম UUID।
- S-14: Excel import: ফর্মুলা নিষ্ক্রিয়, CSV injection প্রতিরোধ (`= + - @` দিয়ে শুরু হলে `'` প্রিফিক্স), সারি সীমা ৫,০০০।

### 5.3 ট্রান্সপোর্ট ও হেডার
- S-20: শুধু HTTPS; HSTS (১ বছর, includeSubDomains না দিয়ে শুরুতে সতর্কতা)।
- S-21: CSP (nonce-ভিত্তিক), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` সীমিত, `X-Frame-Options: DENY`।
- S-22: CORS শুধু প্রয়োজনীয় origin; wildcard নয়।

### 5.4 Secrets ও ডাটা সুরক্ষা
- S-30: Secrets কখনো কমিট নয়; `.env.local` gitignored; প্রোডে secret manager।
- S-31: PII (NID, ফোন) at-rest এনক্রিপ্টেড (DB disk + NID ফিল্ডে application-level AES-256-GCM; key ঘূর্ণনযোগ্য)।
- S-32: লগে PII মাস্ক (`017****1234`); পাসওয়ার্ড/OTP/টোকেন কখনো লগ নয়।
- S-33: Backup এনক্রিপ্টেড; restore drill ত্রৈমাসিক।
- S-34: Audit log append-only (DB রোলে UPDATE/DELETE নেই)।

### 5.5 অ্যাবিউজ ও অপারেশন
- S-40: Rate limit: লগইন, OTP, signup, সব write API (IP + tenant + user)।
- S-41: Signup এ OTP + bot প্রতিরোধ (Cloudflare Turnstile)।
- S-42: Dependency আপডেট (Dependabot), `pnpm audit` CI এ ব্লকিং (high+)।
- S-43: Webhook (V2) HMAC যাচাই, replay window ৫ মিনিট, idempotent।
- S-44: AI: user ইনপুটে prompt injection ধরে নিন; AI শুধু read-only টুল ও permission-checked; আর্থিক mutation নিষেধ।
- S-45: Threat model (STRIDE) pilot এর আগে সম্পন্ন; সিদ্ধান্ত `docs/adr/` এ।

---

## 6. কোডিং স্ট্যান্ডার্ড

1. TypeScript `strict`, `noUncheckedIndexedAccess`, `any` নিষেধ (`unknown` + narrowing)।
2. ব্যবসায়িক লজিক শুধু service এ; controller পাতলা; repository শুধু ডাটা।
3. প্রতিটি public ফাংশনে ইনপুট/আউটপুট টাইপ স্পষ্ট; Zod schema থেকে টাইপ derive।
4. Error: ডোমেইন-নির্দিষ্ট exception (`DomainError(code)`), global filter এ ProblemDetails এ রূপান্তর; `throw new Error('...')` নিষেধ।
5. লগ: কাঠামোবদ্ধ, `requestId`, `tenantId`, `userId` সহ।
6. DB migration: শুধু forward SQL (drizzle-kit generate + হাতে RLS SQL); প্রতিটি migration এ ডেটা-নিরাপদ ও ব্যাকওয়ার্ড কম্প্যাটিবল (expand → migrate → contract)।
7. কমিট ছোট ও একক উদ্দেশ্যের; PR এ requirement ID (`FR-042`) উল্লেখ।
8. টেস্ট ছাড়া কোড মার্জ নয়: নতুন টেবিল → cross-tenant টেস্ট; টাকার লজিক → invariants টেস্ট; API → integration টেস্ট; কোর ফ্লো → Playwright।
9. কম্পোনেন্টে hardcoded স্ট্রিং/রঙ নিষেধ (`03_UI_Spec.md`)।
10. ফিচার ফ্ল্যাগ: `FEATURE_*` env বা `tenant_feature_flags` — V2/Future ফিচার ফ্ল্যাগের পেছনে।

---

## 7. Environments ও কনফিগারেশন

| Env | উদ্দেশ্য | নোট |
|---|---|---|
| `local` | ডেভেলপমেন্ট | Docker Compose: postgres, redis, minio, mailpit |
| `ci` | টেস্ট | Testcontainers |
| `staging` | প্রি-প্রোড | আসল-সদৃশ ডাটা নয় (anonymized) |
| `production` | লাইভ | |

`.env.example` এ সব কী (মান ছাড়া): `DATABASE_URL`, `DATABASE_MIGRATOR_URL`, `REDIS_URL`, `SESSION_SECRET`, `PII_ENCRYPTION_KEY`, `S3_*`, `SMS_PROVIDER`, `SMS_API_KEY`, `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `APP_BASE_DOMAIN`, `SENTRY_DSN`, `TURNSTILE_*`, `FEATURE_*`। ইনপুট `zod` দিয়ে স্টার্টআপে যাচাই; অনুপস্থিত হলে app শুরু হবে না।

## 8. Observability ও অপারেশন

- Health: `/health/live`, `/health/ready` (DB, Redis)।
- মেট্রিক: request rate/latency/error, queue depth, job failure, SMS sent/failed, প্রতি tenant ব্যবহার।
- Alert: error rate, p95 latency, queue backlog, failed provisioning, SMS provider ব্যর্থতা, DB connection saturation।
- Backup: দৈনিক snapshot + PITR (৭-৩০ দিন); restore drill; রানবুক `docs/runbooks/`।

## 9. স্কেল পথ (পরিকল্পনা, MVP তে বানানো নয়)

১০ → ১,০০০ ক্লায়েন্ট: API/worker instance বাড়ান, read replica, PgBouncer। ১,০০০+: বড় tenant dedicated DB তে সরান, tenant-id ভিত্তিক partitioning (`invoices`, `ledger_entries`)। কাঠামো বদলায় না।

## 10. ADR প্রক্রিয়া

বড় সিদ্ধান্ত (SMS provider, hosting runtime, PDF লাইব্রেরি, ইত্যাদি) `docs/adr/NNNN-title.md` এ লিখতে হবে: প্রসঙ্গ, বিকল্প, সিদ্ধান্ত, ফল। এই ফাইল ও ADR এর মধ্যে বিরোধ হলে মানুষকে জিজ্ঞাসা করুন।
