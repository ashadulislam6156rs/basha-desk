# Basha Desk (বাসা ডেস্ক) — সফটওয়্যার রিকোয়ারমেন্টস স্পেসিফিকেশন (SRS)

**সংস্করণ 2.1 (Final Baseline)** · **তারিখ:** ২৮ অক্টোবর ২০২৬ · **লক্ষ্য বাজার:** বাংলাদেশ (প্রথমে), পরে আন্তর্জাতিক · **গোপনীয়** — প্রোডাক্ট ও ইঞ্জিনিয়ারিং ওয়ার্কিং ডকুমেন্ট
**ব্র্যান্ড:** Basha Desk — Property & Rental Management · লোগো: `docs/brand/basha_desk_logo.png`

> SRS বলে সিস্টেম **কী করবে** ও কোন মান পূরণ করতে হবে। SRA (`SRA.md`) বলে **কীভাবে** বানানো হবে। এই ফাইল প্রযুক্তি-নিরপেক্ষ আনুষ্ঠানিক baseline।
> বিস্তারিত requirement টেবিল (সব FR/NFR) `01_PRD.md §6, §8` এ **একমাত্র উৎস** হিসেবে আছে; এখানে পুনরাবৃত্তি না করে ID দিয়ে রেফার করা হয়েছে, যাতে দুই জায়গায় দুই রকম না হয়।

---

## ডকুমেন্ট নিয়ন্ত্রণ

| ফিল্ড | মান |
|---|---|
| মালিক | Product Owner / Engineering Lead |
| স্ট্যাটাস | Final Baseline — pilot ফিডব্যাক অনুযায়ী হালনাগাদ হবে |
| সংস্করণ | 2.1 (v2.0 এর উপর: ব্র্যান্ড Basha Desk, ডকুমেন্ট সম্পূর্ণকরণ) |
| পাঠক | Product, Engineering, QA, Security, Operations, Support, Business |
| সম্পর্কিত | `SRA.md`, `01_PRD.md` … `06_Plan.md` |
| পূর্ববর্তী | SSR v1.0 (এই SRS সেটিকে প্রতিস্থাপন করে) |

**অগ্রাধিকার ট্যাগ:** **[MVP]** প্রথম রিলিজে আবশ্যক · **[V2]** pilot ফিডব্যাকের পর · **[Future]** এখন বানানো হবে না কিন্তু ডিজাইনে জায়গা থাকবে।

> এটি working baseline। customer discovery, স্থানীয় আইনি পর্যালোচনা, payment provider অনুমোদন ও threat modelling এর বিকল্প নয়। সংখ্যাগুলো টার্গেট; বাজেট ও pilot ডাটা দিয়ে যাচাই করতে হবে।

---

## ১. ভূমিকা ও প্রোডাক্ট ভিশন

### ১.১ প্রোডাক্ট কী
Basha Desk একটি multi-tenant B2B SaaS প্ল্যাটফর্ম। বাড়িওয়ালা ও প্রপার্টি কোম্পানির কাছে আমরা প্যাকেজ/সাবস্ক্রিপশনে সফটওয়্যার-সেবা বিক্রি করি। সাবস্ক্রাইব করলে সিস্টেম তার জন্য আলাদা workspace তৈরি করে (নিজস্ব লগইন, ডাটা এবং প্যাকেজ অনুযায়ী নিজস্ব সাবডোমেইন ও ব্র্যান্ডিং)। ক্লায়েন্টের মনে হবে এটা তার আলাদা সফটওয়্যার, ভেতরে একটাই কোডবেস ও একটাই deployment।

ক্লায়েন্ট বিভিন্ন উপজেলা/দেশে ছড়ানো একাধিক বাড়ি, বিল্ডিং, ফ্লোর ও ভাড়ার ইউনিট (ফ্ল্যাট, দোকান, পার্কিং, রুম, ব্যাচেলর সিট) ম্যানেজ করে; মাসিক ভাড়া ও অন্যান্য চার্জ হিসাব করে; ভাড়াটিয়াকে রিসিট দেয়; ভাড়াটিয়ার জন্য আলাদা লগইন দেয় যাতে সে নিজের মাসওয়ারি পেমেন্ট দেখতে ও ডাউনলোড করতে পারে; এবং ভবিষ্যতে ভাড়াটিয়া প্রোফাইল থেকেই অনলাইনে ভাড়া দিতে পারবে।

