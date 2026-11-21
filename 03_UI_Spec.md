# 03 — UI Spec (Design System) · Basha Desk

> সব মান এখানে **locked**। কোডে hardcoded hex, px বা ফন্ট লেখা নিষেধ; সবসময় নিচের টোকেন (CSS variables / Tailwind theme) ব্যবহার করুন।
> আর্কিটেকচার ও স্ট্যাক: `04_TRD.md`। স্ক্রিন ফ্লো: `02_AppFlow.md`।

---

## 0. Brand Identity — Basha Desk (বাসা ডেস্ক)

> উৎস: `docs/brand/basha_desk_logo.png` (আপলোড করা অফিশিয়াল লোগো)। রঙ লোগোর পিক্সেল থেকে মাপা; এগুলো **brand-locked**।

| বিষয় | মান |
|---|---|
| প্রোডাক্টের নাম | **Basha Desk** (ইংরেজি) · **বাসা ডেস্ক** (বাংলা) |
| Tagline | **PROPERTY & RENTAL MANAGEMENT** (বাংলা: "বাসা ও ভাড়ার সহজ হিসাব" — প্রস্তাবিত, অনুমোদন সাপেক্ষে) |
| লোগো ধারণা | সবুজ-নীল (teal) ভবন + "B" অক্ষর, জানালায় সোনালি-হলুদ আলো |
| Wordmark | "Basha" = Brand Teal, "Desk" = Brand Amber |
| Brand Teal | `#114F4D` (লোগোর টেক্সট ও আইকন; আইকনে `#0F4D4A`) |
| Brand Amber | `#E6A34B` (লোগোর "Desk"); আইকনের জানালা `#F2BB6B` |
| ব্যাকগ্রাউন্ড | সাদা (লোগো সাদা ব্যাকগ্রাউন্ডে ডিজাইন করা) |

**লোগো ব্যবহারের নিয়ম**
1. Light থিমে: মূল রঙিন লোগো। Dark থিমে: সাদা `surface` চিপে বসান, অথবা teal অংশ `#FFFFFF`/amber অংশ `#F2BB6B` করা mono-light ভার্সন (ডিজাইনারকে দিয়ে SVG বানাতে হবে, টাস্ক `P3-01a`)।
2. সুরক্ষিত ফাঁকা জায়গা: লোগোর "B" এর প্রস্থের অর্ধেক চারপাশে।
3. ন্যূনতম আকার: পূর্ণ লোগো উচ্চতা ২৮px; এর ছোট হলে শুধু আইকন (ভবন+B) ব্যবহার।
4. বিকৃত করা, রঙ বদলানো, ছায়া/গ্রেডিয়েন্ট দেওয়া নিষেধ। Tagline ছোট সাইজে (<২৮px উচ্চতা) বাদ দিন।
5. Favicon/PWA আইকন: শুধু ভবন+B আইকন, teal ব্যাকগ্রাউন্ডে সাদা বা amber, `192/512px` + maskable।
6. Tenant এর ওয়ার্কস্পেসে: সাইডবারের উপরে tenant লোগো; "Basha Desk" লোগো footer/লগইন পেজে ছোট করে ("Powered by Basha Desk" — Starter/Pro এ বাধ্যতামূলক, Business+ এ ঐচ্ছিক)।
7. **PNG সীমাবদ্ধতা:** বর্তমান ফাইল ১৭৭৪×৮৮৭ PNG, বাড়তি সাদা মার্জিনসহ। প্রোডাকশনের জন্য ক্রপ করা SVG ভার্সন (পূর্ণ, আইকন-একক, mono-light) ডিজাইনার থেকে নিন।

---

## 1. ডিজাইন নীতি

