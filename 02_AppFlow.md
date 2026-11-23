# 02 — AppFlow (Screen-by-Screen State Machine) · Basha Desk

> কোন স্ক্রিন কোথায় যায়, কোন বাটনে কী হয়, এবং error/empty state কেমন হবে। UI ডিজাইন টোকেন `03_UI_Spec.md` তে। ডাটা মডেল `05_Schema.md` তে।

---

## 0. চারটি অ্যাপ সারফেস ও হোস্ট রুটিং

একটাই Next.js অ্যাপ (`apps/web`), middleware `Host` হেডার দেখে সারফেস ঠিক করে।

| সারফেস | হোস্ট | রুট গ্রুপ | ইউজার |
|---|---|---|---|
| **Marketing** | `bashadesk.com`, `www.bashadesk.com` | `(marketing)` | পাবলিক |
| **Platform Admin** | `admin.bashadesk.com` | `(platform)` | Platform Super Admin, Support Agent |
| **Client Workspace** | `{slug}.bashadesk.com` বা custom domain | `(workspace)` | Owner, Manager, Accountant, Caretaker |
| **Renter Portal** | `{slug}.bashadesk.com/portal` | `(portal)` | Renter |

### 0.1 Middleware সিদ্ধান্ত ক্রম

```
Request (Host, Path)
 ├─ Host == bashadesk.com / www        → Marketing
 ├─ Host == admin.bashadesk.com        → Platform (platform session লাগবে)
 ├─ Host == {slug}.bashadesk.com / custom domain
 │     ├─ Registry lookup (tenant_domains → tenant)
 │     │     ├─ না পাওয়া          → /workspace-not-found (404)
 │     │     ├─ status=SUSPENDED   → /suspended
 │     │     ├─ status=PROVISIONING→ /provisioning (auto-refresh)
 │     │     └─ status=READY       → চালিয়ে যাও
 │     ├─ Path শুরু /portal        → Renter Portal
 │     └─ অন্যথায়                  → Workspace
 └─ অন্য Host                        → 404
```

**নিয়ম:** session এর `tenant_id` অবশ্যই Host থেকে পাওয়া `tenant_id` এর সাথে মিলতে হবে। না মিললে session বাতিল ও `/login` এ redirect।

---

## 1. Global State ও কমন প্যাটার্ন

### 1.1 Auth state machine (Staff)

```
ANONYMOUS ──(login সফল)──► AUTHENTICATED
ANONYMOUS ──(login ব্যর্থ ৫ বার)──► LOCKED (১৫ মিনিট)
AUTHENTICATED ──(idle ৩০ মিনিট / logout)──► ANONYMOUS
AUTHENTICATED ──(role নেই)──► FORBIDDEN (403 পেজ)
Platform Admin: AUTHENTICATED ──(MFA বাকি)──► MFA_REQUIRED ──► AUTHENTICATED
```

### 1.2 Renter auth state machine

```
ANONYMOUS ─(মোবাইল নম্বর দেয়)─► OTP_SENT ─(সঠিক OTP)─► AUTHENTICATED
OTP_SENT ─(ভুল ৫ বার / ৫ মিনিট পার)─► ANONYMOUS (নতুন OTP চাই)
OTP পুনরায় পাঠানো: ৬০ সেকেন্ড cooldown, ঘণ্টায় সর্বোচ্চ ৫ বার
```

### 1.3 কমন লোডিং/এরর/খালি নিয়ম

