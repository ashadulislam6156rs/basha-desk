# 05 — Schema (PostgreSQL 17+, Row-Level Security) · Basha Desk

> এটি পূর্ণ relational schema ও Auth/RLS ফ্লো। Drizzle schema (`packages/db/src/schema`) এর সাথে এই ফাইল সবসময় মিলিয়ে রাখতে হবে। কোনো টেবিল/কলাম বদলালে **আগে এই ফাইল আপডেট**, তারপর migration।
> স্ট্যাক ও নিয়ম: `04_TRD.md`।

---

## 0. কনভেনশন

| বিষয় | নিয়ম |
|---|---|
| টেবিল/কলাম নাম | `snake_case`, টেবিল বহুবচন |
| Primary key | `id UUID PRIMARY KEY DEFAULT uuidv7()` (PG18 native; না থাকলে অ্যাপ-সাইড UUID v7) |
| Tenant কলাম | প্রতিটি tenant-scoped টেবিলে `tenant_id UUID NOT NULL REFERENCES tenants(id)` |
| Timestamps | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (trigger) |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` শুধু যেখানে লেখা (আর্থিক টেবিলে নয়) |
| টাকা | `NUMERIC(14,2)`, `currency CHAR(3) NOT NULL DEFAULT 'BDT'` |
| Enum | PostgreSQL `CREATE TYPE ... AS ENUM` (নতুন মান যোগ = migration) |
| FK | সবসময় `(tenant_id, x_id)` composite এ ঝুঁকি এড়াতে: tenant টেবিলের FK তে **composite FK** (`tenant_id, id`) ব্যবহার (নিচে §0.1) |
| Version | সংযুক্ত রেকর্ডে `version INT NOT NULL DEFAULT 1` (optimistic locking) যেখানে লেখা |

### 0.1 Composite FK নিয়ম (cross-tenant রেফারেন্স রোধ)
প্রতিটি tenant-scoped টেবিলে `UNIQUE (tenant_id, id)` থাকে। চাইল্ড টেবিলের FK:
```sql
FOREIGN KEY (tenant_id, property_id) REFERENCES properties (tenant_id, id)
```
এতে ভুল করেও tenant A এর সারি tenant B এর parent এ লিংক হতে পারে না।

### 0.2 Enum তালিকা

```sql
CREATE TYPE tenant_status      AS ENUM ('PROVISIONING','PROVISION_FAILED','READY','SUSPENDED','CANCELLED','ARCHIVED');
CREATE TYPE db_mode            AS ENUM ('SHARED','DEDICATED');
CREATE TYPE domain_type        AS ENUM ('SUBDOMAIN','CUSTOM');
CREATE TYPE verification_status AS ENUM ('PENDING','VERIFIED','FAILED');
CREATE TYPE ssl_status         AS ENUM ('PENDING','ACTIVE','ERROR');
CREATE TYPE subscription_status AS ENUM ('TRIALING','ACTIVE','PAST_DUE','CANCELLED');
CREATE TYPE user_kind          AS ENUM ('STAFF','RENTER');
CREATE TYPE space_type         AS ENUM ('FLAT','SHOP','PARKING','ROOM','SEAT','OTHER');
CREATE TYPE space_status       AS ENUM ('VACANT','OCCUPIED','RESERVED','MAINTENANCE');
CREATE TYPE agreement_status   AS ENUM ('DRAFT','ACTIVE','ENDING','ENDED','CANCELLED');
CREATE TYPE invoice_status     AS ENUM ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID');
CREATE TYPE payment_method     AS ENUM ('CASH','BKASH','NAGAD','ROCKET','BANK','CARD','OTHER');
CREATE TYPE payment_status     AS ENUM ('RECORDED','VOID');
CREATE TYPE charge_frequency   AS ENUM ('MONTHLY','QUARTERLY','YEARLY','ONE_TIME');
CREATE TYPE charge_category    AS ENUM ('RENT','SERVICE_CHARGE','ELECTRICITY','GAS','WATER','PARKING','LATE_FEE','OTHER');
CREATE TYPE deposit_txn_type   AS ENUM ('RECEIVED','ADJUSTED','REFUNDED','FORFEITED');
CREATE TYPE maintenance_status AS ENUM ('OPEN','IN_PROGRESS','RESOLVED','CLOSED');
CREATE TYPE maintenance_priority AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
CREATE TYPE notification_channel AS ENUM ('IN_APP','SMS','EMAIL');
CREATE TYPE notification_status  AS ENUM ('QUEUED','SENT','DELIVERED','FAILED','SKIPPED_QUOTA');
CREATE TYPE invite_status      AS ENUM ('PENDING','ACCEPTED','EXPIRED','REVOKED');
CREATE TYPE import_status      AS ENUM ('UPLOADED','VALIDATED','IMPORTING','DONE','FAILED');
CREATE TYPE ledger_account_type AS ENUM ('ASSET','LIABILITY','INCOME','EXPENSE','EQUITY');
```

---

## 1. Control Plane (Platform; RLS নেই, আলাদা DB রোলে সুরক্ষিত)

### 1.1 `plans`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE NOT NULL | `STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE` |
| name_bn / name_en | text NOT NULL | |
| price_monthly | numeric(14,2) | NULL = চুক্তি অনুযায়ী |
| currency | char(3) | |
| is_active | boolean DEFAULT true | |
| created_at/updated_at | timestamptz | |

### 1.2 `plan_entitlements`
| কলাম | টাইপ | নোট |
|---|---|---|
| plan_id | uuid FK plans | |
| key | text | `max_properties`, `max_spaces`, `max_users`, `sms_quota_monthly`, `custom_domain`, `branding`, `api_access`, `dedicated_db`, `utility_billing`, `excel_import` |
| value_int | int NULL | NULL + `is_unlimited` = সীমাহীন |
| value_bool | boolean NULL | |
| is_unlimited | boolean DEFAULT false | |
| PK | (plan_id, key) | |

### 1.3 `tenants` (Tenant Registry)
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| slug | citext UNIQUE NOT NULL | subdomain; check `^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$` |
| name | text NOT NULL | |
| status | tenant_status NOT NULL DEFAULT 'PROVISIONING' | |
| status_reason | text NULL | suspend কারণ |
| db_mode | db_mode NOT NULL DEFAULT 'SHARED' | |
| db_connection_ref | text NULL | secret manager key (DEDICATED এ) |
| default_locale | text DEFAULT 'bn' | |
| timezone | text DEFAULT 'Asia/Dhaka' | |
| currency | char(3) DEFAULT 'BDT' | |
| owner_user_id | uuid NULL | provisioning শেষে |
| branding | jsonb DEFAULT '{}' | tenant লোগো `documents.id`, primary রঙ (V2); Basha Desk ব্র্যান্ডিং এখানে নয়, কোডে |
| created_at/updated_at | timestamptz | |
| suspended_at, cancelled_at, archived_at | timestamptz NULL | |

### 1.4 `tenant_domains`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| hostname | citext UNIQUE NOT NULL | `rahim.bashadesk.com` বা custom |
| type | domain_type | |
| is_primary | boolean DEFAULT false | tenant প্রতি একটি primary (partial unique index) |
| verification_status | verification_status DEFAULT 'PENDING' | |
| verification_token | text NULL | TXT মান |
| ssl_status | ssl_status DEFAULT 'PENDING' | |
| cf_custom_hostname_id | text NULL | Cloudflare ref |
| is_active | boolean DEFAULT true | suspend/delete এ false |
| released_at | timestamptz NULL | slug reservation শেষের হিসাব |
| created_at/updated_at | timestamptz | |

ইনডেক্স: `UNIQUE (hostname)`, `INDEX (tenant_id)`, `UNIQUE (tenant_id) WHERE is_primary`।

### 1.5 `reserved_slugs`
`slug citext PK`, `reason text`। seed: TRD §2.7 তালিকা।

### 1.6 `slug_reservations`
মুছে ফেলা slug ৯০ দিন ধরে রাখে: `slug citext PK`, `released_from_tenant_id uuid`, `reserved_until timestamptz`।

### 1.7 `subscriptions` (প্রবাহ ১)
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| plan_id | uuid FK plans | |
| status | subscription_status | |
| trial_ends_at, current_period_start, current_period_end | timestamptz | |
| cancel_at_period_end | boolean DEFAULT false | |
| created_at/updated_at | timestamptz | |

ইনডেক্স: `(tenant_id)`, `UNIQUE (tenant_id) WHERE status IN ('TRIALING','ACTIVE','PAST_DUE')`।

### 1.8 `platform_invoices` ও `platform_payments` (প্রবাহ ১; ভাড়ার `invoices/payments` থেকে সম্পূর্ণ আলাদা)
`platform_invoices`: id, tenant_id, subscription_id, number (unique), period_start/end, amount numeric(14,2), currency, status (`DRAFT/ISSUED/PAID/VOID`), due_date, issued_at, paid_at।
`platform_payments`: id, tenant_id, platform_invoice_id, amount, method, reference, paid_at, recorded_by_platform_user_id।

### 1.9 `platform_users`, `platform_sessions`, `platform_mfa`
- `platform_users`: id, email citext UNIQUE, name, password_hash, role (`SUPER_ADMIN`/`SUPPORT_AGENT`), is_active, last_login_at।
- `platform_sessions`: id, platform_user_id, token_hash UNIQUE, ip, user_agent, expires_at, revoked_at, created_at।
- `platform_mfa`: platform_user_id PK, totp_secret_enc, enabled_at, recovery_codes_hash text[]।

### 1.10 `support_access_grants`
id, tenant_id, platform_user_id (agent), granted_by (platform_user), scope text[] (`metadata`,`properties`,`finance`...), reason, expires_at, revoked_at, created_at। সূচক `(platform_user_id, expires_at)`।

### 1.11 `platform_audit_logs`
id, platform_user_id NULL, tenant_id NULL, action text, entity_type, entity_id, before jsonb, after jsonb, ip, request_id, created_at। Append-only।

### 1.12 `tenant_usage_counters`
tenant_id, key text (`properties`,`spaces`,`users`,`sms_month:2026-10`), value int, updated_at; PK `(tenant_id, key)`। Entitlement চেকে ব্যবহৃত।

---

## 2. Identity ও Access (Tenant-scoped, RLS)

### 2.1 `users`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| kind | user_kind NOT NULL | STAFF / RENTER |
| name | text NOT NULL | |
| phone | text NULL | E.164 `+8801XXXXXXXXX` |
| email | citext NULL | |
| password_hash | text NULL | STAFF এ; RENTER এ NULL |
| locale | text DEFAULT 'bn' | |
| theme | text DEFAULT 'system' | |
| is_active | boolean DEFAULT true | |
| failed_login_count | int DEFAULT 0 | |
| locked_until | timestamptz NULL | |
| last_login_at | timestamptz NULL | |
| created_at/updated_at | timestamptz | |

কনস্ট্রেইন্ট: `UNIQUE (tenant_id, id)`, `UNIQUE (tenant_id, phone) WHERE phone IS NOT NULL`, `UNIQUE (tenant_id, email) WHERE email IS NOT NULL`, `CHECK (phone IS NOT NULL OR email IS NOT NULL)`।

### 2.2 `sessions`
id, tenant_id, user_id, token_hash text UNIQUE, ip inet, user_agent, created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at। সূচক `(user_id)`, `(expires_at)`।

### 2.3 `otp_challenges`
(সংক্ষিপ্ত তথ্য Redis এ থাকে; অডিটের জন্য DB তে মেটা)
id, tenant_id, phone, purpose (`RENTER_LOGIN`,`SIGNUP`,`INVITE`), code_hash, attempts int, expires_at, consumed_at, created_at।

### 2.4 `roles`, `permissions`, `role_permissions`
- `permissions`: `code text PK` (যেমন `property.read`, `property.write`, `space.write`, `renter.write`, `agreement.write`, `invoice.read`, `invoice.issue`, `invoice.void`, `payment.record`, `payment.void`, `expense.write`, `report.read`, `user.manage`, `settings.manage`, `maintenance.write`, `notice.send`, `import.run`, `audit.read`), `description`। গ্লোবাল, RLS নেই (read-only seed)।
- `roles`: id, tenant_id NULL (NULL = system role), code (`OWNER`,`MANAGER`,`ACCOUNTANT`,`CARETAKER`,`RENTER`), name_bn, name_en, is_system boolean। `UNIQUE (tenant_id, code)`।
- `role_permissions`: role_id, permission_code, PK (role_id, permission_code)।

### 2.5 `memberships`
id, tenant_id, user_id, role_id, is_active, created_at। `UNIQUE (tenant_id, user_id)`।

### 2.6 `membership_property_scopes`
membership_id, tenant_id, property_id, PK (membership_id, property_id)। কোনো scope না থাকলে (Owner/Accountant) সব property; Manager/Caretaker এ অন্তত একটি বাধ্যতামূলক (অ্যাপ লজিক)।

### 2.7 `invites`
id, tenant_id, invited_by, phone NULL, email NULL, role_id, property_ids uuid[], token_hash UNIQUE, status invite_status, expires_at, accepted_at, created_at।

---

## 3. Property হায়ারার্কি (RLS)

### 3.1 `portfolios` (ঐচ্ছিক)
id, tenant_id, name, created_at/updated_at, deleted_at।

### 3.2 `properties`
| কলাম | টাইপ |
|---|---|
| id | uuid PK |
| tenant_id | uuid |
| portfolio_id | uuid NULL (composite FK) |
| name | text NOT NULL |
| code | text NULL (সংক্ষিপ্ত কোড) |
| division, district, upazila | text NULL |
| address | text NOT NULL |
| latitude/longitude | numeric(9,6) NULL |
| notes | text NULL |
| is_archived | boolean DEFAULT false |
| created_at/updated_at/deleted_at | timestamptz |

ইনডেক্স: `(tenant_id, name)`, `UNIQUE (tenant_id, code) WHERE code IS NOT NULL`, `(tenant_id, district)`।

### 3.3 `buildings`
id, tenant_id, property_id, name, floors_count int NULL, created_at/updated_at, deleted_at। `UNIQUE (tenant_id, property_id, name)`।

### 3.4 `floors`
id, tenant_id, building_id, level int (বেসমেন্ট ঋণাত্মক), label text, created_at। `UNIQUE (tenant_id, building_id, level)`।

### 3.5 `spaces`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| property_id | uuid | denormalized (দ্রুত scope ফিল্টার) |
| building_id | uuid NULL | |
| floor_id | uuid NULL | |
| code | text NOT NULL | "A-3B", "দোকান ৫" |
| type | space_type NOT NULL | |
| status | space_status DEFAULT 'VACANT' | |
| area_sqft | numeric(10,2) NULL | |
| default_rent | numeric(14,2) NOT NULL DEFAULT 0 | |
| default_service_charge | numeric(14,2) DEFAULT 0 | |
| attributes | jsonb DEFAULT '{}' | বেডরুম সংখ্যা, মিটার নম্বর ইত্যাদি |
| is_archived | boolean DEFAULT false | |
| version | int DEFAULT 1 | |
| created_at/updated_at/deleted_at | timestamptz | |

ইনডেক্স: `UNIQUE (tenant_id, property_id, code)`, `(tenant_id, property_id, status)`, `(tenant_id, type)`।

---

## 4. Renter ও Agreement (RLS)

### 4.1 `renters`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| user_id | uuid NULL | পোর্টাল লগইন তৈরি হলে |
| full_name | text NOT NULL | |
| phone | text NOT NULL | E.164; `UNIQUE (tenant_id, phone)` |
| email | citext NULL | |
| nid_enc | bytea NULL | AES-256-GCM এনক্রিপ্টেড |
| nid_last4 | text NULL | শুধু দেখানোর জন্য |
| address_permanent | text NULL | |
| occupation | text NULL | |
| emergency_name, emergency_phone | text NULL | |
| photo_document_id | uuid NULL | |
| notes | text NULL | |
| credit_balance | numeric(14,2) NOT NULL DEFAULT 0 | অগ্রিম/অবণ্টিত; `CHECK >= 0` |
| created_at/updated_at/deleted_at | timestamptz | |

ইনডেক্স: `(tenant_id, full_name)`, `pg_trgm GIN (full_name)`, `(tenant_id, phone)`।

### 4.2 `renter_documents`
id, tenant_id, renter_id, document_id (→ documents), kind (`NID_FRONT`,`NID_BACK`,`PHOTO`,`AGREEMENT_SCAN`,`OTHER`), created_at।

### 4.3 `agreements`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| property_id | uuid | scope ফিল্টার |
| renter_id | uuid | composite FK |
| number | text NOT NULL | `AG-2026-0001`, `UNIQUE (tenant_id, number)` |
| status | agreement_status DEFAULT 'DRAFT' | |
| start_date | date NOT NULL | |
| end_date | date NULL | |
| billing_day | smallint NOT NULL CHECK 1..28 | |
| due_days | smallint NOT NULL DEFAULT 7 | |
| security_deposit | numeric(14,2) DEFAULT 0 | |
| notes | text NULL | |
| terms_document_id | uuid NULL | |
| activated_at, ended_at, cancelled_at | timestamptz NULL | |
| cancel_reason | text NULL | |
| version | int DEFAULT 1 | |
| created_by | uuid | |
| created_at/updated_at | timestamptz | |

ইনডেক্স: `(tenant_id, renter_id)`, `(tenant_id, property_id, status)`, `(tenant_id, status, billing_day)`।

### 4.4 `agreement_spaces`
id, tenant_id, agreement_id, space_id, rent_amount numeric(14,2) NOT NULL, from_date, to_date NULL।
**ওভারল্যাপ রোধ (double-booking):**
```sql
ALTER TABLE agreement_spaces ADD CONSTRAINT no_overlap_active
 EXCLUDE USING gist (tenant_id WITH =, space_id WITH =,
   daterange(from_date, COALESCE(to_date,'infinity'::date), '[]') WITH &&)
 WHERE (is_active);   -- is_active কলাম: agreement ACTIVE/ENDING থাকলে true (trigger/অ্যাপ)