1. **সরল ও স্পষ্ট:** ৪০-৬০ বছরের বাড়িওয়ালা ও ইমেইলহীন ভাড়াটিয়া লক্ষ্য। কম মেনু, বড় টাচ টার্গেট।
2. **Mobile-first:** ৩৬০px প্রস্থ থেকে ডিজাইন শুরু।
3. **বাংলা-first:** বাংলা লেখা ডিফল্ট; English টগল করা যায়। বাংলা ফন্ট ঠিকমতো পড়া যায় এমন লাইন-হাইট।
4. **টাকার স্পষ্টতা:** সংখ্যা সবসময় ডানে-সারিবদ্ধ, tabular figures, ৳ চিহ্নসহ।
5. **রঙ একা অর্থ বহন করে না:** status সবসময় রঙ + আইকন/লেবেল।

---

## 2. রঙের প্যালেট (hex, locked)

### 2.1 Brand ও Neutral

| টোকেন | Light | Dark | ব্যবহার |
|---|---|---|---|
| `--color-primary` | `#114F4D` | `#4FC3B8` | প্রধান বাটন, লিংক, active নেভ (লোগোর Brand Teal) |
| `--color-primary-hover` | `#0B3B39` | `#7AD7CE` | hover |
| `--color-primary-soft` | `#DDEFED` | `#12302F` | হালকা ব্যাকগ্রাউন্ড, selected row |
| `--color-on-primary` | `#FFFFFF` | `#06302E` | primary এর উপরের লেখা |
| `--color-accent` | `#E6A34B` | `#F2BB6B` | লোগোর Brand Amber: হাইলাইট, ব্যাজ ফিল, আইকন, চার্টের দ্বিতীয় রঙ। **সাদার উপরে লেখার রঙ হিসেবে নয়** (contrast ≈ 2.2:1) |
| `--color-accent-strong` | `#9A5B0B` | `#F2BB6B` | amber ঘরানার **লেখা/লিংক** (সাদার উপর ≈ 5.4:1) |
| `--color-on-accent` | `#0B3B39` | `#2A1A00` | amber ফিলের উপরের লেখা |
| `--color-bg` | `#F7FAF9` | `#0A1514` | পেজ ব্যাকগ্রাউন্ড (হালকা teal আভা) |
| `--color-surface` | `#FFFFFF` | `#102120` | কার্ড, মোডাল |
| `--color-surface-alt` | `#EFF5F4` | `#173130` | টেবিল হেডার, ইনপুট ব্যাকগ্রাউন্ড |
| `--color-border` | `#DCE7E5` | `#244240` | বর্ডার |
| `--color-border-strong` | `#BFD0CE` | `#37605D` | ইনপুট বর্ডার |
| `--color-text` | `#0F1F1E` | `#E5F0EE` | প্রধান লেখা |
| `--color-text-muted` | `#4A5F5D` | `#9DB5B2` | গৌণ লেখা |
| `--color-text-disabled` | `#93A5A3` | `#5B7572` | disabled |

> Brand Teal `#114F4D` সাদার উপরে ≈ 9.3:1 contrast দেয় (AAA)। Brand Amber শুধু ফিল/আইকনে; লেখায় `accent-strong`।

### 2.2 Semantic (status)

| টোকেন | Light fg | Light bg | Dark fg | Dark bg |
|---|---|---|---|---|
| `success` | `#15803D` | `#DCFCE7` | `#4ADE80` | `#0F2E1B` |
| `warning` | `#B45309` | `#FEF3C7` | `#FBBF24` | `#33260A` |
| `danger` | `#B91C1C` | `#FEE2E2` | `#F87171` | `#3A1212` |
| `info` | `#1D4ED8` | `#DBEAFE` | `#60A5FA` | `#0F1F3F` |
| `neutral` | `#475569` | `#E2E8F0` | `#9AA9C2` | `#1F2A44` |

### 2.3 Domain status → রঙ ম্যাপিং (আইকনসহ)

