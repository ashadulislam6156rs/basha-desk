# 01 — PRD (Product Requirements Document) · Basha Desk (বাসা ডেস্ক)

> **Basha Desk — Property & Rental Management SaaS (বাংলাদেশ)** · সংস্করণ 1.1 · স্ট্যাটাস: Baseline (pilot ফিডব্যাক অনুযায়ী আপডেট হবে)
> এই ফাইল বলে **কী বানাব ও কেন**। কীভাবে বানাব তা `04_TRD.md` তে।
> প্রতিটি requirement এর ID আছে (FR-xxx, NFR-xxx, US-xxx)। টাস্ক, টেস্ট ও PR এ ID উল্লেখ করুন।
> অগ্রাধিকার ট্যাগ: **[MVP]** প্রথম রিলিজে আবশ্যক · **[V2]** pilot ফিডব্যাকের পর · **[Future]** এখন বানাব না, কিন্তু ডিজাইনে জায়গা রাখব।

---

## 1. প্রোডাক্ট কী

**Basha Desk (বাসা ডেস্ক)** একটি **multi-tenant B2B SaaS**। ব্র্যান্ড রঙ, ফন্ট ও লোগো নিয়ম: `03_UI_Spec.md §0`; লোগো ফাইল: `docs/brand/basha_desk_logo.png`। আমরা বাড়িওয়ালা ও প্রপার্টি কোম্পানির কাছে সাবস্ক্রিপশনে সফটওয়্যার বিক্রি করি। কেউ সাবস্ক্রাইব করলে সিস্টেম তার জন্য আলাদা **workspace** তৈরি করে (নিজস্ব লগইন, ডাটা, সাবডোমেইন, ব্র্যান্ডিং)। ক্লায়েন্টের মনে হবে এটা তার নিজের আলাদা সফটওয়্যার, কিন্তু ভেতরে **একটাই কোডবেস ও একটাই deployment**।

### 1.1 তিন স্তরের ব্যবসা ও নামকরণ নিয়ম (বাধ্যতামূলক)

```
Platform Owner (আমরা)
   │  প্যাকেজ বিক্রি করি
   ▼
Tenant (SaaS ক্লায়েন্ট: বাড়ির মালিক / প্রপার্টি কোম্পানি)
   │  ভাড়া দেয়
   ▼
Renter (ভাড়াটিয়া / occupant)
```

| শব্দ | অর্থ | নোট |
|---|---|---|
| **Tenant** | আমাদের SaaS ক্লায়েন্ট | কোড, DB, ডকুমেন্টে সবসময় এই অর্থে |
| **Renter** | ভাড়াটিয়া | কখনোই `tenant` লেখা যাবে না |
| **Space** | ভাড়াযোগ্য ইউনিট (ফ্ল্যাট, দোকান, পার্কিং, রুম, ব্যাচেলর সিট) | কোডে `space` |
| **Agreement** | ভাড়ার চুক্তি | Renter + Space(s) + শর্ত |

> বাংলায় দুটোকেই "টেন্যান্ট/ভাড়াটিয়া" বলা হয়। তাই UI বাংলায় "ক্লায়েন্ট" ও "ভাড়াটিয়া" লিখুন, কোডে `tenant` ও `renter`।

### 1.2 টাকার দুটি আলাদা প্রবাহ

| প্রবাহ | কে কাকে দেয় | কীসের জন্য | আয় কার |
|---|---|---|---|
| **1. SaaS Subscription** | Tenant → Platform | প্যাকেজ ফি | আমাদের |
| **2. Rental Collection** | Renter → Tenant | ভাড়া, সার্ভিস চার্জ, ইউটিলিটি | Tenant এর |