```
(`btree_gist` এক্সটেনশন প্রয়োজন।)

### 4.5 `charge_types`
id, tenant_id, code, name_bn, name_en, category charge_category, is_taxable boolean DEFAULT false, is_active। `UNIQUE (tenant_id, code)`। seed: RENT, SERVICE_CHARGE, ELECTRICITY, GAS, WATER, PARKING, LATE_FEE।

### 4.6 `agreement_charges` (recurring)
id, tenant_id, agreement_id, charge_type_id, description, amount numeric(14,2) NOT NULL, frequency charge_frequency DEFAULT 'MONTHLY', start_date, end_date NULL, is_active। সূচক `(tenant_id, agreement_id)`।

### 4.7 `rent_escalations` **[V2]**
id, tenant_id, agreement_id, effective_date, percent numeric(5,2) NULL, fixed_amount numeric(14,2) NULL, applied_at NULL।

---

## 5. Billing — ইনভয়েস, পেমেন্ট, অ্যালোকেশন, ডিপোজিট (প্রবাহ ২, RLS)

### 5.1 `invoice_counters`
tenant_id, year int, last_value int; PK (tenant_id, year)। ক্রমিক নম্বর `SELECT ... FOR UPDATE` এ (গ্যাপ-ফ্রি)।

### 5.2 `invoices`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| property_id | uuid | |
| agreement_id | uuid | composite FK |
| renter_id | uuid | |
| number | text NULL | ISSUE এর সময় বরাদ্দ, `UNIQUE (tenant_id, number)` |
| status | invoice_status DEFAULT 'DRAFT' | |
| period_start, period_end | date | |
| issue_date | date NULL | |
| due_date | date NOT NULL | |
| subtotal | numeric(14,2) NOT NULL | Σ lines |
| total | numeric(14,2) NOT NULL | |
| paid_amount | numeric(14,2) NOT NULL DEFAULT 0 | Σ allocations (ডেরাইভড, trigger/অ্যাপ) |
| currency | char(3) DEFAULT 'BDT' | |
| void_reason | text NULL | |
| voided_at, voided_by | | |
| source | text DEFAULT 'AUTO' | AUTO / MANUAL |
| notes | text NULL | |
| version | int DEFAULT 1 | |
| created_at/updated_at | timestamptz | |

কনস্ট্রেইন্ট:
- `CHECK (total >= 0)`, `CHECK (paid_amount >= 0 AND paid_amount <= total)`
- **অটো ইনভয়েস ইউনিক:** `UNIQUE (tenant_id, agreement_id, period_start) WHERE source = 'AUTO' AND status <> 'VOID'`

ইনডেক্স: `(tenant_id, renter_id, status)`, `(tenant_id, property_id, status, due_date)`, `(tenant_id, due_date) WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE')`, `(tenant_id, period_start)`।
**Immutability trigger:** status ≠ DRAFT হলে `subtotal,total,period_*,agreement_id,renter_id` UPDATE নিষেধ।