| Status | Variant | আইকন (lucide) | বাংলা লেবেল |
|---|---|---|---|
| Space VACANT | info | `door-open` | খালি |
| Space OCCUPIED | success | `user-check` | ভাড়া দেওয়া |
| Space RESERVED | warning | `bookmark` | রিজার্ভড |
| Space MAINTENANCE | neutral | `wrench` | মেইনটেন্যান্স |
| Invoice DRAFT | neutral | `file-pen` | খসড়া |
| Invoice ISSUED | info | `file-text` | ইস্যু হয়েছে |
| Invoice PARTIALLY_PAID | warning | `circle-dot-dashed` | আংশিক পরিশোধ |
| Invoice PAID | success | `circle-check` | পরিশোধিত |
| Invoice OVERDUE | danger | `alarm-clock` | বকেয়া |
| Invoice VOID | neutral | `ban` | বাতিল |
| Agreement DRAFT/ACTIVE/ENDING/ENDED/CANCELLED | neutral/success/warning/neutral/danger | `file`/`file-check`/`hourglass`/`file-x`/`ban` | খসড়া/চলমান/শেষের পথে/শেষ/বাতিল |
| Maintenance OPEN/IN_PROGRESS/RESOLVED/CLOSED | danger/warning/success/neutral | `circle-alert`/`loader`/`check`/`archive` | খোলা/চলমান/সমাধান/বন্ধ |

### 2.4 Contrast নিয়ম
- সাধারণ লেখা অন্তত **4.5:1**, বড় লেখা (≥18px bold বা ≥24px) **3:1**। উপরের জোড়াগুলো এই লক্ষ্যে বাছা হয়েছে; নতুন জোড়া যোগ করলে যাচাই আবশ্যক।
- Focus ring: `2px solid var(--color-primary)` + `2px offset`, সব ইন্টারঅ্যাক্টিভ এলিমেন্টে।

---

## 3. টাইপোগ্রাফি

### 3.1 ফন্ট (Google Fonts, `next/font` দিয়ে self-hosted)

লোগোর wordmark একটি গোলাকার, বন্ধুত্বপূর্ণ humanist sans (কিছুটা কাটা-কোণের বর্ণ, সুনির্দিষ্ট ফন্ট শনাক্ত করা যায়নি)। আনুষ্ঠানিক ফন্টের নাম ডিজাইনারের কাছ থেকে নিশ্চিত হলে এখানে লিখুন। নিকটতম **বিনামূল্যে** মিল ও বাংলা-সাপোর্টসহ বিন্যাস:

| ভূমিকা | ফন্ট | fallback |
|---|---|---|
| **Display / Brand শিরোনাম** (হিরো, পেজ H1, marketing, ইমেইল হেডার) | **Baloo Da 2** (600, 700) — লোগোর গোলাকার ভাব মেলে, বাংলা+ল্যাটিন দুটোই আছে | `"Hind Siliguri", system-ui, sans-serif` |
| **UI বাংলা (body)** | **Hind Siliguri** (400, 500, 600, 700) | `"Noto Sans Bengali", system-ui, sans-serif` |
| **UI ল্যাটিন + সংখ্যা** | **Inter** (400, 500, 600, 700), `"tnum"` | `system-ui, sans-serif` |
| **Tagline / eyebrow** (লোগোর "PROPERTY & RENTAL MANAGEMENT" এর মতো) | Inter 600, UPPERCASE, `letter-spacing: 0.18em` | `system-ui` |
| মনোস্পেস (reference ID) | **JetBrains Mono** (400) | `ui-monospace, monospace` |

নিয়ম: Display ফন্ট শুধু `text-display`, `text-h1` ও marketing এ। টেবিল, ফর্ম, সংখ্যা ও টাকায় **কখনো** Display ফন্ট নয় (পাঠযোগ্যতা)।
`font-family` (UI): `var(--font-inter), var(--font-hind), system-ui`; (Display): `var(--font-baloo), var(--font-hind), system-ui`।

### 3.2 স্কেল (ডেস্কটপ / মোবাইল)