- দুটি **আলাদা bounded domain**: আলাদা টেবিল, আলাদা রিপোর্ট, আলাদা লজিক। কখনো মেশানো যাবে না।
- **নিয়ন্ত্রক সতর্কতা:** Renter এর টাকা আমাদের অ্যাকাউন্টে এসে ক্লায়েন্টকে গেলে আমরা কার্যত payment service provider হয়ে যেতে পারি, যার জন্য বাংলাদেশে অনুমোদন লাগতে পারে।
  - **[MVP]** Tenant নিজে টাকা নেয় (ক্যাশ / bKash / Nagad ট্রানজেকশন / ব্যাংক রেফারেন্স) এবং সিস্টেমে **payment record** করে।
  - **[V2]** অনলাইন পেমেন্টে টাকা সরাসরি **Tenant এর নিজস্ব merchant account** এ যাবে। আমরা শুধু রেকর্ড ও যাচাই করব।
  - আইনজীবী ও payment provider লিখিতভাবে নিশ্চিত না করলে আমরা ভাড়ার টাকা ধারণ বা settle করব না।

---

## 2. সমস্যা (Core Problem)

1. ভাড়ার হিসাব বেশিরভাগ ক্ষেত্রে খাতা, Excel বা মুখে মুখে হয়, ফলে বকেয়া, অগ্রিম ও ডিপোজিট নিয়ে বিরোধ হয়।
2. একাধিক বাড়ি ও একাধিক ধরনের ইউনিটের (ফ্ল্যাট, দোকান, পার্কিং) একত্রিত আয়-ব্যয়ের ছবি পাওয়া কঠিন।
3. ভাড়াটিয়ার কাছে স্বচ্ছ রিসিট ও পেমেন্ট ইতিহাস থাকে না।
4. ইউটিলিটি বিল, দেরিতে পরিশোধের জরিমানা ও বার্ষিক ভাড়া বৃদ্ধি হাতে হিসাব করলে সময় লাগে ও ভুল হয়।

## 3. টার্গেট পারসোনা

| পারসোনা | বিবরণ | মূল ব্যথা | সফল হওয়ার সংজ্ঞা |
|---|---|---|---|
| **রহিম ভাই (Client Owner)** | ৩-১০টা বাড়ির মালিক, বয়স ৪০-৬০, স্মার্টফোন ব্যবহার করেন, Excel কম জানেন | মাস শেষে কে দিল কে দিল না মনে থাকে না | এক নজরে বকেয়া দেখেন, রিসিট এক ক্লিকে দেন |
| **ফারজানা (Property Manager / Accountant)** | কোম্পানির কর্মী, ডেস্কটপ ও মোবাইল দুটোই ব্যবহার করেন | ম্যানুয়াল ইনভয়েস, আলাদা শিটে হিসাব | মাসিক ইনভয়েস অটো, রিপোর্ট ready |
| **কালাম (Caretaker)** | দারোয়ান/কেয়ারটেকার, শুধু মোবাইল | কাগজে মেইনটেন্যান্সের তালিকা | ফোনে request দেখে ও status বদলায় |
| **সুমন (Renter)** | চাকরিজীবী ভাড়াটিয়া, ইমেইল নেই, শুধু মোবাইল নম্বর | রিসিট হারিয়ে যায়, কত দিয়েছি তার প্রমাণ নেই | মোবাইল নম্বর + OTP দিয়ে লগইন, রিসিট ডাউনলোড |
| **আমরা (Platform Admin / Support)** | প্ল্যাটফর্ম পরিচালনা | onboarding, সাপোর্ট | ক্লায়েন্ট দ্রুত সক্রিয় হয়, সাপোর্ট টিকেট কম |

## 4. ইউজার শ্রেণি ও পারমিশন (সারসংক্ষেপ)