### 5.3 `invoice_lines`
id, tenant_id, invoice_id, charge_type_id, description text, quantity numeric(10,2) DEFAULT 1, unit_amount numeric(14,2), amount numeric(14,2) (round half-up), meter_reading_id NULL, sort int। ISSUED+ হলে immutable।

### 5.4 `payments`
| কলাম | টাইপ | নোট |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| property_id | uuid NULL | |
| renter_id | uuid | |
| receipt_number | text NOT NULL | `UNIQUE (tenant_id, receipt_number)` |
| status | payment_status DEFAULT 'RECORDED' | |
| amount | numeric(14,2) NOT NULL CHECK (> 0) | |
| currency | char(3) | |
| method | payment_method NOT NULL | |
| reference | text NULL | trx id / ব্যাংক রেফারেন্স |
| paid_at | timestamptz NOT NULL | |
| received_by | uuid NULL | user |
| recorded_by | uuid NOT NULL | |
| notes | text NULL | |
| idempotency_key | text NOT NULL | `UNIQUE (tenant_id, idempotency_key)` |
| gateway_txn_id | text NULL | [V2] |
| void_reason, voided_at, voided_by | | |
| created_at | timestamptz | (updated_at নেই: immutable) |

ইনডেক্স: `(tenant_id, renter_id, paid_at DESC)`, `(tenant_id, paid_at)`, `UNIQUE (tenant_id, method, reference) WHERE reference IS NOT NULL AND status='RECORDED'` (duplicate trx ID রোধ)।
**Immutability:** `amount, renter_id, method, paid_at` UPDATE নিষেধ; শুধু status → VOID।