| অবস্থা | আচরণ |
|---|---|
| **Loading** | টেবিল/কার্ডে skeleton; বাটনে spinner + disabled; ৮ সেকেন্ডের বেশি হলে "ধীর হচ্ছে, অপেক্ষা করুন" |
| **Empty** | আইকন + এক লাইন ব্যাখ্যা + প্রধান CTA (নিচে প্রতি স্ক্রিনে নির্দিষ্ট) |
| **Validation error** | ফিল্ডের নিচে লাল বার্তা (বাংলায়), প্রথম ভুল ফিল্ডে focus |
| **401** | `/login` এ redirect, ফেরার পথ `?next=` এ সংরক্ষিত |
| **403** | "এই কাজের অনুমতি নেই" পেজ + ড্যাশবোর্ডে ফেরার বাটন |
| **404** | "পাওয়া যায়নি" পেজ |
| **409 (conflict / duplicate)** | "এটি আগেই করা হয়েছে" টোস্ট + বর্তমান অবস্থা রিফ্রেশ |
| **422** | ফিল্ড-ভিত্তিক error map দেখাও |
| **429** | "একটু পরে চেষ্টা করুন" + কতক্ষণ পর |
| **5xx / network** | টোস্ট + "আবার চেষ্টা করুন" বাটন; ফর্ম ডাটা হারাবে না; error ID দেখাও |
| **Offline** | উপরে ব্যানার "ইন্টারনেট নেই"; পড়া ডাটা cache থেকে; লেখা বন্ধ |
| **Plan limit** | "আপনার প্যাকেজের সীমা পূর্ণ" মোডাল + আপগ্রেড CTA (Owner) বা "Owner কে জানান" (অন্যরা) |
| **Destructive action** | কনফার্ম ডায়ালগ; আর্থিক রেকর্ডে "মোছা" নয়, "বাতিল (VOID)" ও কারণ বাধ্যতামূলক |

### 1.4 নেভিগেশন কাঠামো (Workspace)

- **ডেস্কটপ:** বাঁ সাইডবার (ডায়নামিক, role অনুযায়ী মেনু) + উপরে টপবার (property switcher, সার্চ, ভাষা, থিম, প্রোফাইল)।
- **মোবাইল:** নিচে bottom-nav (ড্যাশবোর্ড, ভাড়াটিয়া, ইনভয়েস, পেমেন্ট, আরও); property switcher উপরে।
- **Property switcher:** "সব property" বা একটি নির্বাচন; Manager/Caretaker এর ক্ষেত্রে শুধু নির্ধারিত property।

---

## 2. Marketing ও Signup

### 2.1 রুট

| রুট | স্ক্রিন |
|---|---|
| `/` | হোম (ভ্যালু, ফিচার, CTA) |
| `/pricing` | প্যাকেজ তুলনা |
| `/signup` | সাইন-আপ উইজার্ড |
| `/login` | "আপনার workspace খুঁজুন" (subdomain লিখে যাওয়া) |
| `/contact` | যোগাযোগ ফর্ম |
| `/terms`, `/privacy` | আইনি পেজ |

### 2.2 Signup wizard state machine

```
STEP_1 প্যাকেজ বাছাই
  └─ [পরবর্তী] ─► STEP_2
STEP_2 আপনার তথ্য (নাম, মোবাইল, ইমেইল, পাসওয়ার্ড)
  ├─ [পরবর্তী] ─ validation OK ─► STEP_3
  └─ validation fail ─► ফিল্ড error
STEP_3 workspace নাম ও subdomain
  ├─ লিখতে লিখতে debounce 400ms এ availability চেক
  │     ├─ available   ✓ সবুজ
  │     ├─ taken       ✗ "নেওয়া হয়ে গেছে" + ৩টি সাজেশন
  │     └─ reserved    ✗ "এই নাম ব্যবহার করা যাবে না"
  └─ [workspace তৈরি করুন] ─► PROVISIONING
PROVISIONING (পোলিং প্রতি ২ সেকেন্ডে)
  ├─ READY ─► সাফল্য পেজ + [workspace এ যান] (লগইন সেশনসহ)
  ├─ FAILED ─► "কিছু ভুল হয়েছে, আমরা জানি" + [আবার চেষ্টা] + সাপোর্ট লিংক
  └─ ৬০ সেকেন্ডের বেশি ─► "ইমেইল/SMS এ জানিয়ে দেব" বার্তা
```

**Subdomain নিয়ম:** ৩-৩০ অক্ষর, `a-z 0-9 -`, শুরু/শেষে `-` নয়, reserved তালিকার বাইরে।
**ফোন যাচাই:** মোবাইল নম্বরে OTP (সাইন-আপ স্প্যাম রোধে)। ব্যর্থ হলে STEP_2 তে ফেরা।

---

## 3. Platform Admin (`admin.bashadesk.com`)