### ১.২ যে সমস্যাগুলো সমাধান হবে
1. ভাড়ার হিসাব খাতা/Excel/মুখে থাকায় বকেয়া, অগ্রিম ও ডিপোজিট নিয়ে বিরোধ।
2. একাধিক বাড়ি ও ধরনের ইউনিটের একত্রিত আয়-ব্যয়ের ছবি না পাওয়া।
3. ভাড়াটিয়ার কাছে স্বচ্ছ রিসিট ও পেমেন্ট ইতিহাস না থাকা।
4. ইউটিলিটি বিল, দেরির জরিমানা ও বার্ষিক ভাড়া বৃদ্ধি হাতে করতে সময় ও ভুল।

### ১.৩ লক্ষ্য ও সাফল্যের মাপকাঠি

| লক্ষ্য | মাপার উপায় | প্রাথমিক টার্গেট |
|---|---|---|
| Activation | নতুন workspace এ প্রথম property ও প্রথম invoice | pilot এ baseline; guided first-value flow |
| আর্থিক নির্ভুলতা | invoice, allocation, ledger reconciliation টেস্ট | release acceptance এ ০ অব্যাখ্যাত গরমিল |
| Tenant isolation | automated cross-tenant access টেস্ট | critical টেস্টে ০ অননুমোদিত read/write |
| Availability | production uptime monitoring | SLA ঘোষণা মাপা সক্ষমতার পর |
| Support | ticket resolution time, AI escalation rate | pilot baseline, প্রতি রিলিজে উন্নতি |
| Retention/Revenue | paid conversion, renewal, churn, MRR | design partner দিয়ে যাচাই |

### ১.৪ শব্দকোষ (Glossary)

| শব্দ | অর্থ |
|---|---|
| **Tenant** | আমাদের SaaS ক্লায়েন্ট (বাড়ির মালিক/প্রপার্টি কোম্পানি) — **সবসময়** এই অর্থে |
| **Renter** | ভাড়াটিয়া/occupant — কখনো "tenant" নয় |
| **Platform Owner** | আমরা (Basha Desk) |
| **Workspace** | Tenant এর logical আলাদা সফটওয়্যার-পরিসর |
| **Space** | ভাড়াযোগ্য ইউনিট |
| **Agreement** | Renter ও Space(s) এর ভাড়ার চুক্তি |
| **Invoice** | নির্দিষ্ট সময়ের পাওনার দাবি |
| **Payment** | প্রাপ্ত টাকার রেকর্ড (invoice থেকে আলাদা) |
| **Allocation** | কোন payment এর কত টাকা কোন invoice এ বণ্টিত |
| **Tenant Registry** | কোন tenant কোন hostname/DB তে, তার নিয়ন্ত্রণ-তালিকা |
| **RLS** | PostgreSQL Row-Level Security |
| **Entitlement** | প্যাকেজ অনুযায়ী সীমা/সুবিধা |

---

## ২. ব্যবসায়িক মডেল

### ২.১ তিন স্তর
Platform Owner (Basha Desk) → Tenant (ক্লায়েন্ট) → Renter (ভাড়াটিয়া)।
**নামকরণ নিয়ম:** কোড, DB ও ডকুমেন্টে Tenant = SaaS ক্লায়েন্ট; ভাড়াটিয়া সবসময় Renter। বাংলা UI তে "ক্লায়েন্ট" ও "ভাড়াটিয়া"।

### ২.২ দুটি আলাদা টাকার প্রবাহ

| প্রবাহ | কে কাকে | কীসের জন্য | আয় কার |
|---|---|---|---|
| ১. SaaS Subscription | Tenant → Platform | প্যাকেজ ফি | Platform এর |
| ২. Rental Collection | Renter → Tenant | ভাড়া, সার্ভিস চার্জ, ইউটিলিটি | Tenant এর |

দুটি আলাদা bounded domain: আলাদা টেবিল, রিপোর্ট ও লজিক; কখনো মেশানো যাবে না।