| Role | Scope | সাধারণ পারমিশন |
|---|---|---|
| Platform Super Admin | Platform | tenant, plan, অপারেশন নিয়ন্ত্রণ; **MFA আবশ্যক** |
| Platform Support Agent | Platform | মেটাডেটা + স্পষ্টভাবে দেওয়া সময়সীমাযুক্ত অ্যাক্সেস; ডিফল্টে ফাইন্যান্সিয়াল ডাটা দেখতে পারবে না |
| Client Owner | Tenant | নিজের workspace এর সব কিছু |
| Property Manager | নির্ধারিত property | property-scoped অপারেশন; ফাইন্যান্স পারমিশন কনফিগারযোগ্য |
| Accountant / Finance | Tenant | invoice, payment, expense, রিপোর্ট |
| Property Staff / Caretaker | নির্ধারিত property | দৈনন্দিন কাজ, maintenance; সীমিত পারমিশন |
| Co-owner / Investor **[V2]** | নিজের অংশ | শুধু read-only রিপোর্ট |
| Renter | নিজের agreement | শুধু নিজের invoice, payment, document, request |
| System / Worker | Service identity | সীমিত পারমিশন; সব কাজ audit যোগ্য |

---

## 5. MVP সীমানা (In Scope)

**Platform Admin:** client onboarding, provisioning status, প্যাকেজ ও সাবস্ক্রিপশন, সাপোর্ট অপারেশন, platform রিপোর্ট।
**Client Workspace:** property hierarchy, rentable space, availability, agreement, recurring charge, invoice, payment record, deposit, expense, রিপোর্ট।
**Renter Portal:** balance, invoice, receipt, agreement, notice, মাসওয়ারি পেমেন্ট ইতিহাস ডাউনলোড, maintenance request।
**Platform ক্রস-কাটিং:** identity, membership, role, permission, audit trail, notification (SMS/email/in-app), document storage, subdomain + wildcard SSL, বাংলা ও English UI, Excel import/export।

---

## 6. Functional Requirements

### 6.1 Tenant ও Onboarding
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-001 | সাইন-আপে ইউজার প্যাকেজ বেছে workspace তৈরি করতে পারবে; subdomain availability ও reserved-name চেক হবে | MVP |
| FR-002 | Tenant registry তে `PROVISIONING → READY` স্ট্যাটাস থাকবে; provisioning job idempotent | MVP |
| FR-003 | Owner কে ইনভাইট (SMS/email) পাঠানো হবে | MVP |
| FR-004 | Reserved subdomain (www, app, api, admin, mail, support, billing, status) নেওয়া যাবে না | MVP |
| FR-005 | Custom domain: CNAME + TXT যাচাই, auto SSL | V2 (Business+) |
| FR-006 | Tenant suspend/reactivate করা যাবে; suspend হলে hostname নিষ্ক্রিয় | MVP |
| FR-007 | Shared থেকে dedicated DB তে tenant সরানোর migration tooling | Future |

### 6.2 Identity, Role, Permission
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-010 | Staff লগইন: email/মোবাইল + পাসওয়ার্ড; Platform Admin এ MFA আবশ্যক | MVP |
| FR-011 | Renter লগইন: মোবাইল নম্বর + OTP | MVP |
| FR-012 | Role-based permission + property-scoped assignment | MVP |
| FR-013 | সব সেনসিটিভ অ্যাকশন audit log এ যাবে (কে, কখন, কী, আগে/পরে) | MVP |
| FR-014 | ইউজার ইনভাইট, নিষ্ক্রিয়, role পরিবর্তন | MVP |

### 6.3 Property ও Space
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-020 | Hierarchy: (ঐচ্ছিক portfolio) → Property → Building → Floor → Space | MVP |
| FR-021 | Space type: FLAT, SHOP, PARKING, ROOM, SEAT, OTHER | MVP |
| FR-022 | Space status: VACANT, OCCUPIED, RESERVED, MAINTENANCE | MVP |
| FR-023 | Property তে লোকেশন (বিভাগ/জেলা/উপজেলা, ঠিকানা) | MVP |
| FR-024 | Excel থেকে property/space bulk import (validation preview সহ) | MVP |
| FR-025 | প্যাকেজ লিমিট (property, space, user সংখ্যা) **ব্যাকএন্ডে enforce** | MVP |