### 5.5 `payment_allocations`
id, tenant_id, payment_id, invoice_id NULL, amount numeric(14,2) NOT NULL CHECK (> 0), kind (`INVOICE`,`CREDIT`) — `CREDIT` এ invoice_id NULL (renter credit), created_at, reversed_at NULL, reversal_of NULL।
নিয়ম: `Σ(allocations.amount WHERE reversed_at IS NULL) per payment = payment.amount`; deferrable constraint trigger দিয়ে লেনদেন শেষে যাচাই।
ইনডেক্স: `(tenant_id, invoice_id)`, `(tenant_id, payment_id)`।

### 5.6 `deposits` ও `deposit_transactions`
`deposits`: id, tenant_id, agreement_id UNIQUE, renter_id, balance numeric(14,2) DEFAULT 0 CHECK (>= 0)।
`deposit_transactions` (append-only): id, tenant_id, deposit_id, type deposit_txn_type, amount numeric(14,2), method, reference, reason, related_invoice_id NULL, created_by, created_at।

### 5.7 `late_fee_rules` **[V2]**
id, tenant_id, property_id NULL, grace_days, type (`FIXED`,`PERCENT`,`PER_DAY`), value, max_cap NULL, is_active।

### 5.8 `utility_meters`, `meter_readings` **[V2]**
`utility_meters`: id, tenant_id, space_id, kind (`ELECTRICITY`,`GAS`,`WATER`), meter_no, unit_rate numeric(10,4)।
`meter_readings`: id, tenant_id, meter_id, reading_date, reading numeric(12,2), previous_reading, consumption (generated), invoice_line_id NULL, created_by। `UNIQUE (meter_id, reading_date)`।