| রুট | স্ক্রিন | মূল বাটন |
|---|---|---|
| `/login` | লগইন + MFA | [লগইন], [কোড যাচাই] |
| `/` | ড্যাশবোর্ড: মোট tenant, সক্রিয়, trial, MRR, provisioning ব্যর্থ | কার্ডে ক্লিক → ফিল্টারসহ তালিকা |
| `/tenants` | tenant তালিকা (সার্চ, ফিল্টার status/plan) | [বিস্তারিত] |
| `/tenants/[id]` | tenant ডিটেইল: প্রোফাইল, domain, plan, ব্যবহার (property/space/SMS), audit | [Suspend], [Reactivate], [প্যাকেজ বদল], [Support access অনুরোধ] |
| `/plans` | প্যাকেজ ও entitlement এডিট | [সংরক্ষণ] |
| `/subscriptions` | সাবস্ক্রিপশন ও platform invoice | [Invoice দেখুন], [Paid চিহ্নিত] |
| `/support` | সাপোর্ট টিকেট ও time-boxed access তালিকা | [অ্যাক্সেস মঞ্জুর/বাতিল] |
| `/team/users` | Platform user তালিকা, invitation ও role assignment | [ইউজার invite], [role assign/change], [নিষ্ক্রিয়] |
| `/team/roles` | Platform role তালিকা ও module/action permission matrix | [role তৈরি], [permission সংরক্ষণ] |
| `/audit` | platform audit log | ফিল্টার |
| `/ops` | provisioning job, failed job রিট্রাই | [Retry] |

### 3.1 Tenant status state machine

```
PROVISIONING ─(job সফল)─► READY
PROVISIONING ─(job ব্যর্থ)─► PROVISION_FAILED ─[Retry]─► PROVISIONING
READY ─[Suspend + কারণ]─► SUSPENDED ─[Reactivate]─► READY
READY / SUSPENDED ─[Cancel]─► CANCELLED ─(৩০ দিন পর, অনুমোদনসহ)─► ARCHIVED
```

- SUSPEND: ইউজার লগইন বন্ধ, hostname নিষ্ক্রিয়, কিন্তু ডাটা অক্ষত।
- ARCHIVED: ডাটা এক্সপোর্ট দেওয়ার পর; subdomain কিছুদিন কাউকে দেওয়া হবে না (takeover রোধ)।

### 3.2 Support access state machine

```
REQUESTED ─(Super Admin অনুমোদন + সময়সীমা)─► ACTIVE ─(সময় শেষ/বাতিল)─► EXPIRED
```

ACTIVE থাকাকালীন Support Agent শুধু অনুমোদিত scope দেখে; ফাইন্যান্সিয়াল ডাটা ডিফল্টে লুকানো; প্রতিটি পদক্ষেপ audit।

### 3.3 Platform team access management

Platform Super Admin platform permission catalog থেকে custom platform role তৈরি/সম্পাদনা করে এবং platform user-কে একটি role assign করে। বিদ্যমান platform user-এর role বদলানো যায়; নতুন platform user-কে নির্ধারিত role-সহ invite করা হয়, invitation গ্রহণে account সক্রিয় হয় এবং MFA enrollment বাধ্যতামূলক। Platform role শুধু `admin.bashadesk.com`-এর platform API-তে কার্যকর; এটি tenant workspace role-এ ব্যবহারযোগ্য নয়। Super Admin role-এর সব-permission ক্ষমতা সংরক্ষিত; শেষ সক্রিয় Super Admin demote/deactivate/delete করা যাবে না। সব পরিবর্তন `platform_audit_logs`-এ লেখা হবে।

**Empty state:** tenant তালিকা খালি → "এখনো কোনো ক্লায়েন্ট নেই" · **Error:** suspend ব্যর্থ হলে কারণসহ টোস্ট।

---

## 4. Client Workspace

### 4.1 রুট ম্যাপ

