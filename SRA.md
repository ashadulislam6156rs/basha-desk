# Basha Desk (বাসা ডেস্ক) — সিস্টেম রেফারেন্স আর্কিটেকচার (SRA)

**সংস্করণ 2.1** · **তারিখ:** ২৮ অক্টোবর ২০২৬ · **পাঠক:** Engineering, QA, Security, DevOps, Tech Lead
> SRS (`SRS.md`) বলে **কী**; SRA বলে **কীভাবে ও কেন এভাবে**। এই ফাইল আর্কিটেকচারের সিদ্ধান্ত ও যুক্তি ব্যাখ্যা করে।
> **সূত্র-নীতি:** exact stack ভার্সন, ফোল্ডার, security constraint → `04_TRD.md`; টেবিল ও RLS → `05_Schema.md`। এখানে দ্বিতীয়বার কপি করা হয়নি, যাতে বিরোধ না হয়। বিরোধ হলে `05_Schema` > `04_TRD` > এই SRA।

---

## ১. আর্কিটেকচার নীতিমালা

| # | নীতি | যুক্তি |
|---|---|---|
| A1 | **একটা কোডবেস, একটা deployment, বহু workspace** | ১০০ ক্লায়েন্টে ১০০ কপি মানে ১০০ বার আপডেট; স্কেল অসম্ভব |
| A2 | **Modular monolith** (microservices নয়) | ২-৪ জনের টিম; ডিপ্লয় ও ডিবাগ সহজ; মডিউল সীমানা পরে আলাদা সার্ভিস করা যাবে |
| A3 | **Shared DB + RLS ডিফল্ট; dedicated DB প্রিমিয়াম** | সস্তা ও দ্রুত signup; বড় ক্লায়েন্টে "আলাদা DB" বিক্রয়যোগ্য |
| A4 | **Fail-closed isolation** | context না থাকলে ০ সারি, ভুলেও লিক নয় |
| A5 | **টাকার সত্যতা DB তে** | decimal, immutable, constraint; অ্যাপ বাগ হলেও ডাটা ঠিক |
| A6 | **সব ধীর কাজ async, idempotent** | মাসিক ইনভয়েস, SMS, import, রিপোর্ট worker এ |
| A7 | **Provider abstraction** | SMS/payment/email বদলানো সহজ, vendor lock-in কম |
| A8 | **আগে সহজ, পরে স্কেল; কিন্তু দরজা খোলা** | registry, DbRouter, partition-প্রস্তুত ডিজাইন এখনই রাখা |
| A9 | **বাংলা-first, mobile-first** | লক্ষ্য ব্যবহারকারীর বাস্তবতা |
| A10 | **Observable by default** | structured log, requestId, tenantId প্রতিটি অনুরোধে |

---

## ২. সিস্টেম কনটেক্সট (C4 লেভেল ১)

```
 Platform Owner (Basha Desk টিম)        Client (Owner/Manager/Accountant/Caretaker)        Renter
            │                                         │                                       │
            ▼                                         ▼                                       ▼
   admin.bashadesk.com                  {slug}.bashadesk.com / custom domain          {slug}.bashadesk.com/portal
            └──────────────────────────────┬──────────────────────────────────────────────────┘
                                           ▼
                                  ┌────────────────────┐
                                  │   Basha Desk       │
                                  │   প্ল্যাটফর্ম        │
                                  └─────────┬──────────┘
        ┌───────────────┬──────────────┬────┴─────────┬───────────────┬────────────────┐
        ▼               ▼              ▼              ▼               ▼                ▼
   SMS Gateway      Email         Object Storage   Cloudflare     Payment Gateway   LLM API
                                                   (DNS/WAF/SSL)  [V2]              [V2]
```

বাইরের সত্তা: ক্লায়েন্ট ও Renter ব্রাউজার/PWA; SMS/Email প্রদানকারী; Cloudflare; (V2) bKash/Nagad/SSLCommerz; (V2) LLM।

---

## ৩. কন্টেইনার ভিউ (C4 লেভেল ২)