---

## 6. Ledger (append-only double-entry, RLS)

### 6.1 `ledger_accounts`
id, tenant_id, code, name, type ledger_account_type, is_system boolean। `UNIQUE (tenant_id, code)`। system seed: `1000 Cash`, `1010 bKash/Nagad`, `1020 Bank`, `1100 Accounts Receivable`, `2000 Renter Credit`, `2100 Security Deposits Held`, `4000 Rental Income`, `4010 Service Charge Income`, `4020 Utility Income`, `4030 Late Fee Income`, `5000 Operating Expense`...

### 6.2 `journals` ও `ledger_entries`
`journals`: id, tenant_id, source_type (`INVOICE_ISSUED`,`PAYMENT`,`PAYMENT_VOID`,`INVOICE_VOID`,`DEPOSIT`,`EXPENSE`), source_id, description, posted_at, created_by, created_at, reversed_by_journal_id NULL।
`ledger_entries`: id, tenant_id, journal_id, account_id, property_id NULL, debit numeric(14,2) DEFAULT 0, credit numeric(14,2) DEFAULT 0, currency, CHECK ((debit=0) <> (credit=0)), created_at।
**ভারসাম্য:** deferrable constraint trigger — প্রতি journal এ Σdebit = Σcredit। UPDATE/DELETE নিষিদ্ধ (trigger + রোল)।
MVP তে ledger entries invoice ISSUE/payment/void/deposit/expense ঘটনায় service এ লেখা হয়; রিপোর্টের বেসলাইন নয়, **reconciliation এর জন্য**।

