# Basha Desk — Frontend Architecture & Package Guide

> **Status:** Recommended frontend implementation guide  
> **Source of truth:** `docs/03_UI_Spec.md`, `docs/04_TRD.md`, `docs/02_AppFlow.md`, and `docs/01_PRD.md`  
> **Language:** Bengali-first, with English support  
> **Goal:** Fast, accessible, maintainable marketing website and multi-tenant SaaS application.

---

## 1. Frontend goals

Basha Desk will use **one Next.js application** with separate route groups/layouts for its different product surfaces:

1. Marketing website
2. Tenant workspace (main property/rental management software)
3. Platform administration
4. Renter portal

The frontend should be:

- Mobile-first, starting at 360px.
- Bengali-first, with English language switching.
- Fast on mobile networks and modest devices.
- Accessible, keyboard-friendly, and touch-friendly.
- Multi-tenant aware; tenant context must be resolved and validated by the server.
- Consistent with the locked Basha Desk design tokens.
- Careful with financial data, caching, and offline behavior.

## 2. Locked core stack

These major versions follow `docs/04_TRD.md` §1.2. Install the latest compatible patch/minor release within each approved major, and commit the lockfile.

| Area | Package / technology | Version target | Responsibility |
|---|---|---:|---|
| Framework | `next` | 16.x | App Router, server rendering, routing |
| UI runtime | `react`, `react-dom` | 19.x | Component runtime |
| Language | `typescript` | 5.9+ | Strict type safety |
| Styling | `tailwindcss`, `@tailwindcss/postcss` | 4.x | Utility styling and design tokens |
| UI components | shadcn/ui + Radix UI | Current compatible | Accessible, reusable primitives |
| Icons | `lucide-react` | Latest compatible | Consistent icon set |
| Forms | `react-hook-form` | 7.x | Form state and validation UX |
| Validation | `zod` | 4.x | Shared client/server schemas |
| Form resolver | `@hookform/resolvers` | Compatible | RHF + Zod integration |
| Server state | `@tanstack/react-query` | 5.x | API cache, fetching, mutations |
| Client UI state | `zustand` | 5.x | Small global UI state only |
| Localization | `next-intl` | 4.x | Bengali/English messages and routing |
| Theme | `next-themes` | 0.4.x | System/light/dark theme |
| Tables | `@tanstack/react-table` | 8.x | Sorting, filtering, pagination, column state |
| Charts | `recharts` | 3.x | Dashboard visualizations |
| Dates | `date-fns`, `date-fns-tz` | 4.x | Date formatting and timezone handling |
| PWA | `@serwist/next` | Latest compatible stable | Service worker and installability |

### Important implementation rule

Use **React Server Components by default**. Add `"use client"` only to components that require browser interaction, local state, effects, or event handlers. Do not turn entire route trees into client components unnecessarily.

## 3. Additional recommended packages

These are implementation recommendations, not all explicitly locked in the source TRD. Add them only when the corresponding feature is implemented.

| Package | Why / where to use |
|---|---|
| `clsx` | Conditional class names |
| `tailwind-merge` | Merge Tailwind classes safely |
| `class-variance-authority` | Reusable component variants |
| `sonner` | Toast notifications |
| `cmdk` | Command palette / quick navigation |
| `react-day-picker` | Calendar/date-picker foundation if required by the selected shadcn component |
| `react-number-format` | Formatted numeric input where useful |
| `@tanstack/react-virtual` | Virtualize very large tables/lists |
| `date-fns-tz` | Keep timezone conversion explicit (also listed in the locked stack) |
| `@sentry/nextjs` | Production error monitoring, if Sentry is selected |
| `web-vitals` | Collect Core Web Vitals |
| `@next/bundle-analyzer` | Inspect client bundle size |
| `vitest` | Unit/component tests |
| `@testing-library/react` | Component behavior tests |
| `@testing-library/user-event` | Realistic user interaction tests |
| `@playwright/test` | End-to-end and browser tests |
| `@axe-core/playwright` | Automated accessibility checks in browser tests |
| `openapi-typescript` | Generate TypeScript API types if the backend publishes an OpenAPI document |
| `openapi-fetch` | Typed API client when using generated OpenAPI types |