| কন্টেইনার | প্রযুক্তি | দায়িত্ব |
|---|---|---|
| **web** | Next.js (SSR + middleware) | ৪ সারফেস রেন্ডার; host → tenant resolve; API call |
| **api** | NestJS + Fastify | REST `/api/v1`; auth, RBAC, ব্যবসায়িক লজিক, DB ট্রানজ্যাকশন |
| **worker** | NestJS + BullMQ | invoice, overdue, reminders, SMS/email, import, report, provisioning |
| **PostgreSQL** | managed, PITR | মূল ডাটা (shared pool + RLS) ও control-plane |
| **Redis** | managed | BullMQ, rate limit, OTP TTL, tenant-lookup cache |
| **Object storage** | S3-compatible | ডকুমেন্ট, ছবি, PDF, import ফাইল |
| **Cloudflare** | edge | DNS wildcard, CDN, WAF, SSL, (V2) Custom Hostnames |

web ↔ api server-to-server কল; ব্রাউজার সরাসরি api কে একই origin proxy দিয়ে ডাকে (cookie host-only রাখতে)।

---

## ৪. কম্পোনেন্ট ভিউ (API মডিউল)

মডিউল তালিকা ও নির্ভরতা-নিয়ম `04_TRD.md §2.1`। সংক্ষেপে স্তর:

```
 ┌───────────────────────── Presentation (controller + DTO + Zod) ─────────────────────────┐
 │                                                                                          │
 │   platform-tenants  platform-billing │ identity access │ properties renters agreements   │
 │   billing payments deposits ledger │ expenses reports │ maintenance notices            │
 │   notifications documents imports audit ai(V2)                                           │
 │                                                                                          │
 └──────────── common: guards · tenant-context · UnitOfWork · errors · idempotency ───────┘
                                   │
                          repositories (Drizzle + SQL)
                                   │
                              PostgreSQL (RLS)
```

**সীমানা-নিয়ম:** (১) মডিউল অন্যের repository সরাসরি ডাকে না; (২) `platform-billing` ↔ `billing/payments` এ টেবিল শেয়ার/JOIN নেই; (৩) cross-module পরিবর্তন service ইন্টারফেস বা domain event এ।

### ৪.১ Domain event ও Outbox
গুরুত্বপূর্ণ ঘটনা (`InvoiceIssued`, `PaymentRecorded`, `PaymentVoided`, `AgreementActivated`, `AgreementEnded`, `NoticeSent`) একই DB transaction এ `notification_outbox` ও audit এ লেখা হয়; worker পরে প্রসেস করে। এতে "টাকা রেকর্ড হলো কিন্তু SMS হারালো" বা উল্টোটা ঘটে না।

---

## ৫. Multi-tenancy আর্কিটেকচার

### ৫.১ তিন বিকল্পের তুলনা ও সিদ্ধান্ত

| মডেল | আইসোলেশন | খরচ/অপারেশন | সিদ্ধান্ত |
|---|---|---|---|
| A. Shared DB + `tenant_id` + RLS | কোড ও টেস্ট নির্ভর | সবচেয়ে কম | **ডিফল্ট** |
| B. Schema per tenant | মাঝামাঝি | হাজার schema এ migration ও পারফরম্যান্স ঝামেলা | বাদ |
| C. DB per tenant | সর্বোচ্চ | খরচ ও অপারেশন অনেক | **Enterprise [Future]** |

### ৫.২ Defense in depth (স্তরভিত্তিক সুরক্ষা)

| স্তর | কী ঠেকায় |
|---|---|
| ১. Host → tenant (registry) | ভুল ডোমেইন, suspended tenant |
| ২. Session tenant = host tenant | সেশন চুরি করে অন্য workspace এ যাওয়া |
| ৩. PermissionGuard + property scope | অনুমতিহীন কাজ ও property |
| ৪. Repository এ `tenant_id` সেশন থেকে | ক্লায়েন্ট ইনপুটে tenant বদল |
| ৫. **RLS (FORCE) + composite FK** | অ্যাপ বাগ থাকলেও cross-tenant read/write |
| ৬. আলাদা DB রোল, `BYPASSRLS` নেই | কোড/ক্রেডেনশিয়াল ভুল |
| ৭. Cross-tenant টেস্ট CI গেট | রিগ্রেশন |