| রুট | স্ক্রিন | অ্যাক্সেস |
|---|---|---|
| `/login` | লগইন | সবাই |
| `/accept-invite/[token]` | ইনভাইট গ্রহণ, পাসওয়ার্ড সেট | ইনভাইটেড |
| `/onboarding` | প্রথমবার গাইডেড সেটআপ | Owner |
| `/dashboard` | ড্যাশবোর্ড | সবাই (role ভিত্তিক কার্ড) |
| `/properties` | property তালিকা | Owner, Manager, Accountant |
| `/properties/new` | property তৈরি | Owner, Manager |
| `/properties/[id]` | property ডিটেইল (বিল্ডিং/ফ্লোর/space ট্রি) | scoped |
| `/spaces` | সব space (ফিল্টার type/status) | scoped |
| `/spaces/[id]` | space ডিটেইল ও ইতিহাস | scoped |
| `/renters` | ভাড়াটিয়া তালিকা | scoped |
| `/renters/new`, `/renters/[id]` | তৈরি/ডিটেইল | scoped |
| `/agreements` | agreement তালিকা | scoped |
| `/agreements/new`, `/agreements/[id]` | উইজার্ড/ডিটেইল | scoped |
| `/invoices` | ইনভয়েস তালিকা | Owner, Accountant, Manager |
| `/invoices/[id]` | ইনভয়েস ডিটেইল | " |
| `/payments` | পেমেন্ট তালিকা | " |
| `/payments/new` | পেমেন্ট রেকর্ড | Owner, Accountant, Manager(পারমিশন থাকলে) |
| `/arrears` | বকেয়া ও aging | " |
| `/deposits` | ডিপোজিট | " |
| `/expenses` | খরচ | Owner, Accountant |
| `/reports` | রিপোর্ট সূচি | Owner, Accountant |
| `/maintenance` | request বোর্ড | সবাই scoped |
| `/notices` | নোটিশ | Owner, Manager |
| `/imports` | Excel import | Owner, Manager |
| `/settings/profile` | প্রোফাইল, ভাষা, থিম | সবাই |
| `/settings/workspace` | নাম, লোগো, ব্র্যান্ডিং | Owner |
| `/settings/users` | ইউজার, role, property scope | Owner |
| `/settings/roles` | Tenant-local role তৈরি/ক্লোন, module/action permission ও property scope policy | Owner |
| `/settings/billing-config` | charge type, late-fee, receipt নম্বর ফরম্যাট | Owner, Accountant |
| `/settings/subscription` | প্যাকেজ ও ব্যবহার | Owner |
| `/settings/domains` | custom domain **[V2]** | Owner |
| `/audit` | audit log | Owner |

### 4.1.1 Tenant role ও user management flow

1. Owner system role-গুলোর permission দেখে; system role সরাসরি বদলাতে পারে না।
2. Owner custom role তৈরি করে, চাইলে system role clone করে, এবং tenant permission catalog থেকে module/action (যেমন `invoice.view`, `payment.create`, `user.archive`) বেছে নেয়।
3. Owner existing tenant member-কে role বদলে দিতে পারে; নতুন ব্যক্তি হলে email/phone-এ invite পাঠিয়ে role ও property scope আগে নির্ধারণ করে। Invite গ্রহণে নতুন tenant user তৈরি হয়; একই tenant-এর verified existing user হলে সেই user-কে membership-এ যুক্ত করা যায়।
4. Role ও membership শুধু ওই tenant-এ প্রযোজ্য। অন্য tenant-এর user/role দেখা বা assign করা যাবে না। Owner নিজের চেয়ে বেশি ক্ষমতাসম্পন্ন role কাউকে দিতে পারবে না; শেষ Owner-কে demote/deactivate করা যাবে না। সব পরিবর্তন tenant audit log-এ থাকবে।

### 4.2 Onboarding (প্রথমবার, Owner)

```
ONB_1 স্বাগত ─[শুরু]─► ONB_2
ONB_2 প্রথম property (নাম, ঠিকানা) ─[সংরক্ষণ]─► ONB_3     [পরে করব] → ড্যাশবোর্ড
ONB_3 ইউনিট যোগ: (ক) হাতে (খ) Excel import ─► ONB_4
ONB_4 প্রথম ভাড়াটিয়া ও agreement ─► ONB_5               [এড়িয়ে যান] → ড্যাশবোর্ড
ONB_5 প্রথম ইনভয়েস তৈরি ─► ড্যাশবোর্ড (✓ Activation সম্পন্ন)
```

প্রগ্রেস বার ড্যাশবোর্ডে চেকলিস্ট হিসেবে থাকে, যতক্ষণ না সম্পূর্ণ।

### 4.3 Dashboard

কার্ড: এই মাসের invoiced / collected / বকেয়া · occupancy (OCCUPIED/মোট) · আজ বা সপ্তাহের due · খোলা maintenance · সাম্প্রতিক পেমেন্ট। সবগুলো ক্লিক করলে ফিল্টার করা তালিকায় যায়।
**Empty:** property নেই → "প্রথম property যোগ করুন" CTA। **Error:** কার্ডভিত্তিক পুনরায় চেষ্টা, পুরো পেজ ভাঙবে না।