### 6.4 Renter ও Agreement
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-030 | Renter প্রোফাইল: নাম, মোবাইল, NID, ছবি, জরুরি যোগাযোগ, ডকুমেন্ট আপলোড | MVP |
| FR-031 | Agreement: renter, এক বা একাধিক space, শুরু/শেষ তারিখ, ভাড়া, সার্ভিস চার্জ, ডিপোজিট, billing day | MVP |
| FR-032 | Agreement status: DRAFT, ACTIVE, ENDING, ENDED, CANCELLED | MVP |
| FR-033 | Recurring charge (ভাড়া, সার্ভিস চার্জ, গ্যাস/পানি/বিদ্যুৎ ইত্যাদি) agreement এ সংজ্ঞায়িত | MVP |
| FR-034 | বার্ষিক ভাড়া বৃদ্ধি (শতাংশ/ধার্য পরিমাণ, তারিখ অনুযায়ী) | V2 |
| FR-035 | Move-in/move-out চেকলিস্ট ও ছবি | V2 |
| FR-036 | Agreement PDF জেনারেট ও ডিজিটাল সই | V2 |
| FR-037 | থানায় জমার ফরম্যাটে ভাড়াটিয়ার তথ্য প্রিন্ট | V2 |

### 6.5 Billing (Invoice, Payment, Deposit)
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-040 | প্রতি মাসে ACTIVE agreement এর জন্য invoice অটো তৈরি (worker, idempotent) | MVP |
| FR-041 | Invoice status: DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, VOID | MVP |
| FR-042 | Payment record: পরিমাণ, method (CASH/BKASH/NAGAD/ROCKET/BANK/OTHER), reference/trx id, তারিখ | MVP |
| FR-043 | **Payment ও Invoice আলাদা**; payment → invoice এ **allocation টেবিলের** মাধ্যমে যুক্ত | MVP |
| FR-044 | আংশিক ও অগ্রিম পেমেন্ট (credit balance) সমর্থিত | MVP |
| FR-045 | রিসিট জেনারেট (PDF, বাংলা সংখ্যা সহ), ক্রমিক নম্বর | MVP |
| FR-046 | বকেয়ার তালিকা ও aging (০-৩০, ৩১-৬০, ৬১+ দিন) | MVP |
| FR-047 | Late fee অটো (কনফিগারযোগ্য নিয়ম) | V2 |
| FR-048 | Deposit রেকর্ড; move-out এ adjust/refund হিসাব | MVP |
| FR-049 | ইউটিলিটি মিটার রিডিং থেকে বিল তৈরি | V2 |
| FR-050 | পোস্ট করা (ISSUED+) invoice/payment **মোছা যাবে না**; শুধু VOID/reversal entry | MVP |
| FR-051 | Payment সৃষ্টিতে idempotency key বাধ্যতামূলক (duplicate রোধ) | MVP |

### 6.6 Expense ও Reports
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-060 | Expense রেকর্ড (category, property, vendor, রসিদ ছবি) | MVP |
| FR-061 | রিপোর্ট: collection, outstanding/aging, property-wise আয়-ব্যয়, নিট লাভ | MVP |
| FR-062 | Co-owner এর মুনাফা ভাগাভাগি রিপোর্ট | V2 |
| FR-063 | Accounting export (CSV/Excel), ট্যাক্স রিপোর্ট | V2 |
| FR-064 | সব রিপোর্ট Excel/PDF এ export | MVP |

### 6.7 Maintenance ও Notice
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-070 | Renter বা staff maintenance request তৈরি, ছবি সংযুক্ত | MVP |
| FR-071 | Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED; কমেন্ট থ্রেড | MVP |
| FR-072 | Vendor/মিস্ত্রি ম্যানেজমেন্ট | V2 |
| FR-073 | নোটিশ পাঠানো (সব বা নির্বাচিত renter কে এক ক্লিকে; in-app + SMS) | MVP |

### 6.8 Notification
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-080 | Invoice ইস্যু, বকেয়া রিমাইন্ডার, পেমেন্ট রিসিটে SMS/in-app | MVP |
| FR-081 | SMS ব্যবহার প্যাকেজ কোটার বিপরীতে গণনা; কোটা শেষে ব্লক বা পেইড | MVP |
| FR-082 | Provider abstraction (SMS gateway বদলানো যাবে) | MVP |
| FR-083 | WhatsApp নোটিফিকেশন | Future |