---

## 7. Expense, Vendor

- `expense_categories`: id, tenant_id, code, name_bn, name_en, is_active; `UNIQUE (tenant_id, code)`।
- `vendors` **[V2]**: id, tenant_id, name, phone, trade, notes, deleted_at।
- `expenses`: id, tenant_id, property_id NULL, category_id, vendor_id NULL, amount numeric(14,2) CHECK (> 0), currency, expense_date date, description, receipt_document_id NULL, status (`RECORDED`,`VOID`), void_reason, created_by, created_at। সূচক `(tenant_id, property_id, expense_date)`, `(tenant_id, expense_date)`।
- `ownership_shares` **[V2]**: id, tenant_id, property_id, co_owner_user_id, percent numeric(5,2); প্রতি property তে Σ percent = 100 (অ্যাপ+trigger)।

---

## 8. Maintenance, Notice

- `maintenance_requests`: id, tenant_id, property_id, space_id NULL, renter_id NULL, created_by_user_id, title, description, priority, status DEFAULT 'OPEN', assigned_to NULL, resolved_at, closed_at, created_at/updated_at। সূচক `(tenant_id, property_id, status)`।
- `maintenance_comments`: id, tenant_id, request_id, author_user_id, body, created_at।
- `maintenance_attachments`: id, tenant_id, request_id, document_id।
- `notices`: id, tenant_id, title, body, audience (`ALL`,`PROPERTY`,`SELECTED`), property_id NULL, channels notification_channel[], created_by, sent_at NULL, created_at।
- `notice_recipients`: id, tenant_id, notice_id, renter_id, read_at NULL। `UNIQUE (notice_id, renter_id)`।

## 9. Notification

- `notification_outbox`: id, tenant_id, channel, to_user_id NULL, to_address (ফোন/ইমেইল), template_code, payload jsonb, status notification_status DEFAULT 'QUEUED', attempts int DEFAULT 0, next_attempt_at, provider_message_id NULL, error text NULL, related_type, related_id, created_at, sent_at। সূচক `(status, next_attempt_at)`, `(tenant_id, created_at)`।
- `in_app_notifications`: id, tenant_id, user_id, title, body, link, read_at NULL, created_at। সূচক `(tenant_id, user_id, read_at)`।
- `sms_usage`: tenant_id, month text (`2026-10`), segments_used int; PK (tenant_id, month)।

## 10. Documents ও Import

- `documents`: id, tenant_id, storage_key (`tenants/{tenant_id}/...`), original_name, mime_type, size_bytes, checksum_sha256, uploaded_by, created_at, deleted_at।
- `import_jobs`: id, tenant_id, kind (`PROPERTIES_SPACES`,`RENTERS`), status import_status, file_document_id, total_rows, valid_rows, imported_rows, error_report_document_id NULL, created_by, created_at/updated_at।

## 11. সিস্টেম টেবিল

- `idempotency_keys`: tenant_id, key, endpoint, request_hash, response_status, response_body jsonb, created_at, expires_at; PK (tenant_id, key, endpoint)।
- `audit_logs` (RLS): id, tenant_id, user_id NULL, actor_kind (`USER`,`SYSTEM`,`SUPPORT`), action text (`invoice.void`), entity_type, entity_id, before jsonb, after jsonb, ip inet, request_id, created_at। **Append-only**; সূচক `(tenant_id, created_at DESC)`, `(tenant_id, entity_type, entity_id)`।
- `ai_conversations`, `ai_messages` **[V2]**: id, tenant_id, user_id, … (read-only টুল লগ)।
- `tenant_feature_flags`: tenant_id, flag, enabled। PK (tenant_id, flag)।

---

## 12. Row-Level Security (RLS)

### 12.1 DB রোল

```sql
CREATE ROLE app_migrator  LOGIN NOBYPASSRLS;           -- স্কিমা মালিক, migration চালায়
CREATE ROLE app_user      LOGIN NOSUPERUSER NOBYPASSRLS; -- API
CREATE ROLE app_worker    LOGIN NOSUPERUSER NOBYPASSRLS; -- worker
CREATE ROLE app_platform  LOGIN NOSUPERUSER NOBYPASSRLS; -- platform admin (control-plane টেবিল)
-- app_user/app_worker এ audit_logs, ledger_entries, journals, payments, deposit_transactions এ UPDATE/DELETE নেই (শুধু INSERT/SELECT)
```