| টোকেন | মোবাইল | ডেস্কটপ | line-height | weight | ব্যবহার |
|---|---|---|---|---|---|
| `text-display` | 28px | 36px | 1.3 | 700 | marketing হিরো (Baloo Da 2) |
| `text-h1` | 24px | 28px | 1.4 | 700 | পেজ শিরোনাম (Baloo Da 2) |
| `text-h2` | 20px | 22px | 1.45 | 600 | সেকশন |
| `text-h3` | 17px | 18px | 1.5 | 600 | কার্ড শিরোনাম |
| `text-body` | 16px | 16px | 1.65 | 400 | সাধারণ |
| `text-body-sm` | 14px | 14px | 1.6 | 400 | টেবিল, সহায়ক |
| `text-caption` | 12px | 12px | 1.5 | 500 | লেবেল, ব্যাজ |
| `text-money-lg` | 24px | 28px | 1.2 | 700 | KPI টাকা |

> বাংলায় লাইন-হাইট ইংরেজির চেয়ে বেশি রাখা হয়েছে (matra ও যুক্তাক্ষর কাটা না পড়তে)। ইনপুট ফিল্ডে ন্যূনতম **16px** (iOS zoom এড়াতে)।

### 3.3 সংখ্যা ও টাকা ফরম্যাট
- Locale `bn-BD` ও `en-BD`; `Intl.NumberFormat` ব্যবহার, নিজে ফরম্যাট লেখা নিষেধ।
- টাকা: `৳ ১২,৫০০.০০` (বাংলা) / `৳ 12,500.00` (English)। দশমিক সবসময় ২ ঘর।
- বাংলা সংখ্যা (০-৯) ব্যবহারকারীর ভাষা বাংলা হলে ডিফল্ট; প্রোফাইলে টগল।
- ভারতীয় গ্রুপিং (লাখ/কোটি: `১,২৫,০০০`) বাংলাদেশের জন্য ডিফল্ট।
- তারিখ: `২৭ অক্টোবর ২০২৬`; ছোট ফরম্যাটে `২৭/১০/২০২৬`। সময় ১২ ঘণ্টা, timezone `Asia/Dhaka`।

---

## 4. Spacing, Radius, Elevation, Layout

### 4.1 Spacing (৪px বেস)

`space-0=0` · `1=4px` · `2=8px` · `3=12px` · `4=16px` · `5=20px` · `6=24px` · `8=32px` · `10=40px` · `12=48px` · `16=64px`

- কার্ড padding: মোবাইল `4`, ডেস্কটপ `6`।
- ফর্ম ফিল্ডের মধ্যে ফাঁক `4`; সেকশনের মধ্যে `8`।
- Touch target ন্যূনতম **44×44px**।

### 4.2 Radius
`sm=6px` (ইনপুট, ব্যাজ ছাড়া) · `md=10px` (বাটন, ইনপুট) · `lg=14px` (কার্ড) · `xl=20px` (মোডাল) · `full=9999px` (ব্যাজ, avatar)

### 4.3 Elevation
- `shadow-sm`: `0 1px 2px rgba(15,23,42,.06)` (কার্ড)
- `shadow-md`: `0 4px 12px rgba(15,23,42,.10)` (ড্রপডাউন)
- `shadow-lg`: `0 12px 32px rgba(15,23,42,.16)` (মোডাল)
- Dark থিমে shadow এর বদলে `border` ও `surface` পার্থক্য ব্যবহার।

### 4.4 Breakpoints ও Grid
`sm=480` · `md=768` · `lg=1024` · `xl=1280`। কনটেন্ট max-width `1280px`; সাইডবার `264px` (collapsed `72px`)। ফর্ম কলাম: মোবাইলে ১, `md`+ এ ২।

### 4.5 Z-index
`dropdown=40` · `sticky=50` · `overlay=60` · `modal=70` · `toast=80`।

### 4.6 Motion
`duration-fast=120ms` · `base=200ms` · `slow=320ms`; easing `cubic-bezier(.2,.0,.0,1)`। `prefers-reduced-motion` এ সব animation বন্ধ।

---

## 5. থিম নিয়ম (Dark / Light)