### 4.4 Property / Space

**Property ট্রি স্ক্রিন:** বাঁ দিকে Building → Floor ট্রি, ডানে space গ্রিড (রঙ status অনুযায়ী)।
বাটন: [+ Building], [+ Floor], [+ Space], [Excel import], [সম্পাদনা], [আর্কাইভ]।

```
Space status:
VACANT ─(agreement ACTIVE)─► OCCUPIED ─(agreement ENDED)─► VACANT
VACANT ─[Reserve]─► RESERVED ─(agreement ACTIVE)─► OCCUPIED
RESERVED ─[Release]─► VACANT
ANY(OCCUPIED ছাড়া) ─[মেইনটেন্যান্সে]─► MAINTENANCE ─[শেষ]─► VACANT
```

- OCCUPIED space আর্কাইভ বা মোছা যাবে না (error: "চলমান agreement আছে")।
- প্যাকেজ লিমিট ছাড়ালে [+ Space] তে plan-limit মোডাল।
- **Empty:** "এই property তে কোনো ইউনিট নেই" + [+ Space] ও [Excel import]।

### 4.5 Renter

তালিকা কলাম: নাম, ফোন, space(s), বর্তমান বকেয়া, status। সার্চ: নাম/ফোন।
Renter ডিটেইল ট্যাব: **প্রোফাইল · Agreement · Invoice ও পেমেন্ট · ডকুমেন্ট · Maintenance**।
বাটন: [সম্পাদনা], [ডকুমেন্ট আপলোড], [নতুন Agreement], [পোর্টাল ইনভাইট SMS পাঠান]।
ফোন নম্বর tenant এর ভেতরে ইউনিক। duplicate হলে 409 "এই নম্বর আগেই আছে" + বিদ্যমান renter লিংক।
**Empty:** "কোনো ভাড়াটিয়া নেই" + [ভাড়াটিয়া যোগ করুন]।

### 4.6 Agreement wizard ও state machine

```
STEP_1 Renter বাছাই/নতুন
STEP_2 Space(s) বাছাই (শুধু VACANT/RESERVED দেখায়)
STEP_3 শর্ত: শুরু, শেষ, billing day, ভাড়া, সার্ভিস চার্জ, ডিপোজিট
STEP_4 Recurring charge যোগ (গ্যাস, পানি...)
STEP_5 রিভিউ ─[ড্রাফট সংরক্ষণ]─► DRAFT   অথবা   [সক্রিয় করুন]─► ACTIVE
```

```
DRAFT ─[Activate]─► ACTIVE ─[শেষের নোটিশ]─► ENDING ─[Move-out সম্পন্ন]─► ENDED
DRAFT ─[Cancel]─► CANCELLED
ACTIVE ─[Cancel + কারণ, কোনো invoice না থাকলে]─► CANCELLED
```

- Activate সময়: space এখনো খালি কি না চেক (concurrency এ 409), ডিপোজিট রেকর্ড তৈরি, space → OCCUPIED, প্রথম invoice নিয়ম অনুযায়ী (পুরো/অনুপাতিক) সময়সূচিতে।
- ENDED এ: ডিপোজিট adjust/refund স্ক্রিন, চূড়ান্ত বকেয়া সারাংশ, space → VACANT।
- ইতিমধ্যে invoice আছে এমন agreement এর ভাড়া সরাসরি বদলানো যায় না; নতুন তারিখ থেকে কার্যকর "সংশোধন" বানাতে হবে।

### 4.7 Invoice

```
DRAFT ─[Issue]─► ISSUED ─(আংশিক allocation)─► PARTIALLY_PAID ─(পূর্ণ)─► PAID
ISSUED ─(due date পার, বকেয়া আছে)─► OVERDUE ─(allocation)─► PARTIALLY_PAID / PAID
ISSUED / PARTIALLY_PAID / OVERDUE ─[VOID + কারণ]─► VOID   (allocation থাকলে আগে reversal)
```