### ৫.৩ Tenant Registry ও DbRouter
`tenants` + `tenant_domains` হলো একমাত্র সত্য। প্রতি request এ `DbRouter.for(tenantId)` কানেকশন-পুল বেছে নেয়। MVP তে শুধু `SHARED`। `DEDICATED` এ গেলে: নতুন DB তৈরি → ডাটা কপি → cutover (read-only উইন্ডো) → registry আপডেট। কোড অপরিবর্তিত; তাই ইন্টারফেস এখনই রাখা।

### ৫.৪ Context পাইপলাইন
`UnitOfWork.run(ctx, fn)` প্রতি transaction এর শুরুতে `set_config('app.tenant_id', …, true)` (transaction-local)। Connection pool এ context লিক না করার জন্য `true` বাধ্যতামূলক এবং pool লিক টেস্ট আছে (`06_Plan P1-16`)।

---

## ৬. Hostname, Subdomain ও Hosting

```
 *.bashadesk.com ─► Cloudflare (wildcard SSL, WAF, CDN) ─► Load Balancer
                                                           ├─ web  ×N  (stateless)
                                                           ├─ api  ×N  (stateless)
                                                           └─ worker ×M (আলাদাভাবে স্কেল)
                                                                   │
                                           PostgreSQL · Redis · Object Storage
```

- ক্লায়েন্ট বাড়লে instance সংখ্যা বাড়ে, কাঠামো বদলায় না।
- নতুন ক্লায়েন্ট = registry তে সারি; DNS/সার্ভার ছোঁয়া নেই।
- Region: সিঙ্গাপুর/মুম্বাই (latency); দেশের ভেতরের ডাটা সেন্টার ও রেসিডেন্সির আইনি যাচাই বাকি।
- Custom domain **[V2]**: CNAME → `cname.bashadesk.com` + TXT যাচাই + Cloudflare Custom Hostnames; verification worker; `ssl_status` ট্র্যাক।
- নিরাপত্তা: host-only cookie, reserved slug, takeover রোধ (৯০ দিন slug reserve), প্রতি-hostname rate limit। বিস্তারিত `04_TRD.md §2.7`।

---

## ৭. Auth ও Authorization আর্কিটেকচার

| বিষয় | সিদ্ধান্ত | কেন |
|---|---|---|
| Session | opaque টোকেন, DB তে হ্যাশ, rolling expiry | JWT revoke কঠিন; suspend/role-change এ তাৎক্ষণিক বাতিল দরকার |
| Staff পাসওয়ার্ড | argon2id | আধুনিক সুপারিশ |
| Renter লগইন | মোবাইল + OTP | ইমেইল না থাকা বাস্তবতা |
| Platform | আলাদা টেবিল, আলাদা host/cookie, MFA বাধ্যতামূলক | সর্বোচ্চ ঝুঁকির অ্যাকাউন্ট |
| RBAC | permission code → role → membership (+ property scope) | সরল, অডিটযোগ্য |
| Support access | time-boxed grant, scope সীমিত, ফাইন্যান্স ডিফল্টে বন্ধ | গোপনীয়তা ও বিশ্বাস |
| CSRF | SameSite=Lax + Origin চেক + কাস্টম হেডার | cookie-ভিত্তিক সেশনের জন্য |

ডেটা-স্তরের ফ্লো: `05_Schema.md §13`।

---

## ৮. আর্থিক আর্কিটেকচার (সবচেয়ে সংবেদনশীল অংশ)