`sharp` is generally handled by Next.js image optimization deployment requirements; add/configure it only if the chosen deployment target requires it. Do not add a second component framework such as MUI, Ant Design, or Bootstrap alongside shadcn/ui.

## 4. Installation

The repository is planned as an npm workspaces + Turborepo monorepo. Run commands from the repository root unless noted. Configure `apps/web` as the `web` workspace in the root `package.json` before using the workspace commands below.

### 4.1 Create the web application

If `apps/web` has not been created yet, scaffold it with the Next.js App Router and TypeScript, then move/align it with the monorepo structure in section 5.

Example scaffold command:

```bash
npm create next-app@latest apps/web
```

Choose TypeScript, ESLint, Tailwind CSS, App Router, and `src/` when prompted. Review generated configuration before merging it into the monorepo; do not overwrite existing root workspace files blindly.

### 4.2 Install core runtime packages

```bash
npm install --workspace=web next@^16 react@^19 react-dom@^19
npm install --workspace=web lucide-react next-themes
npm install --workspace=web react-hook-form zod@^4 @hookform/resolvers
npm install --workspace=web @tanstack/react-query@^5 zustand@^5
npm install --workspace=web next-intl@^4
npm install --workspace=web @tanstack/react-table@^8 recharts@^3
npm install --workspace=web date-fns@^4 date-fns-tz@^4
```

### 4.3 Install styling and utility packages

```bash
npm install --workspace=web tailwindcss@^4 @tailwindcss/postcss
npm install --workspace=web clsx tailwind-merge class-variance-authority sonner
```

### 4.4 Install optional packages when needed

```bash
# Large data tables
npm install --workspace=web @tanstack/react-virtual

# Command palette
npm install --workspace=web cmdk

# Numeric inputs
npm install --workspace=web react-number-format

# PWA — add only when offline/read-cache requirements are implemented
npm install --workspace=web @serwist/next

# Monitoring and performance
npm install --workspace=web @sentry/nextjs web-vitals

# OpenAPI client — only if backend OpenAPI is available
npm install --workspace=web openapi-fetch
npm install -D openapi-typescript
```

### 4.5 Install development/test packages

```bash
npm install --workspace=web -D vitest @testing-library/react @testing-library/user-event
npm install --workspace=web -D @playwright/test @axe-core/playwright
npm install --workspace=web -D @next/bundle-analyzer
```

Install and configure shadcn/ui using its CLI, then add only the components actually used by the product:

```bash
npx shadcn@latest init
```

> **Note:** shadcn/ui is a component source/code-generation workflow, not a single runtime component package. Keep the generated components in `packages/ui` as specified by the UI spec.

## 5. Recommended monorepo folder structure

This structure follows `docs/04_TRD.md` §3 and extends the web app folders with practical feature organization. Keep the root workspace and existing backend layout aligned with the repository's actual state.