### 6.9 Subscription (Platform Billing)
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-090 | প্যাকেজ: Starter, Pro, Business, Enterprise (লিমিট entitlement টেবিলে) | MVP |
| FR-091 | Trial, active, past_due, cancelled স্ট্যাটাস | MVP |
| FR-092 | Platform subscription invoice (Tenant এর ভাড়ার invoice থেকে সম্পূর্ণ আলাদা) | MVP |
| FR-093 | প্যাকেজ বদল (upgrade/downgrade), downgrade এ লিমিট চেক | V2 |

### 6.10 AI ও অন্যান্য
| ID | Requirement | অগ্রাধিকার |
|---|---|---|
| FR-100 | AI FAQ সাপোর্ট ও ticket escalation | V2 |
| FR-101 | Permission-checked **read-only** business query ("এই মাসে কত বকেয়া?") | Future |
| FR-102 | AI দিয়ে financial mutation **নিষিদ্ধ** (আলাদা confirmed workflow ছাড়া) | Non-goal |
| FR-103 | Public marketplace / খালি ইউনিট listing | Future |
| FR-104 | Mobile app / PWA (MVP তে responsive web, PWA installable) | MVP (PWA), Future (native) |
| FR-105 | বাংলা ও English UI, বাংলা সংখ্যা, timezone `Asia/Dhaka`, currency BDT | MVP |
| FR-106 | Online payment gateway (provider abstraction, signed webhook, reconciliation) | V2 |

---

## 7. MVP User Stories

| ID | ভূমিকা | Story | Acceptance Criteria | Maps to |
|---|---|---|---|---|
| US-001 | রহিম | আমি প্যাকেজ বেছে সাইন-আপ করে নিজের workspace পেতে চাই | subdomain নিলে ৩০ সেকেন্ডের মধ্যে READY; ইনভাইট SMS/email আসে | FR-001..003 |
| US-002 | রহিম | আমি আমার বাড়ি, ফ্লোর ও ইউনিট যোগ করতে চাই | hierarchy তৈরি হয়; লিমিট ছাড়ালে স্পষ্ট বার্তা | FR-020..025 |
| US-003 | ফারজানা | Excel থেকে ইউনিট import করতে চাই | preview, error সারি চিহ্নিত, শুধু ভ্যালিড সারি import | FR-024 |
| US-004 | ফারজানা | ভাড়াটিয়া যোগ করে agreement বানাতে চাই | agreement ACTIVE হলে space OCCUPIED হয় | FR-030..033 |
| US-005 | ফারজানা | প্রতি মাসে ইনভয়েস অটো তৈরি হোক | billing day তে ইনভয়েস তৈরি; দুবার চালালেও duplicate নয় | FR-040 |
| US-006 | ফারজানা | ভাড়াটিয়ার ক্যাশ/bKash পেমেন্ট রেকর্ড করতে চাই | allocation হয়; আংশিক হলে PARTIALLY_PAID; রিসিট তৈরি | FR-042..045 |
| US-007 | রহিম | এক নজরে বকেয়া ও মাসের collection দেখতে চাই | dashboard এ সঠিক সংখ্যা; aging রিপোর্ট | FR-046, FR-061 |
| US-008 | সুমন | মোবাইল নম্বর ও OTP দিয়ে লগইন করে আমার বকেয়া ও রিসিট দেখতে চাই | শুধু নিজের ডাটা; রিসিট PDF ডাউনলোড | FR-011, FR-045 |
| US-009 | সুমন | সমস্যা হলে maintenance request পাঠাতে চাই | ছবিসহ request; status দেখা যায় | FR-070..071 |
| US-010 | কালাম | আমার property এর request ফোনে দেখে status বদলাতে চাই | শুধু নির্ধারিত property দেখা যায় | FR-012, FR-071 |
| US-011 | রহিম | সব ভাড়াটিয়াকে এক ক্লিকে নোটিশ পাঠাতে চাই | in-app + SMS; ডেলিভারি স্ট্যাটাস দেখা যায় | FR-073 |
| US-012 | রহিম | খরচ রেকর্ড করে নিট লাভ দেখতে চাই | property-wise আয়-ব্যয় রিপোর্ট | FR-060..061 |
| US-013 | আমরা | ক্লায়েন্ট suspend/reactivate করতে চাই | suspend হলে লগইন ও hostname বন্ধ | FR-006 |
| US-014 | আমরা | সাবস্ক্রিপশন ও প্যাকেজ লিমিট ম্যানেজ করতে চাই | লিমিট ব্যাকএন্ড enforce | FR-025, FR-090..092 |