- অটো তৈরি invoice সরাসরি ISSUED; ম্যানুয়াল draft সম্পাদনাযোগ্য।
- ISSUED এর পরে lines সম্পাদনা **নিষিদ্ধ**; ভুল হলে VOID + নতুন invoice বা adjustment line।
- বাটন (ডিটেইল): [পেমেন্ট রেকর্ড], [PDF ডাউনলোড], [SMS রিমাইন্ডার], [VOID]।
- তালিকা ফিল্টার: status, property, মাস, renter। **Empty:** "এই ফিল্টারে কোনো invoice নেই" + ফিল্টার রিসেট।

### 4.8 Payment রেকর্ড ফ্লো

```
FORM: renter বাছাই → (বকেয়া invoice তালিকা দেখায়)
      পরিমাণ, method, reference/trx id, তারিখ, নোট
      allocation: [অটো (পুরনো আগে)] বা [হাতে বণ্টন]
  ├─ validation fail → ফিল্ড error
  ├─ [সংরক্ষণ] → idempotency key সহ POST
  │     ├─ সফল → রিসিট পেজ (PDF, SMS অপশন)
  │     ├─ 409 duplicate key → "আগেই রেকর্ড হয়েছে" + বিদ্যমান রিসিট লিংক
  │     └─ নেটওয়ার্ক ব্যর্থ → ফর্ম রাখো, একই key দিয়ে retry
```

- পরিমাণ বকেয়ার চেয়ে বেশি হলে বাড়তি অংশ **credit balance** (অগ্রিম) হিসেবে যাবে, কনফার্ম মোডালসহ।
- bKash/Nagad/Bank method এ reference বাধ্যতামূলক; একই method+reference tenant এর ভেতরে duplicate সতর্কতা।
- রেকর্ডকৃত পেমেন্ট সম্পাদনা নয়; [VOID + কারণ] দিলে reversal entry হয় ও allocation ফেরত।

### 4.9 Arrears, Deposit, Expense, Report

- **Arrears:** টেবিল aging বাকেটসহ; [রিমাইন্ডার পাঠান] (একক/বাল্ক) → SMS কোটা প্রিভিউ ও কনফার্ম।
- **Deposit:** agreement অনুযায়ী balance; [Adjust], [Refund] (কারণ ও পরিমাণ সহ), সব append-only।
- **Expense:** ফর্ম (তারিখ, category, property, পরিমাণ, vendor, রসিদ ছবি); [বাতিল] soft।
- **Reports:** তারিখ রেঞ্জ + property ফিল্টার; [Excel], [PDF]। বড় রিপোর্ট async: "প্রস্তুত হলে জানানো হবে" → নোটিফিকেশন লিংক।

### 4.10 Maintenance

```
OPEN ─[অ্যাসাইন/শুরু]─► IN_PROGRESS ─[সমাধান]─► RESOLVED ─(renter নিশ্চিত/৭ দিন)─► CLOSED
RESOLVED ─(renter বলে সমাধান হয়নি)─► IN_PROGRESS
```

Kanban বোর্ড ও তালিকা; কমেন্ট থ্রেড; ছবি সংযুক্তি।

### 4.11 Notice

ফর্ম: শিরোনাম, বার্তা, প্রাপক (সব / property / নির্বাচিত), চ্যানেল (in-app, SMS)। প্রিভিউ ও SMS খরচ কোটা দেখায়। [পাঠান] → job → ডেলিভারি স্ট্যাটাস তালিকা (queued/sent/failed)।

### 4.12 Import ফ্লো

```
UPLOAD (xlsx/csv, ≤5MB) ─► MAPPING (কলাম মিলানো) ─► VALIDATE (প্রিভিউ, ভুল সারি চিহ্নিত)
  ├─ [ভুল সারি ডাউনলোড]
  └─ [ভ্যালিড সারি import] ─► IMPORTING (job) ─► DONE (সারাংশ: সফল/ব্যর্থ)
```

Template ফাইল ডাউনলোড (বাংলা কলাম হেডার সহ)। plan limit ছাড়ালে preview তে সতর্কতা ও import ব্লক।

### 4.13 Settings ও ইউজার ম্যানেজমেন্ট