### ৮.১ চার স্তরের নির্ভুলতা
1. **টাইপ:** `NUMERIC(14,2)`, কোডে decimal, JSON এ string।
2. **Constraint:** `paid ≤ total`, `amount > 0`, ledger ভারসাম্য trigger, partial unique (duplicate রোধ)।
3. **Immutability:** ISSUED+ invoice, payment, ledger, deposit txn, audit এ UPDATE/DELETE নিষেধ (trigger + DB রোল)।
4. **Reconciliation:** নিশাচর job ও CI এ চারটি invariant কোয়েরি; ফল **শূন্য সারি**।

### ৮.২ Payment ফ্লো (এক transaction)
Idempotency চেক → renter ও বকেয়া invoice লক (`FOR UPDATE`, due-date ক্রমে) → receipt নম্বর → payment → allocation → invoice আপডেট → journal → audit + outbox। ধাপ-বিস্তার `05_Schema.md §13.5`।

### ৮.৩ কেন Payment ও Invoice আলাদা, allocation মাঝে
এক payment একাধিক invoice মেটাতে পারে; এক invoice একাধিক payment এ মিটতে পারে; অগ্রিম ও আংশিক সম্ভব হয়। এটি ছাড়া বকেয়ার সঠিক হিসাব ও void/reversal অসম্ভব।

### ৮.৪ Ledger এর ভূমিকা
MVP তে ledger হলো **reconciliation ও ভবিষ্যৎ accounting রিপোর্টের ভিত্তি**; UI রিপোর্ট সরাসরি invoice/payment থেকেও আসে এবং মোট ledger এর সাথে মিলতে হয়। এতে MVP সহজ থাকে, অথচ পূর্ণ double-entry এ যাওয়ার পথ খোলা।

### ৮.৫ দুই প্রবাহের বিভাজন
`platform_*` টেবিল (সাবস্ক্রিপশন) ও `invoices/payments` (ভাড়া) আলাদা মডিউল, আলাদা রিপোর্ট। এতে আমাদের আয় ও ক্লায়েন্টের আয় কখনো মেশে না এবং নিয়ন্ত্রক সীমানা পরিষ্কার থাকে।

---

## ৯. Async প্রসেসিং আর্কিটেকচার

| বিষয় | সিদ্ধান্ত |
|---|---|
| Queue | BullMQ (Redis) |
| Payload | `tenantId` বাধ্যতামূলক; job চলার সময় context সেট |
| Idempotency | প্রাকৃতিক ইউনিক key (`agreement_id, period_start`), upsert/ON CONFLICT |
| ব্যর্থতা | exponential backoff ×৫ → DLQ → Platform `/ops` এ দৃশ্যমান |
| সময়সূচি | repeatable jobs, `Asia/Dhaka` টাইমজোন |
| Fairness | প্রতি-tenant concurrency সীমা, যাতে একজন বড় ক্লায়েন্ট সবাইকে আটকে না দেয় |

Job তালিকা: `02_AppFlow.md §7`।

---

## ১০. Notification ও Provider Abstraction

```
 ঘটনা ─► outbox (DB) ─► worker ─► NotificationRouter ─► SmsProvider | EmailProvider | InApp
                                         │
                              কোটা চেক ──┴─► SKIPPED_QUOTA / retry / FAILED
```

`SmsProvider`, `EmailProvider`, `PaymentGateway`, `AiGateway` ইন্টারফেস; প্রতিটিতে timeout, retry (শুধু idempotent হলে), circuit breaker। প্রথম SMS provider ADR `0002` এ ঠিক হবে।

---

## ১১. ফাইল ও ডকুমেন্ট স্টোরেজ

- কী: `tenants/{tenant_id}/{kind}/{uuid}`।
- আপলোড: presigned URL; MIME + magic-byte যাচাই; সাইজ/টাইপ allow-list।
- ডাউনলোড: permission যাচাইয়ের পর ছোট মেয়াদের presigned URL (≤ ৫ মিনিট)।
- ছবি ক্লায়েন্ট-সাইডে কমপ্রেস (মোবাইল ডাটা সাশ্রয়)।
- PDF (রিসিট/রিপোর্ট) worker/API তে বাংলা ফন্ট এম্বেড করে তৈরি (লাইব্রেরি ADR `0003`)।