**নিয়ন্ত্রক সতর্কতা (প্রবাহ ২):** Renter এর টাকা আমাদের অ্যাকাউন্টে এসে Tenant কে গেলে আমরা কার্যত payment service provider হয়ে যেতে পারি, যার জন্য বাংলাদেশে নিয়ন্ত্রক অনুমোদন লাগতে পারে। নীতি:
- **[MVP]** Tenant নিজে টাকা নেয় (ক্যাশ, bKash/Nagad ট্রানজেকশন, ব্যাংক রেফারেন্স) এবং সিস্টেমে payment record করে।
- **[V2]** অনলাইন পেমেন্টে টাকা সরাসরি Tenant এর নিজস্ব merchant অ্যাকাউন্টে যাবে; আমরা শুধু রেকর্ড ও যাচাই করব।
- আইনজীবী ও payment provider লিখিতভাবে নিশ্চিত না করলে আমরা ভাড়ার টাকা ধারণ বা settle করব না।

### ২.৩ প্যাকেজ কাঠামো (প্রাথমিক, pilot এ যাচাইযোগ্য)
দাম ইউনিট সংখ্যা ও SMS ব্যবহারের ভিত্তিতে। সব লিমিট ব্যাকএন্ডে enforce হবে; শুধু UI তে লুকানো যথেষ্ট নয়।

| প্যাকেজ | লক্ষ্য গ্রাহক | লিমিট (উদাহরণ) | বিশেষ সুবিধা |
|---|---|---|---|
| Starter | ছোট বাড়িওয়ালা | ১ property, ~২০ ইউনিট, ১ ইউজার | মূল ফিচার, shared DB, `name.bashadesk.com` |
| Pro | মাঝারি মালিক | ~১০ property, ~১০০ ইউনিট, স্টাফ ইউজার | SMS কোটা, রিপোর্ট, ইউটিলিটি বিল, Excel import |
| Business | প্রপার্টি কোম্পানি | বেশি/সীমাহীন property | Custom domain, ব্র্যান্ডিং, accounting রিপোর্ট, API/export |
| Enterprise | বড় প্রতিষ্ঠান | চুক্তি অনুযায়ী | Dedicated database, অগ্রাধিকার সাপোর্ট, কাস্টম SLA (মাপার পর) |

### ২.৪ "আলাদা সফটওয়্যার" এর প্রকৃত অর্থ
Tenant পায় logically আলাদা workspace: আলাদা লগইন, ডাটা, ব্র্যান্ডিং ও ঠিকানা। আমরা প্রতি Tenant এর জন্য আলাদা কোড কপি বা সার্ভার deploy করব না। ডাটাবেসে ডিফল্ট shared pool (কড়া isolation সহ); প্রিমিয়াম/Enterprise এর জন্য dedicated database। দুটোই tenant registry দিয়ে নিয়ন্ত্রিত। কারণ বহু ক্লায়েন্টের জন্য প্রতিটি আপডেট, migration ও backup আলাদাভাবে চালানো ছোট টিমের পক্ষে অসম্ভব।

---

## ৩. Scope

### ৩.১ Scope এর ভেতরে
- **Platform Admin:** client onboarding, provisioning status, প্যাকেজ ও সাবস্ক্রিপশন, সাপোর্ট অপারেশন, platform রিপোর্ট।
- **Client Workspace:** property hierarchy, rentable space, availability, agreement, recurring charge, invoice, payment, deposit, expense, রিপোর্ট।
- **Renter Portal:** balance, invoice, receipt, agreement, notice, মাসওয়ারি পেমেন্ট ইতিহাস ডাউনলোড, maintenance request, এবং **[V2]** অনলাইন পেমেন্ট।
- Identity, membership, role, permission, audit trail, notification (SMS/email/in-app), document storage।
- Subdomain, wildcard SSL এবং (Business+) custom domain।
- Payment gateway integration (provider abstraction সহ), signed webhook যাচাই ও reconciliation **[V2]**।
- AI: FAQ সাপোর্ট ও ticket escalation, পরে permission-checked read-only business query।
- Hybrid multi-tenancy, database routing, versioned migration, backup/restore ও monitoring।
- Localization: বাংলা ও English UI, timezone, currency, তারিখ/সংখ্যার ফরম্যাট।
- Excel থেকে ডাটা import ও ডাটা export।