```text
bashadesk/
├── apps/
│   ├── web/                         # Next.js 16 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (marketing)/     # Public SEO pages
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── pricing/
│   │   │   │   │   ├── features/
│   │   │   │   │   ├── about/
│   │   │   │   │   └── contact/
│   │   │   │   ├── (platform)/      # Basha Desk operator/admin surface
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── platform/
│   │   │   │   ├── (workspace)/     # Tenant property/rental software
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── workspace/
│   │   │   │   │       ├── dashboard/
│   │   │   │   │       ├── properties/
│   │   │   │   │       ├── buildings/
│   │   │   │   │       ├── spaces/
│   │   │   │   │       ├── renters/
│   │   │   │   │       ├── agreements/
│   │   │   │   │       ├── invoices/
│   │   │   │   │       ├── payments/
│   │   │   │   │       ├── expenses/
│   │   │   │   │       ├── maintenance/
│   │   │   │   │       ├── notices/
│   │   │   │   │       ├── reports/
│   │   │   │   │       └── settings/
│   │   │   │   ├── (portal)/        # Renter-facing portal
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   └── portal/
│   │   │   │   └── api/             # Only lightweight web callbacks/health as needed
│   │   │   ├── middleware.ts        # Host/path → surface and tenant resolution
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── properties/
│   │   │   │   ├── buildings/
│   │   │   │   ├── spaces/
│   │   │   │   ├── renters/
│   │   │   │   ├── agreements/
│   │   │   │   ├── billing/
│   │   │   │   ├── payments/
│   │   │   │   ├── expenses/
│   │   │   │   ├── maintenance/
│   │   │   │   ├── notices/
│   │   │   │   ├── reports/
│   │   │   │   └── platform/
│   │   │   ├── components/          # Web-only composition/layout components
│   │   │   ├── hooks/               # Web-only hooks
│   │   │   ├── lib/
│   │   │   │   ├── api-client/
│   │   │   │   ├── auth/
│   │   │   │   ├── format/
│   │   │   │   ├── i18n/
│   │   │   │   └── query/
│   │   │   ├── messages/
│   │   │   │   ├── bn.json
│   │   │   │   └── en.json
│   │   │   └── styles/
│   │   ├── public/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── manifest.webmanifest
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── api/                         # Backend API app (per final backend decision)
│   └── worker/                      # Background jobs (per final backend decision)
│
├── packages/
│   ├── ui/                          # Shared shadcn-based design system
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── patterns/
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   └── package.json
│   ├── shared/                      # Framework-neutral shared contracts
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   ├── enums/
│   │   │   ├── errors/
│   │   │   └── money/
│   │   └── package.json
│   ├── config/                      # Shared lint/TS/Tailwind configuration
│   └── testing/                     # Shared test helpers/fixtures
│
├── docs/
│   ├── 01_PRD.md
│   ├── 02_AppFlow.md
│   ├── 03_UI_Spec.md
│   ├── 04_TRD.md
│   ├── 05_Schema.md
│   ├── 06_Plan.md
│   └── adr/
│
├── .github/workflows/
├── package.json
├── package.json                    # npm workspaces configuration
├── turbo.json
├── tsconfig.base.json
└── README.md
```

### Folder responsibilities

| Folder | Responsibility |
|---|---|
| `app/` | Route definitions, layouts, loading/error boundaries, metadata |
| `features/<module>/` | Module-specific components, hooks, API functions, schemas |
| `components/` | Shared web-only layout and composition components |
| `lib/api-client/` | API client, request handling, response normalization |
| `lib/query/` | Query client and query key conventions |
| `messages/` | Bengali and English translation dictionaries |
| `packages/ui` | Reusable visual components and design tokens |
| `packages/shared` | Shared Zod schemas, types, enums, error codes, money helpers |
| `packages/config` | Shared development/build configuration |
| `packages/testing` | Reusable fixtures and test utilities |

**Import boundary:** Apps may import shared packages. Do not import one app from another. `packages/shared` must remain framework-neutral and must not depend on React or Node-only APIs.

## 6. Feature module convention

Keep each business feature self-contained. Example:

```text
src/features/invoices/
├── api/
│   ├── get-invoices.ts
│   ├── get-invoice.ts
│   └── create-invoice.ts
├── components/
│   ├── invoice-table.tsx
│   ├── invoice-filters.tsx
│   ├── invoice-form.tsx
│   └── invoice-status-badge.tsx
├── hooks/
│   ├── use-invoices.ts
│   └── use-create-invoice.ts
├── schemas/
│   └── invoice-form.schema.ts
├── types/
│   └── invoice.types.ts
└── index.ts
```