---

## ১২. Frontend আর্কিটেকচার

| বিষয় | সিদ্ধান্ত |
|---|---|
| রেন্ডারিং | Next.js App Router; সারফেস ভেদে route group |
| Surface routing | `middleware.ts`: host + path → surface + tenant status পেজ |
| ডাটা | TanStack Query (server state), Zustand (শুধু UI state) |
| ফর্ম | react-hook-form + Zod (সার্ভারের সাথে শেয়ার্ড schema) |
| i18n | next-intl, কী-ভিত্তিক বাংলা/English |
| থিম | CSS variables, light/dark (`03_UI_Spec.md`) |
| PWA | installable, পঠিত ডাটার offline cache, লেখা offline নয় |
| ব্র্যান্ড | Basha Desk টোকেন (`--color-primary #114F4D`, `--color-accent #E6A34B`) |

শেয়ার্ড Zod schema `packages/shared` এ থাকায় ফ্রন্টেন্ড-ব্যাকএন্ড যাচাই এক উৎস থেকে।

---

## ১৩. নিরাপত্তা আর্কিটেকচার (সারসংক্ষেপ)

পূর্ণ constraint `04_TRD.md §5`। স্তর:

| স্তর | নিয়ন্ত্রণ |
|---|---|
| Edge | Cloudflare WAF, rate limit, Turnstile (signup) |
| Transport | HTTPS only, HSTS, CSP (nonce), security headers |
| Application | Zod ইনপুট যাচাই, parameterized SQL, CSRF, RBAC, entitlement |
| Data | RLS FORCE, composite FK, PII এনক্রিপশন, immutable audit |
| Operations | secret manager, Dependabot, audit/Trivy/gitleaks CI, backup এনক্রিপ্টেড |
| AI | read-only টুল, permission-checked, PII মাস্ক, financial mutation নিষেধ |

**Threat model (STRIDE)** pilot এর আগে `P4-07`; প্রাথমিক মূল ঝুঁকি:

| ঝুঁকি | প্রতিরোধ |
|---|---|
| Cross-tenant ডাটা লিক | RLS + composite FK + টেস্ট গেট |
| IDOR (ID অনুমান) | tenant/renter scope repository ও RLS এ |
| সেশন চুরি/ঘুরে tenant বদল | host=session tenant চেক, host-only cookie |
| OTP অপব্যবহার (SMS bomb) | cooldown, ঘণ্টা-সীমা, IP rate limit |
| ভুয়া reserved subdomain ফিশিং | reserved তালিকা |
| Subdomain takeover | hostname নিষ্ক্রিয়, slug ৯০ দিন reserve |
| Excel/CSV injection | `= + - @` স্যানিটাইজ, ফর্মুলা নিষ্ক্রিয় |
| ফাইল ছদ্মবেশ | magic-byte, allow-list, SVG নিষেধ |
| Double payment | idempotency key + unique trx reference |
| Support এর অতিরিক্ত অ্যাক্সেস | time-boxed grant, audit |
| Prompt injection (AI) | read-only, scoped টুল, আউটপুট যাচাই |

---

## ১৪. Observability ও অপারেশন

- **লগ:** pino JSON; `requestId, tenantId, userId`; PII মাস্ক।
- **মেট্রিক:** request rate/latency/error, queue depth, job failure, SMS sent/failed, প্রতি-tenant ব্যবহার।
- **Alert:** error rate, p95, queue backlog, provisioning ব্যর্থতা, SMS provider ব্যর্থতা, DB connection saturation।
- **Health:** `/health/live`, `/health/ready`।
- **Backup/DR:** দৈনিক snapshot + PITR; ত্রৈমাসিক restore drill; রানবুক `docs/runbooks/`।
- **Release:** GitHub Actions → staging → production; expand→migrate→contract migration নীতি; ফিচার ফ্ল্যাগে V2 ফিচার।

---

## ১৫. স্কেল ও বিবর্তন পথ