### ৩.২ প্রথম রিলিজের বাইরে
Public rental marketplace; সব দেশের পূর্ণ ট্যাক্স ও accounting compliance; AI দিয়ে financial mutation (আলাদা confirmed workflow ছাড়া); microservices, প্রতি ক্লায়েন্টে আলাদা DB সার্ভার বা customer-managed infrastructure ডিফল্ট হিসেবে; ভাড়াটিয়ার ঝুঁকি নিয়ে predictive সিদ্ধান্ত বা মানুষের পর্যালোচনা ছাড়া স্বয়ংক্রিয় সিদ্ধান্ত; নির্দিষ্ট uptime SLA, নিয়ন্ত্রক সনদ বা trademark ছাড়পত্রের প্রতিশ্রুতি (যাচাইয়ের আগে); ভাড়ার টাকা প্ল্যাটফর্মের মাধ্যমে ধারণ বা settle করা (নিয়ন্ত্রক অনুমোদন ছাড়া)।

---

## ৪. ইউজার শ্রেণি

| ইউজার | প্রধান দায়িত্ব | সাধারণ পারমিশন |
|---|---|---|
| Platform Super Admin | প্ল্যাটফর্ম পরিচালনা, client provisioning | Platform-level tenant, plan ও অপারেশন নিয়ন্ত্রণ; **MFA আবশ্যক** |
| Platform Support Agent | কাস্টমার টিকেট সমাধান | সাপোর্ট মেটাডেটা + স্পষ্টভাবে দেওয়া সময়সীমাযুক্ত অ্যাক্সেস; ডিফল্টে ফাইন্যান্সিয়াল ডাটা দেখতে পারবে না |
| Client Owner | workspace এর মালিক, ব্যবসা কনফিগার | নিজের workspace এর সেটিংস, ইউজার, property, ফাইন্যান্স ও রিপোর্ট |
| Property Manager | নির্ধারিত property চালানো | Property-scoped অপারেশন; ফাইন্যান্স পারমিশন কনফিগারযোগ্য |
| Accountant / Finance | invoice, payment, expense, রিপোর্ট | ফাইন্যান্স-নির্দিষ্ট অ্যাক্সেস ও অনুমোদন |
| Property Staff / Caretaker | দৈনন্দিন কাজ, মেইনটেন্যান্স | সীমিত property/space/maintenance পারমিশন |
| Co-owner / Investor **[V2]** | মালিকানা অংশের আয়-ব্যয় দেখা | শুধু নিজের অংশের read-only রিপোর্ট |
| Renter / Occupant | নিজের ভাড়া দেখা ও পরিশোধ | শুধু নিজের agreement, invoice, payment, document ও request |
| System / Worker | নির্ধারিত ও async কাজ | সংকীর্ণ পারমিশনের service identity; সব কাজ audit যোগ্য |

পারমিশন ম্যাট্রিক্স: `05_Schema.md §15`।

---

## ৫. Functional Requirements (সূচি)

পূর্ণ টেবিল ও অগ্রাধিকার: **`01_PRD.md §6`**। এখানে মডিউল-ভিত্তিক সূচি:

| মডিউল | ID পরিসর | সারসংক্ষেপ |
|---|---|---|
| Tenant ও Onboarding | FR-001 … 007 | signup, provisioning, reserved subdomain, suspend, custom domain [V2], dedicated DB [Future] |
| Identity/Role/Permission | FR-010 … 014 | staff লগইন, renter OTP, RBAC + property scope, audit, ইনভাইট |
| Property ও Space | FR-020 … 025 | hierarchy, space type/status, লোকেশন, Excel import, লিমিট enforce |
| Renter ও Agreement | FR-030 … 037 | প্রোফাইল, agreement lifecycle, recurring charge, rent escalation [V2], move-in/out [V2], PDF/সই [V2], থানা ফরম [V2] |
| Billing | FR-040 … 051 | অটো invoice, status, payment record, allocation, partial/advance, রিসিট, বকেয়া, late fee [V2], deposit, ইউটিলিটি [V2], immutability, idempotency |
| Expense ও Reports | FR-060 … 064 | খরচ, collection/aging/নিট লাভ, মুনাফা ভাগ [V2], export |
| Maintenance ও Notice | FR-070 … 073 | request, status, vendor [V2], নোটিশ |
| Notification | FR-080 … 083 | SMS/in-app, কোটা, provider abstraction, WhatsApp [Future] |
| Subscription | FR-090 … 093 | প্যাকেজ, trial/status, platform invoice, প্যাকেজ বদল [V2] |
| AI ও অন্যান্য | FR-100 … 106 | FAQ [V2], read-only query [Future], financial mutation নিষিদ্ধ, marketplace [Future], PWA, i18n, online payment [V2] |