1. তিনটি মোড: **System (ডিফল্ট)**, Light, Dark। `class="dark"` root এ বসে (`next-themes`)।
2. পছন্দ ইউজার প্রোফাইলে ও `localStorage` এ সংরক্ষিত; FOUC এড়াতে inline script।
3. সব রঙ CSS variable; কম্পোনেন্টে সরাসরি `#hex` নয়।
4. ছবি/লোগো: tenant লোগো ডার্ক ব্যাকগ্রাউন্ডে পাঠযোগ্য না হলে সাদা `surface` চিপে বসবে।
5. PDF (রিসিট, রিপোর্ট) সবসময় Light থিমে, উপরে ভাষাভেদে tenant লোগো।
6. Tenant ব্র্যান্ডিং (**V2/Business**): শুধু `--color-primary` ও লোগো পরিবর্তনযোগ্য; সিস্টেম contrast যাচাই করে (প্রয়োজনে ফল-ব্যাক রঙ)। বাকি টোকেন locked।

---

## 6. কম্পোনেন্ট লাইব্রেরি ও স্টেট

ভিত্তি: **shadcn/ui** (Radix primitives) + Tailwind v4 theme টোকেন। সব কম্পোনেন্ট `packages/ui` এ।

### 6.1 Button

| Variant | ব্যবহার |
|---|---|
| `primary` | পেজের প্রধান অ্যাকশন (পেজে একটাই) |
| `secondary` | গৌণ |
| `outline` | তৃতীয় |
| `ghost` | টুলবার |
| `danger` | ধ্বংসাত্মক/VOID |
| `link` | ইনলাইন |

সাইজ: `sm=36px`, `md=44px (ডিফল্ট)`, `lg=52px`। প্রতিটির স্টেট:

| State | আচরণ |
|---|---|
| default | টোকেন রঙ |
| hover | `primary-hover` / bg 4% গাঢ় |
| active | scale `.98` |
| focus-visible | focus ring |
| disabled | `text-disabled`, opacity 0.6, pointer-events none |
| loading | spinner + লেবেল ধূসর, ক্লিক বন্ধ, `aria-busy=true` |

### 6.2 Input / Select / Textarea / Phone / Money input

স্টেট: `default, hover, focus, filled, error, disabled, readonly`।
- Label সবসময় উপরে (placeholder দিয়ে label নয়); required চিহ্ন `*`।
- Error: বর্ডার `danger`, নিচে বার্তা + আইকন, `aria-invalid`।
- **Money input:** ডানে-সারিবদ্ধ, `inputmode="decimal"`, ৳ প্রিফিক্স, ২ দশমিক, বাংলা সংখ্যা ইনপুট ইংরেজিতে normalize।
- **Phone input:** `+880` প্রিফিক্স, `01XXXXXXXXX` ফরম্যাট যাচাই (১১ সংখ্যা, 013-019 অপারেটর কোড)।
- **Date input:** native `type=date` নয়; shadcn date-picker, বাংলা মাসের নাম।

### 6.3 Table / DataGrid
- Sticky header, row hover `surface-alt`, selected `primary-soft`।
- মোবাইলে টেবিল **কার্ড তালিকা**য় রূপান্তরিত।
- স্টেট: loading (skeleton ৫ সারি), empty (আইকন+বার্তা+CTA), error (বার্তা+retry), populated।
- টাকার কলাম ডানে-সারিবদ্ধ, `tabular-nums`।

### 6.4 Badge / StatusPill
`bg = status.bg`, `fg = status.fg`, আইকন + লেবেল, `radius=full`, `text-caption`।

### 6.5 Card, KPI Card
KPI: শিরোনাম (`caption`, muted), মান (`money-lg`), ট্রেন্ড ঐচ্ছিক। ক্লিকযোগ্য হলে hover এ `shadow-md` ও focus ring।