---

## 8. Non-Functional Requirements

| ID | Requirement | টার্গেট (pilot ডাটায় যাচাই) |
|---|---|---|
| NFR-001 | **Tenant isolation:** cross-tenant read/write শূন্য | critical automated test এ ০ লঙ্ঘন |
| NFR-002 | **আর্থিক নির্ভুলতা:** invoice = allocation = ledger | release acceptance test এ ০ অব্যাখ্যাত গরমিল |
| NFR-003 | Availability মনিটরিং | uptime monitoring চালু; SLA ঘোষণা মাপা সক্ষমতার পরে |
| NFR-004 | Performance: সাধারণ পেজ (4G মোবাইল) | p75 LCP ≤ 3s; API p95 ≤ 500ms (লক্ষ্য) |
| NFR-005 | Backup/restore | দৈনিক backup + PITR; restore drill ত্রৈমাসিক |
| NFR-006 | Security | OWASP ASVS L2 লক্ষ্য; threat model pilot এর আগে |
| NFR-007 | Auditability | সব financial ও permission পরিবর্তন immutable audit log এ |
| NFR-008 | Localization | বাংলা + English, Asia/Dhaka, ৳ ফরম্যাট |
| NFR-009 | Accessibility | WCAG 2.1 AA লক্ষ্য, বাংলা ফন্টে পাঠযোগ্যতা |
| NFR-010 | Mobile-first | ৩৬০px প্রস্থে সব কোর ফ্লো ব্যবহারযোগ্য |
| NFR-011 | Data protection | PII (NID, ফোন) এনক্রিপ্টেড স্টোরেজে ও লগে মাস্ক |
| NFR-012 | Idempotency | worker job ও payment API পুনরায় চালালে একই ফল |

> সংখ্যাগুলো টার্গেট হিসেবে লেখা। বাজেট ও pilot ডাটা দিয়ে যাচাই করতে হবে।

---

## 9. প্যাকেজ কাঠামো (প্রাথমিক, pilot এ যাচাইযোগ্য)

| প্যাকেজ | লক্ষ্য গ্রাহক | লিমিট (উদাহরণ) | বিশেষ সুবিধা |
|---|---|---|---|
| Starter | ছোট বাড়িওয়ালা | ১টা property, ~২০ ইউনিট, ১ ইউজার | মূল ফিচার, shared DB, `name.bashadesk.com` |
| Pro | মাঝারি মালিক | ~১০ property, ~১০০ ইউনিট, স্টাফ ইউজার | SMS কোটা, রিপোর্ট, ইউটিলিটি বিল, Excel import |
| Business | প্রপার্টি কোম্পানি | বেশি/সীমাহীন property | Custom domain, ব্র্যান্ডিং, accounting রিপোর্ট, API/export |
| Enterprise | বড় প্রতিষ্ঠান | চুক্তি অনুযায়ী | Dedicated database, অগ্রাধিকার সাপোর্ট, কাস্টম SLA (মাপার পর) |

দাম ইউনিট সংখ্যা ও SMS ব্যবহারের ভিত্তিতে নির্ধারিত হবে। **সব লিমিট ব্যাকএন্ডে enforce হবে।**