### ৫.১ মূল ব্যবসায়িক নিয়ম (Business Rules)

| ID | নিয়ম |
|---|---|
| BR-01 | একটি Space এর একই সময়ে একটির বেশি ACTIVE/ENDING agreement থাকতে পারবে না (DB স্তরে overlap constraint) |
| BR-02 | Invoice ISSUE এর পর তার amount/lines বদলানো যাবে না; সংশোধন = VOID + নতুন invoice/adjustment |
| BR-03 | Payment রেকর্ড অপরিবর্তনীয়; ভুল হলে VOID (reversal) |
| BR-04 | Payment যত টাকা, allocation এর যোগফল তত হতে হবে; বাড়তি অংশ Renter credit (অগ্রিম) |
| BR-05 | একই agreement ও billing period এ একটির বেশি অটো invoice হবে না |
| BR-06 | Invoice এর paid_amount কখনো total ছাড়াবে না |
| BR-07 | প্যাকেজ লিমিট (property/space/user/SMS) ব্যাকএন্ডে enforce; ছাড়ালে স্পষ্ট এরর |
| BR-08 | OCCUPIED space আর্কাইভ/মোছা যাবে না |
| BR-09 | Tenant নিজের ভেতরে Renter ফোন নম্বর ইউনিক |
| BR-10 | Owner শেষ Owner হিসেবে নিজেকে নামাতে/নিষ্ক্রিয় করতে পারবে না |
| BR-11 | Platform subscription invoice ও Tenant এর ভাড়ার invoice সম্পূর্ণ আলাদা |
| BR-12 | Suspended tenant এ লগইন ও hostname বন্ধ, ডাটা অক্ষত |
| BR-13 | Reserved subdomain (`www app api admin mail support billing status …`) নেওয়া যাবে না |
| BR-14 | Deposit এর balance ঋণাত্মক হবে না; সব deposit লেনদেন append-only |
| BR-15 | AI কোনো আর্থিক রেকর্ড তৈরি/পরিবর্তন করবে না |

---

## ৬. Non-Functional Requirements

পূর্ণ তালিকা `01_PRD.md §8` (NFR-001 … 012)। সারসংক্ষেপ:

| ID | বিষয় | টার্গেট |
|---|---|---|
| NFR-001 | Tenant isolation | cross-tenant read/write শূন্য (automated) |
| NFR-002 | আর্থিক নির্ভুলতা | invoice = allocation = ledger |
| NFR-003 | Availability | মনিটরিং চালু; SLA মাপার পর |
| NFR-004 | Performance | মোবাইল 4G p75 LCP ≤ 3s; API p95 ≤ 500ms (লক্ষ্য) |
| NFR-005 | Backup/Restore | দৈনিক + PITR; restore drill ত্রৈমাসিক |
| NFR-006 | Security | OWASP ASVS L2 লক্ষ্য; pilot এর আগে threat model |
| NFR-007 | Auditability | সব আর্থিক ও permission পরিবর্তন immutable audit |
| NFR-008 | Localization | বাংলা + English, Asia/Dhaka, ৳ |
| NFR-009 | Accessibility | WCAG 2.1 AA লক্ষ্য |
| NFR-010 | Mobile-first | ৩৬০px এ সব কোর ফ্লো |
| NFR-011 | Data protection | PII এনক্রিপ্টেড, লগে মাস্ক |
| NFR-012 | Idempotency | job ও payment API পুনরায় চালালে একই ফল |

---

## ৭. বাহ্যিক ইন্টারফেস ও ডেটা রিকোয়ারমেন্ট

### ৭.১ ইউজার ইন্টারফেস
চারটি সারফেস: Marketing, Platform Admin, Client Workspace, Renter Portal। স্ক্রিন, রুট ও state: `02_AppFlow.md`। ডিজাইন সিস্টেম ও ব্র্যান্ড (Brand Teal `#114F4D`, Brand Amber `#E6A34B`, বাংলা-first টাইপোগ্রাফি): `03_UI_Spec.md`।