- Owner permission catalog থেকে tenant-local custom role তৈরি/clone করে module/action permission বেছে নেয়; system role সরাসরি edit করা যায় না।
- Existing tenant member-কে role change/assign করা যায়; নতুন user invite: ফোন/ইমেইল + role + property scope → SMS/email লিংক (৭২ ঘণ্টা মেয়াদ)।
- ইনভাইট state: `PENDING → ACCEPTED / EXPIRED / REVOKED`।
- ইউজার নিষ্ক্রিয় করলে সব সেশন বাতিল।
- সর্বশেষ সক্রিয় Owner-কে demote বা নিষ্ক্রিয় করা যায় না।

---

## 5. Renter Portal (`/portal`)

| রুট | স্ক্রিন | বিবরণ |
|---|---|---|
| `/portal/login` | মোবাইল + OTP | §1.2 |
| `/portal` | হোম | বর্তমান বকেয়া, পরবর্তী due, সাম্প্রতিক পেমেন্ট |
| `/portal/invoices` | ইনভয়েস তালিকা ও ডিটেইল | PDF ডাউনলোড |
| `/portal/payments` | মাসওয়ারি পেমেন্ট ইতিহাস | রিসিট ডাউনলোড, বছর/মাস ফিল্টার |
| `/portal/agreement` | চুক্তি ও শর্ত | PDF [V2] |
| `/portal/notices` | নোটিশ | unread ব্যাজ |
| `/portal/requests` | maintenance request ও নতুন তৈরি | ছবি সংযুক্তি |
| `/portal/profile` | প্রোফাইল, ভাষা | |
| `/portal/pay` | অনলাইন পেমেন্ট **[V2]** | MVP তে "ভাড়া মালিককে দিন, তিনি রেকর্ড করবেন" তথ্য দেখায় |

**Empty:** invoice নেই → "এখনো কোনো ইনভয়েস নেই"। **Error:** একাধিক agreement থাকলে স্পেস সুইচার। Renter সব সময় শুধু নিজের ডাটা পায়।

---

## 6. Notification flow

```
ঘটনা (invoice issued / overdue / payment recorded / notice / OTP)
  └─► notification_outbox তে সারি (একই DB transaction এ)
        └─► worker তুলে নেয় ─► channel বাছাই (in-app / SMS / email)
              ├─ SMS কোটা শেষ ─► SKIPPED_QUOTA + Owner কে in-app সতর্কতা
              ├─ provider সফল ─► SENT ─(DLR)─► DELIVERED
              └─ ব্যর্থ ─► retry (exponential, ৫ বার) ─► FAILED
```

## 7. Background job flow

| Job | সময়সূচি | আচরণ |
|---|---|---|
| `generate-monthly-invoices` | প্রতিদিন ০২:০০ Asia/Dhaka (billing day মিললে) | agreement+মাস ইউনিক constraint দিয়ে idempotent |
| `mark-overdue` | প্রতিদিন ০১:০০ | due date পার invoice → OVERDUE |
| `send-reminders` | কনফিগার অনুযায়ী | কোটা মেনে |
| `provision-tenant` | সাইন-আপে | idempotent, ধাপভিত্তিক |
| `process-import` | আপলোডে | সারি-ভিত্তিক ফলাফল |
| `generate-report` | অনুরোধে | বড় রিপোর্ট |
| `expire-invites-otps` | ঘণ্টায় | মেয়াদোত্তীর্ণ পরিষ্কার |
| `cleanup-archived` | সাপ্তাহিক | অনুমোদিত ARCHIVED |

## 8. বাটন অ্যাকশনের সাধারণ নিয়ম

1. প্রতিটি mutating বাটন submit এর সময় disabled + spinner (ডাবল ক্লিক রোধ)।
2. আর্থিক বা অপরিবর্তনীয় অ্যাকশনে কনফার্ম ডায়ালগ ও কারণ ফিল্ড।
3. সফলতায় টোস্ট (৪ সেকেন্ড), ব্যর্থতায় টোস্ট যা নিজে মিলায় না (ম্যানুয়ালি বন্ধ করতে হবে)।
4. ফর্মে অসংরক্ষিত পরিবর্তন রেখে চলে যেতে চাইলে সতর্কতা।
5. সব তালিকায়: সার্চ, ফিল্টার, সর্টিং, `page`/`pageSize` পেজিনেশন (default ২০, সর্বোচ্চ ১০০), URL এ ফিল্টার স্টেট সংরক্ষিত। বড় ডেটাসেটে cursor pagination অতিরিক্তভাবে ব্যবহার করা যায়।