---

## 10. Success Metrics

| লক্ষ্য | মাপার উপায় | প্রাথমিক টার্গেট |
|---|---|---|
| Activation | নতুন workspace এ প্রথম property ও প্রথম invoice তৈরি | pilot এ baseline ঠিক করা; guided first-value flow |
| আর্থিক নির্ভুলতা | invoice, allocation, ledger reconciliation test | কোনো অব্যাখ্যাত গরমিল নয় |
| Tenant isolation | automated cross-tenant access test | ০ অননুমোদিত read/write |
| Availability | production uptime monitoring | মাপার পর SLA |
| Support | ticket resolution time, AI escalation rate | pilot baseline, প্রতি রিলিজে উন্নতি |
| Retention / Revenue | paid conversion, renewal, churn, MRR | design partner দিয়ে যাচাই |

---

## 11. Out of Scope (Non-Goals) — **কড়া সীমানা**

> কোডিং এজেন্ট এই তালিকার কিছুই বানাবে না। বানাতে হলে মানুষের লিখিত অনুমতি লাগবে।

1. Public rental marketplace ও listing discovery।
2. সব দেশের পূর্ণ ট্যাক্স ও accounting compliance।
3. **AI দিয়ে financial mutation** (payment received করা, refund, agreement edit)।
4. Microservices, প্রতি ক্লায়েন্টে আলাদা DB সার্ভার, বা customer-managed infrastructure ডিফল্ট হিসেবে।
5. ভাড়াটিয়ার ঝুঁকি নিয়ে predictive সিদ্ধান্ত বা মানুষের পর্যালোচনা ছাড়া স্বয়ংক্রিয় সিদ্ধান্ত।
6. নির্দিষ্ট uptime SLA, নিয়ন্ত্রক সনদ বা trademark ছাড়পত্রের প্রতিশ্রুতি (যাচাইয়ের আগে)।
7. **Tenant এর ভাড়ার টাকা প্ল্যাটফর্মের মাধ্যমে ধারণ বা settle করা**, নিয়ন্ত্রক অনুমোদন ছাড়া।
8. প্রতি ক্লায়েন্টের জন্য আলাদা কোডবেস বা আলাদা deployment।
9. Native mobile app (MVP তে শুধু responsive web + PWA)।
10. MVP তে: online payment gateway, late fee অটো, মিটার রিডিং বিল, rent escalation, digital agreement signing, vendor management, co-owner রিপোর্ট, WhatsApp, AI assistant (সব V2/Future)।

## 12. ঝুঁকি ও প্রশ্ন

| ঝুঁকি | প্রতিরোধ |
|---|---|
| ক্যাশ/মুখের হিসাবে অভ্যস্ত বাড়িওয়ালা | সহজ বাংলা UI, guided onboarding, Excel import, সেটআপ সহায়তা |
| ডাটা এন্ট্রির বোঝা | Excel import ও ম্যানুয়াল সেটআপ সাপোর্ট |
| ভুল হিসাব | টাকার লজিকে সর্বোচ্চ টেস্ট, reconciliation |
| ডাটা লিক | RLS + cross-tenant টেস্ট বাধ্যতামূলক |
| পেমেন্ট নিয়ন্ত্রক ঝামেলা | §1.2 এর নীতি, আইনজীবী যাচাই |
| SMS খরচ | প্যাকেজে কোটা, ব্যবহার মনিটরিং |
| আইনি (ডাটা প্রটেকশন, ইলেকট্রনিক চুক্তি, ট্যাক্স) | স্থানীয় আইনজীবী/অ্যাকাউন্ট্যান্ট যাচাই pilot এর আগে |

**খোলা প্রশ্ন (pilot এর আগে সমাধান):** SMS provider নির্বাচন · দাম নির্ধারণ · ডাটা রেসিডেন্সির নিয়ম · NID সংরক্ষণের আইনি সীমা · bKash/Nagad merchant API অনুমোদন প্রক্রিয়া।