### ৭.২ সফটওয়্যার/সেবা ইন্টারফেস
SMS gateway, Email, Object storage, DNS/CDN/WAF, (V2) payment gateway ও custom-domain SSL, (V2) LLM API — সবই provider abstraction এর পেছনে। তালিকা ও নিয়ম: `04_TRD.md §4`।

### ৭.৩ ডেটা রিকোয়ারমেন্ট
ডেটা মডেল ও constraint: `05_Schema.md`। মূল নিয়ম: প্রতিটি tenant ডাটায় `tenant_id`; টাকা decimal; আর্থিক রেকর্ড immutable; PII এনক্রিপ্টেড; audit append-only।

### ৭.৪ ডেটা সংরক্ষণ ও মুছে ফেলা (প্রাথমিক নীতি, আইনি যাচাই বাকি)
| ডাটা | নীতি |
|---|---|
| আর্থিক রেকর্ড | মোছা যায় না; আইনি ন্যূনতম সময় (স্থানীয় আইন অনুযায়ী নির্ধারণ করতে হবে) |
| NID | এনক্রিপ্টেড; আইনি অনুমতি যাচাই না হওয়া পর্যন্ত শুধু শেষ ৪ সংখ্যা দেখানো |
| Cancelled tenant | ৩০ দিন পর ARCHIVED; ডাটা এক্সপোর্ট দেওয়ার পর |
| Audit log | ন্যূনতম ৩ বছর (প্রস্তাব, যাচাইযোগ্য) |
| OTP/session | মেয়াদ শেষে মুছে ফেলা |

---

## ৮. Acceptance ও গুণমান যাচাই

| ক্ষেত্র | গ্রহণযোগ্যতার শর্ত |
|---|---|
| Tenant isolation | প্রতিটি tenant টেবিল ও endpoint এর cross-tenant টেস্ট CI এ সবুজ |
| আর্থিক | invariants (paid = Σ allocation; payment = Σ allocation + credit; ledger ভারসাম্য; paid ≤ total) property-based টেস্টে সবুজ |
| ফাংশনাল | US-001 … 014 (`01_PRD.md §7`) Playwright E2E সবুজ |
| নিরাপত্তা | threat model সম্পূর্ণ; Sev1/Sev2 ইস্যু নেই |
| UX | ৩৬০px ও 3G throttle এ কোর ফ্লো ব্যবহারযোগ্য; empty/error স্টেট আছে |
| অপারেশন | backup restore drill সম্পন্ন; alert কাজ করে |

## ৯. ট্রেসেবিলিটি

প্রতিটি requirement ID → user story (`01_PRD.md §7`) → স্ক্রিন (`02_AppFlow.md`) → টেবিল (`05_Schema.md`) → টাস্ক (`06_Plan.md`) → টেস্ট। PR ও কমিটে ID উল্লেখ বাধ্যতামূলক।

## ১০. অনুমান, ঝুঁকি ও খোলা বিষয়

**অনুমান:** বেশিরভাগ ক্লায়েন্ট মোবাইল-নির্ভর; Renter দের অনেকের ইমেইল নেই (তাই OTP); শুরুতে ক্যাশ/MFS হাতে-রেকর্ড মডেল চলবে; SMS প্রতি বার্তায় খরচ হয়।

**ঝুঁকি:** `01_PRD.md §12`।

**খোলা বিষয় (pilot এর আগে):** SMS provider ও sender ID অনুমোদন · প্যাকেজ মূল্য · ডাটা রেসিডেন্সি · NID সংরক্ষণের আইনি সীমা · payment নিয়ন্ত্রক অবস্থান · `bashadesk.com` ডোমেইন ও trademark যাচাই · লোগোর SVG সেট ও wordmark ফন্ট নিশ্চিতকরণ।

## ১১. পরিবর্তনের ইতিহাস

| সংস্করণ | তারিখ | পরিবর্তন |
|---|---|---|
| 1.0 (SSR) | — | প্রাথমিক |
| 2.0 | ২৭ অক্টো ২০২৬ | SRS baseline |
| 2.1 | ২৮ অক্টো ২০২৬ | Basha Desk ব্র্যান্ড, পূর্ণ ডকুমেন্ট (business rules, data retention, acceptance, traceability) |