### 12.2 Helper ফাংশন

```sql
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;
```
`app.tenant_id` না থাকলে `NULL` → কোনো সারি মেলে না (fail-closed)।

### 12.3 নীতি টেমপ্লেট (প্রতিটি tenant-scoped টেবিলে)

```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE  ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON <t>
  USING      (tenant_id = app_tenant_id())
  WITH CHECK (tenant_id = app_tenant_id());
```
এই টেমপ্লেট নিচের **সব** টেবিলে প্রযোজ্য: `users, sessions, otp_challenges, roles(tenant_id IS NULL OR = tenant), memberships, membership_property_scopes, invites, portfolios, properties, buildings, floors, spaces, renters, renter_documents, agreements, agreement_spaces, charge_types, agreement_charges, rent_escalations, invoice_counters, invoices, invoice_lines, payments, payment_allocations, deposits, deposit_transactions, late_fee_rules, utility_meters, meter_readings, ledger_accounts, journals, ledger_entries, expense_categories, vendors, expenses, ownership_shares, maintenance_*, notices, notice_recipients, notification_outbox, in_app_notifications, sms_usage, documents, import_jobs, idempotency_keys, audit_logs, ai_*, tenant_feature_flags`।

`roles` এর নীতি: `USING (tenant_id IS NULL OR tenant_id = app_tenant_id())`; `WITH CHECK (tenant_id = app_tenant_id())` (system role বদলানো যায় না)।

### 12.4 Property scope (Defense in depth)
RLS শুধু tenant সীমানা সামলায়। property-scope অ্যাপ-লেয়ারে repository ফিল্টারে; বাড়তি নিরাপত্তায় (ঐচ্ছিক, Phase 4):
```sql
CREATE POLICY property_scope ON invoices AS RESTRICTIVE
  USING (current_setting('app.role', true) IN ('OWNER','ACCOUNTANT')
         OR property_id = ANY (string_to_array(current_setting('app.property_ids', true), ',')::uuid[]));
```
Renter এর জন্য `RESTRICTIVE` নীতি: `renter_id = current_setting('app.renter_id')::uuid` (invoices, payments, agreements, maintenance, notices এ)।

### 12.5 Request-এ কনটেক্সট সেট

```ts
// UnitOfWork.run(ctx, fn)
await db.transaction(async (tx) => {
  await tx.execute(sql`SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)`);
  await tx.execute(sql`SELECT set_config('app.user_id',   ${ctx.userId},   true)`);
  await tx.execute(sql`SELECT set_config('app.role',      ${ctx.role},     true)`);
  await tx.execute(sql`SELECT set_config('app.property_ids', ${ctx.propertyIds.join(',')}, true)`);
  if (ctx.renterId) await tx.execute(sql`SELECT set_config('app.renter_id', ${ctx.renterId}, true)`);
  return fn(tx);
});
```
`true` (transaction-local) বাধ্যতামূলক, যাতে connection pool এ context লিক না করে।

### 12.6 কিছু ফাংশন যা RLS এর বাইরে চলে
Login (tenant সনাক্তের পর): `users` লুকআপ আগে `set_config('app.tenant_id', hostTenantId)` দিয়েই হবে; host থেকে আসা tenant_id ছাড়া user খোঁজা নিষেধ।
Platform কাজ `app_platform` রোলে, control-plane টেবিল ও (প্রয়োজনে, support grant থাকলে) নির্দিষ্ট tenant এর context সেট করে।

---

## 13. Auth Flow (ডাটা-স্তর)

### 13.1 Staff লগইন
```
1. Host → tenant_id (registry)             ← tenant_domains JOIN tenants (status=READY)
2. set_config(app.tenant_id)
3. users WHERE (phone|email) AND kind='STAFF' AND is_active
4. bcrypt compare → ব্যর্থ: failed_login_count++, ৫ এ locked_until
5. sessions INSERT (token_hash)           → Set-Cookie __Host-sid (HttpOnly,Secure,SameSite=Lax)
6. memberships + role_permissions লোড → request context
7. audit_logs: auth.login
```

### 13.2 Renter OTP লগইন
```
1. Host → tenant; renters WHERE phone (tenant scope)
2. না পেলে: একই "OTP পাঠানো হয়েছে" বার্তা (enumeration রোধ), কিছু পাঠানো হয় না
3. OTP তৈরি (Redis TTL ৫মি) + otp_challenges মেটা + SMS outbox
4. সঠিক OTP → user (kind=RENTER) থাকলে সেশন, না থাকলে তৈরি করে renters.user_id সংযুক্ত
5. sessions INSERT; role=RENTER; app.renter_id সেট
```

### 13.3 Platform লগইন
`platform_users` → পাসওয়ার্ড → TOTP (বাধ্যতামূলক) → `platform_sessions` (`admin.bashadesk.com` এ আলাদা host-only কুকি)।