Repeat the convention only where it adds clarity; do not create empty folders for every module at the beginning.

## 7. Data fetching and state rules

### Server state — TanStack Query

Use TanStack Query for interactive API-backed data that benefits from caching, refetching, pagination, or mutations:

- Property, building, and space lists.
- Renter and agreement records.
- Invoice and payment lists.
- Maintenance requests.
- Report filters and results.

Use server-side fetching for initial page data where it improves first render. Hydrate the client query cache only when the page needs subsequent client-side interactions.

### Client state — Zustand

Use Zustand only for small UI state, for example:

- Sidebar collapsed/expanded.
- Temporary multi-step form UI state.
- Table column preferences.
- Open command palette.
- Non-sensitive UI preferences.

Do not copy API records into Zustand. Do not use Zustand as a replacement for TanStack Query.

### Query key and tenant isolation

Every tenant-scoped query key must include the validated tenant identity/context, for example:

```ts
['tenant', tenantId, 'invoices', filters]
```

Never rely on a client-provided tenant ID as authorization. The backend must derive/validate tenant access from the authenticated session and request host/context. Clear or invalidate tenant-scoped cache on logout, tenant switch, or session change.

Never place private tenant data in a shared public cache. Configure server caching deliberately for authenticated and tenant-specific responses.

## 8. Forms and validation

- Use React Hook Form for complex forms.
- Use Zod schemas from `packages/shared` where the schema is genuinely shared.
- Client validation improves user experience; server validation remains mandatory.
- Keep money values precise. Do not use JavaScript floating-point arithmetic for financial calculations.
- Keep API money representation consistent with the backend contract (the TRD specifies decimal handling and JSON strings for money).
- Show field-level Bengali/English validation messages.
- Prevent duplicate submissions while a request is pending.
- Use explicit confirmation for destructive or irreversible actions.

## 9. Design system rules — must follow `03_UI_Spec.md`

### Brand colors

Use CSS variables/design tokens. Do not hardcode color values inside components.

| Token | Light | Dark |
|---|---|---|
| Primary | `#114F4D` | `#4FC3B8` |
| Primary hover | `#0B3B39` | `#7AD7CE` |
| Accent | `#E6A34B` | `#F2BB6B` |
| Background | `#F7FAF9` | `#0A1514` |
| Surface | `#FFFFFF` | `#102120` |
| Text | `#0F1F1E` | `#E5F0EE` |

Use the complete locked palette and semantic status colors from `03_UI_Spec.md`; the abbreviated table above is not a replacement for that document.

### Typography

Load fonts with `next/font` (self-hosted):

- Baloo Da 2: display/marketing headings only.
- Hind Siliguri: Bengali UI/body.
- Inter: Latin UI and numeric text.
- JetBrains Mono: reference IDs.

Use the weights and fallbacks specified in `03_UI_Spec.md`. Do not use the display font for tables, forms, or financial numbers.

### Responsive and accessibility rules

- Design from 360px mobile width.
- Minimum touch target: 44×44px.
- Form fields: one column on mobile, two columns from the specified `md` breakpoint where appropriate.
- Keep visible keyboard focus indicators.
- Meet the contrast requirements in `03_UI_Spec.md`.
- Status must use text/icon as well as color.
- Respect `prefers-reduced-motion`.
- Inputs must remain at least 16px to avoid unwanted mobile browser zoom.

### Money and date display

Use `Intl.NumberFormat` with `bn-BD` or `en-BD` based on the user's language preference. Follow the UI spec for BDT symbol, two decimal places, Bangladesh lakh/crore grouping, and `Asia/Dhaka` timezone. Do not write custom number-grouping logic.

## 10. Performance rules