### 6.6 Modal / Dialog / Drawer
- ডেস্কটপে মাঝের মোডাল (`xl` radius); মোবাইলে নিচ থেকে sheet।
- ESC ও backdrop ক্লিকে বন্ধ (destructive কনফার্মে backdrop বন্ধ নয়)।
- Focus trap, বন্ধ হলে ট্রিগারে focus ফেরত।
- Destructive কনফার্ম: লাল বাটন + কারণ textarea (বাধ্যতামূলক হলে)।

### 6.7 Toast
উপরে-ডানে (মোবাইলে উপরে-মাঝে)। `success` ৪s, `info` ৪s, `error`/`warning` ম্যানুয়ালি বন্ধ। `role="status"` / `alert`।

### 6.8 Navigation
Sidebar, Bottom-nav (৫ আইটেম max), Breadcrumb (ডিটেইল পেজে), Tabs (URL-synced), Property Switcher (combobox)।

### 6.9 EmptyState / ErrorState / Skeleton
- EmptyState: আইকন (48px, muted) + h3 + body-sm বর্ণনা + প্রধান CTA।
- ErrorState: আইকন (danger) + বার্তা + [আবার চেষ্টা] + error ID।
- Skeleton: `surface-alt` + shimmer (reduced-motion এ স্থির)।

### 6.10 Form pattern
- একক কলাম মোবাইলে; কনটেন্ট গ্রুপ কার্ডে।
- Sticky অ্যাকশন বার (মোবাইলে নিচে): [বাতিল] [সংরক্ষণ]।
- Autosave নয়; অসংরক্ষিত পরিবর্তনে সতর্কতা।

### 6.11 Wizard / Stepper
স্টেপ ইন্ডিকেটর (সংখ্যা + লেবেল; মোবাইলে "ধাপ ২/৫")। পিছনে যাওয়া সর্বদা সম্ভব ও ডাটা সংরক্ষিত।

### 6.12 FileUpload
ড্র্যাগ-ড্রপ + ক্যামেরা বাটন (মোবাইল); ছবি ক্লায়েন্ট-সাইডে ১৬০০px/≤৫০০KB এ কমপ্রেস; progress; ব্যর্থতায় retry। অনুমোদিত: jpg/png/webp/pdf; সর্বোচ্চ ৫MB।

### 6.13 Receipt / Invoice PDF layout
A5/A4, উপরে tenant লোগো ও নাম, রিসিট নম্বর, তারিখ, renter, space, লাইন আইটেম, পরিশোধিত পরিমাণ, বাকি, পদ্ধতি/reference; বাংলা সংখ্যা ও ফন্ট এম্বেড; footer এ "Powered by Basha Desk" (Starter/Pro) বা কাস্টম (Business+)।

---

## 7. Accessibility চেকলিস্ট (WCAG 2.1 AA লক্ষ্য)

- [ ] সব ইন্টারঅ্যাক্টিভ এলিমেন্ট কীবোর্ডে চালানো যায়
- [ ] Focus ring সবসময় দৃশ্যমান
- [ ] ইনপুটে `label` বা `aria-label`
- [ ] Error বার্তা `aria-describedby` এ যুক্ত
- [ ] আইকন-একক বাটনে `aria-label`
- [ ] ছবিতে `alt`
- [ ] রঙ ছাড়াও status বোঝা যায়
- [ ] ৪০০% জুমে কনটেন্ট ভাঙে না
- [ ] `lang="bn"` / `lang="en"` সঠিক

## 8. i18n নিয়ম

- সব UI স্ট্রিং `messages/bn.json` ও `messages/en.json` এ (`next-intl`); কম্পোনেন্টে hardcoded টেক্সট নিষেধ।
- কী নামকরণ: `module.screen.element` (`invoices.list.empty.title`)।
- বহুবচন ও সংখ্যা ICU message format দিয়ে।
- ডিফল্ট ভাষা: workspace সেটিং, ইউজার প্রোফাইল ওভাররাইড করতে পারে।
- Error কোড (`ERR_*`) → বাংলা/ইংরেজি বার্তা ম্যাপ `packages/shared/errors` এ।