### 13.4 Provisioning (idempotent job `provision-tenant`)
```
1. tenants(status=PROVISIONING) + tenant_domains(slug.base) + subscriptions(TRIALING)  [একই transaction]
2. শুধু-একবার seed: system roles বরাদ্দ, charge_types, ledger_accounts, expense_categories, invoice_counters
   (প্রতিটি INSERT ... ON CONFLICT DO NOTHING)
3. owner users + memberships(OWNER) + invite
4. tenant_usage_counters শূন্য
5. tenants.status = READY            ← শেষ ধাপ; ব্যর্থ হলে PROVISION_FAILED, retry নিরাপদ
```

### 13.5 টাকার ফ্লো (লেনদেন সীমা)

**Payment রেকর্ড (একটি DB transaction):**
```
BEGIN; set_config(...)
 1. idempotency_keys চেক/INSERT (আগে থাকলে সংরক্ষিত response ফেরত)
 2. renter, বকেয়া invoices লক: SELECT ... FOR UPDATE ORDER BY due_date
 3. receipt_number বরাদ্দ (counter FOR UPDATE)
 4. payments INSERT
 5. payment_allocations INSERT (invoice অনুযায়ী; বাড়তি → kind='CREDIT', renters.credit_balance += )
 6. invoices.paid_amount, status আপডেট (PARTIALLY_PAID/PAID)
 7. journals + ledger_entries (Dr Cash/bKash, Cr Accounts Receivable [+ Cr Renter Credit])
 8. audit_logs, notification_outbox (রিসিট SMS)
COMMIT
```
**Payment VOID:** নতুন reversal allocation (`reversed_at`), invoice পুনরায় হিসাব, reversing journal, credit_balance সমন্বয়, audit।

### 13.6 Reconciliation কোয়েরি (CI ও নিশাচর job)
```sql
-- (ক) invoice paid_amount ≠ Σ allocations
SELECT i.id FROM invoices i
LEFT JOIN payment_allocations a ON a.invoice_id=i.id AND a.reversed_at IS NULL
GROUP BY i.id HAVING i.paid_amount <> COALESCE(SUM(a.amount),0);
-- (খ) payment.amount ≠ Σ allocations
-- (গ) journal ভারসাম্য
-- (ঘ) renters.credit_balance ≠ Σ CREDIT allocations − ব্যবহৃত
```
প্রতিটি ফলাফল **শূন্য সারি** হতে হবে।

---

## 14. ইনডেক্স ও পারফরম্যান্স নীতি

1. প্রতিটি টেবিলে `tenant_id` কে ইনডেক্সের প্রথম কলাম রাখুন।
2. বড় টেবিল (`invoices`, `payments`, `ledger_entries`, `audit_logs`, `notification_outbox`) ভবিষ্যতে `tenant_id` hash বা `created_at` রেঞ্জ partitioning এর জন্য প্রস্তুত (PK তে partition key যোগ করা যাবে এমন ডিজাইন)।
3. তালিকা কোয়েরি cursor-ভিত্তিক (`(tenant_id, created_at, id)`)।
4. সার্চ: `pg_trgm` (নাম) ও সঠিক মিল (ফোন)।
5. রিপোর্ট কোয়েরি শুরুতে সরাসরি; ধীর হলে materialized view/summary টেবিল (P5)।

## 15. Seed ডাটা (প্রতি deploy তে idempotent)

- Global: `permissions`, `plans` + `plan_entitlements`, `reserved_slugs`।
- প্রতি tenant provisioning এ: system `roles` + `role_permissions` ম্যাপিং, `charge_types`, `ledger_accounts`, `expense_categories`, `invoice_counters`।

### Role → Permission সারাংশ
| Permission | OWNER | MANAGER | ACCOUNTANT | CARETAKER | RENTER |
|---|---|---|---|---|---|
| property.read/write | ✓ | ✓ (scoped) | read | read (scoped) | — |
| space.write | ✓ | ✓ | — | — | — |
| renter.write / agreement.write | ✓ | ✓ | — | — | — |
| invoice.read | ✓ | ✓ | ✓ | — | নিজের |
| invoice.issue / void | ✓ | কনফিগারযোগ্য | ✓ | — | — |
| payment.record | ✓ | কনফিগারযোগ্য | ✓ | — | — |
| payment.void | ✓ | — | ✓ | — | — |
| expense.write, report.read | ✓ | read | ✓ | — | — |
| maintenance.write | ✓ | ✓ | — | ✓ (scoped) | নিজের request |
| notice.send | ✓ | ✓ | — | — | — |
| user.manage, settings.manage, audit.read | ✓ | — | — | — | — |
| import.run | ✓ | ✓ | — | — | — |

## 16. Migration তালিকা (প্রস্তাবিত ক্রম)

`0001_extensions_roles` → `0002_enums` → `0003_control_plane` → `0004_identity_access` → `0005_properties_spaces` → `0006_renters_agreements` → `0007_billing_payments` → `0008_ledger_deposits` → `0009_expenses_maintenance_notices` → `0010_notifications_documents_imports` → `0011_system_audit_idempotency` → `0012_rls_policies` → `0013_immutability_triggers` → `0014_seed_global`।
প্রতিটি migration এর সাথে সংশ্লিষ্ট cross-tenant টেস্ট একই PR এ।