1. Prefer Server Components for static and data-first UI.
2. Keep client components small and close to the interaction that needs them.
3. Lazy-load heavy charts, rich editors, and rarely opened dialogs.
4. Paginate server-side for large datasets; virtualize only when the visible list still needs many rows.
5. Avoid loading every dashboard chart and table before it is visible.
6. Use `next/image` for suitable images and provide dimensions/priority intentionally.
7. Use `next/font` to self-host the approved fonts.
8. Avoid duplicate UI libraries and overlapping utility packages.
9. Analyze production bundles before adding large dependencies.
10. Measure real-user Core Web Vitals; do not claim speed based only on local development.
11. Keep marketing pages statically renderable where content allows.
12. Keep authenticated tenant data out of public/shared caches.

## 11. PWA and offline policy

Serwist is the planned service-worker option. Implement PWA only after defining and testing the caching policy.

Allowed direction from the architecture:

- Installable web app.
- Offline cache for carefully selected read-only/static content.
- No offline write operations.

Never queue or submit offline financial actions such as rent payment, receipt creation, invoice issue, refund, or ledger mutation without a separately designed and reviewed synchronization/idempotency architecture. Do not cache sensitive tenant responses in a way that can expose one tenant's data to another user on a shared device.

## 12. Testing strategy

| Test level | Tool | What to test |
|---|---|---|
| Unit | Vitest | Formatters, utilities, pure functions |
| Component | Testing Library | Forms, tables, dialogs, status components |
| E2E | Playwright | Login, tenant routing, core workflows |
| Accessibility | axe + Playwright | Keyboard, labels, contrast-related checks |
| Performance | Lighthouse / Web Vitals | Marketing and authenticated routes |
| Security-oriented UI tests | Playwright | Tenant switch, logout cache clearing, permission-based navigation |

Important frontend scenarios:

- A user cannot see another tenant's data after switching workspace.
- Logout clears private client-side cache.
- Unauthorized actions are not exposed as usable controls (backend authorization is still authoritative).
- Payment forms prevent accidental double-click submissions.
- Bengali and English layouts both work at mobile widths.
- Date and money formatting use the selected locale and timezone.

## 13. Suggested implementation order

1. Set up the npm workspaces/Turborepo workspace and `apps/web`.
2. Configure Next.js App Router, strict TypeScript, Tailwind CSS 4.
3. Implement design tokens, fonts, theme, and `packages/ui`.
4. Build surface routing/layouts: marketing, platform, workspace, portal.
5. Implement localization (`bn`, `en`) and formatting helpers.
6. Build API client and shared Zod contracts in `packages/shared`.
7. Add authentication/session-aware tenant context and safe cache boundaries.
8. Implement core workspace modules in business priority order.
9. Add tables, forms, charts, and reporting progressively.
10. Add PWA read-only behavior only after cache/security review.
11. Add tests, bundle analysis, and production monitoring.

## 14. Existing backend alignment — decision required

The uploaded `04_TRD.md` describes the target backend as **NestJS 11 + Fastify 5 + Drizzle ORM**. The uploaded backend ZIP currently contains **Express 5 + Prisma 7**.

This README intentionally does not silently change that backend decision. The frontend can consume a documented HTTP API either way, but before implementing generated API clients or shared server contracts, the project should decide whether:

- the backend will be migrated to the TRD target; or
- the TRD will be updated to reflect the existing Express/Prisma implementation.

Keep API contracts explicit. Do not import backend-only modules into the browser bundle.

## 15. Source documents

This guide is based primarily on:

- `docs/04_TRD.md` — §1.2 Frontend, §3 Monorepo folder structure.
- `docs/03_UI_Spec.md` — design tokens, typography, responsive rules, component system, theme, money/date formatting.
- `docs/02_AppFlow.md` — single Next.js app and host-based surface selection.
- `docs/01_PRD.md` — product surfaces and business capabilities.

When this guide and the locked UI specification differ, the source design tokens in `03_UI_Spec.md` take precedence.