| ধাপ | পরিস্থিতি | পদক্ষেপ |
|---|---|---|
| ১ | ১০ ক্লায়েন্ট (pilot) | একক region, ছোট instance, shared DB |
| ২ | ১০০-১,০০০ | api/worker অনুভূমিক স্কেল, PgBouncer, read replica, রিপোর্ট summary টেবিল |
| ৩ | বড় tenant | dedicated DB তে সরানো (registry + DbRouter) |
| ৪ | ডাটা বড় | `invoices`, `ledger_entries`, `audit_logs`, `notification_outbox` partition |
| ৫ | টিম বড় | সবচেয়ে ভারী মডিউল (notifications/reports) আলাদা সার্ভিসে বের করা |

প্রতিটি ধাপে কাঠামো বদলায় না; শুধু একই জিনিসের সংখ্যা বা অবস্থান বদলায়।

---

## ১৬. মূল আর্কিটেকচার সিদ্ধান্ত (ADR সূচি)

| ADR | সিদ্ধান্ত | স্ট্যাটাস |
|---|---|---|
| 0001 | Hosting runtime (Fly/Railway/ECS) | খোলা (`P0-08`) |
| 0002 | SMS provider | খোলা (`P0-08`) |
| 0003 | PDF লাইব্রেরি | খোলা (`P0-08`) |
| 0004 | Modular monolith, microservices নয় | সিদ্ধান্ত নেওয়া |
| 0005 | Shared DB + RLS ডিফল্ট, dedicated প্রিমিয়াম | সিদ্ধান্ত নেওয়া |
| 0006 | Drizzle ORM (RLS ও SQL নিয়ন্ত্রণের জন্য) | সিদ্ধান্ত নেওয়া |
| 0007 | Opaque DB-backed session (JWT নয়) | সিদ্ধান্ত নেওয়া |
| 0008 | Ledger MVP তে reconciliation-ভিত্তিক | সিদ্ধান্ত নেওয়া |
| 0009 | ভাড়ার টাকা প্ল্যাটফর্মে ধারণ নয় | সিদ্ধান্ত নেওয়া (আইনি যাচাই সাপেক্ষে) |

নতুন বড় সিদ্ধান্ত `docs/adr/NNNN-title.md` ফরম্যাটে: প্রসঙ্গ → বিকল্প → সিদ্ধান্ত → ফল।

## ১৭. ট্রেডঅফ ও সীমাবদ্ধতা (খোলা কথা)

- **Shared DB:** noisy-neighbor ঝুঁকি আছে → প্রতি-tenant rate limit ও job fairness দিয়ে সামলানো।
- **Drizzle:** NestJS এর জন্য Prisma/TypeORM এর মতো "ব্যাটারি-ইনক্লুডেড" নয়; বিনিময়ে RLS নিয়ন্ত্রণ ও SQL-কাছাকাছি টাইপ-সেফটি।
- **Opaque session:** প্রতি request এ DB/Redis লুকআপ; ক্যাশ ও ছোট payload দিয়ে খরচ কমানো।
- **MVP তে online payment নেই:** অ্যাডপশন বাধা নয়, কারণ বাজার এখনো ক্যাশ/MFS হাতে-রেকর্ড; আইনি ঝুঁকি এড়ায়।
- **ডাটা রেসিডেন্সি:** বিদেশি region হলে আইনি সীমা যাচাই না হওয়া পর্যন্ত খোলা ঝুঁকি।
- **PNG লোগো:** প্রোডাকশনে SVG দরকার (`P3-01a`)।

## ১৮. পরিবর্তনের ইতিহাস

| সংস্করণ | তারিখ | পরিবর্তন |
|---|---|---|
| 2.0 | ২৭ অক্টো ২০২৬ | SRA baseline |
| 2.1 | ২৮ অক্টো ২০২৬ | Basha Desk ব্র্যান্ড; পূর্ণ আর্কিটেকচার ভিউ, ADR সূচি, threat তালিকা, ট্রেডঅফ |
