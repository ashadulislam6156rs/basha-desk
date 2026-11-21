// =====================================================================================
// Basha Desk — prisma/seed.ts   (idempotent: বারবার চালালে ডুপ্লিকেট হয় না)
//
// যা সিড হয়:
//   1. PlatformPermission  (আমাদের অ্যাডমিন প্যানেলের module × action)
//   2. PlatformRole        (SUPER_ADMIN [bypass], SUPPORT_AGENT, BILLING_MANAGER) + role→permission
//   3. Permission          (ক্লায়েন্টের module × action, scopeType সহ)
//   4. Role (tenantId = NULL, isSystem) : OWNER, MANAGER, ACCOUNTANT, CARETAKER, VIEWER, RENTER
//   5. Plan + PlanEntitlement  (⚠ দাম/লিমিট placeholder — আপনার আসল প্ল্যান অনুযায়ী বদলান)
//   6. ReservedSlug
//   7. প্রথম Super Admin PlatformUser  (শুধু SEED_SUPER_ADMIN_EMAIL / _PASSWORD সেট থাকলে)
//
// চালানো:  npx prisma db seed
// ⚠ RLS: সিড এমন DB role দিয়ে চালান যা RLS bypass করে (table owner / superuser),
//   নইলে roles (tenant_id NULL) ইত্যাদিতে insert আটকাতে পারে।
// ⚠ নতুন tenant তৈরির সময় প্রতি-tenant ডিফল্ট (ChargeType, LedgerAccount, ExpenseCategory,
//   Owner role→membership) আলাদা: prisma/tenant-defaults.ts এর seedTenantDefaults()।
// =====================================================================================

import {
  PrismaClient,
  PermissionAction as A,
  PermissionScopeType as S,
} from '@prisma/client';
import * as argon2 from 'argon2'; // আপনার auth যে hasher ব্যবহার করে সেটাই রাখুন (bcrypt হলে বদলান)

const prisma = new PrismaClient();

// ------------------------------------------------------------------------------------
// Action লেবেল (UI matrix এর কলাম)
// ------------------------------------------------------------------------------------
const ACTION_BN: Record<A, string> = {
  VIEW: 'দেখা',
  CREATE: 'তৈরি',
  EDIT: 'সম্পাদনা',
  DELETE: 'মুছে ফেলা',
  ARCHIVE: 'আর্কাইভ',
  RESTORE: 'পুনরুদ্ধার',
  RESET: 'রিসেট',
  APPROVE: 'অনুমোদন',
  VOID: 'বাতিল (ভয়েড)',
  EXPORT: 'এক্সপোর্ট',
  IMPORT: 'ইমপোর্ট',
  ASSIGN: 'অ্যাসাইন',
};
const ACTION_EN: Record<A, string> = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  ARCHIVE: 'Archive',
  RESTORE: 'Restore',
  RESET: 'Reset',
  APPROVE: 'Approve',
  VOID: 'Void',
  EXPORT: 'Export',
  IMPORT: 'Import',
  ASSIGN: 'Assign',
};

type ModuleDef = {
  module: string;
  labelBn: string;
  labelEn: string;
  scope: S; // মডিউলের ডিফল্ট scope (শুধু tenant permission এ অর্থবহ)
  actions: A[];
  scopeOverride?: Partial<Record<A, S>>;
};

const code = (module: string, action: A) => `${module}.${action.toLowerCase()}`;

// ------------------------------------------------------------------------------------
// 1) PLATFORM permission catalog
// ------------------------------------------------------------------------------------
const PLATFORM_MODULES: ModuleDef[] = [
  { module: 'tenant', labelBn: 'ক্লায়েন্ট (Tenant)', labelEn: 'Tenants', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESTORE, A.EXPORT] },
  { module: 'tenant_domain', labelBn: 'ডোমেইন', labelEn: 'Domains', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE] },
  { module: 'plan', labelBn: 'প্ল্যান', labelEn: 'Plans', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.ARCHIVE] },
  { module: 'subscription', labelBn: 'সাবস্ক্রিপশন', labelEn: 'Subscriptions', scope: S.GLOBAL, actions: [A.VIEW, A.EDIT] },
  { module: 'platform_billing', labelBn: 'প্ল্যাটফর্ম বিলিং', labelEn: 'Platform Billing', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.VOID, A.EXPORT] },
  { module: 'platform_user', labelBn: 'প্ল্যাটফর্ম ইউজার', labelEn: 'Platform Users', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESET, A.ASSIGN] },
  { module: 'platform_role', labelBn: 'প্ল্যাটফর্ম রোল ও পারমিশন', labelEn: 'Platform Roles', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE] },
  { module: 'support_access', labelBn: 'সাপোর্ট অ্যাক্সেস', labelEn: 'Support Access', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.DELETE] }, // CREATE = grant, DELETE = revoke
  { module: 'audit_log', labelBn: 'অডিট লগ', labelEn: 'Audit Logs', scope: S.GLOBAL, actions: [A.VIEW, A.EXPORT] },
  { module: 'feature_flag', labelBn: 'ফিচার ফ্ল্যাগ', labelEn: 'Feature Flags', scope: S.GLOBAL, actions: [A.VIEW, A.EDIT] },
  { module: 'system_settings', labelBn: 'সিস্টেম সেটিংস', labelEn: 'System Settings', scope: S.GLOBAL, actions: [A.VIEW, A.EDIT] },
];

// ------------------------------------------------------------------------------------
// 2) TENANT permission catalog
// ------------------------------------------------------------------------------------
const TENANT_MODULES: ModuleDef[] = [
  { module: 'property', labelBn: 'প্রপার্টি', labelEn: 'Properties', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESTORE, A.IMPORT, A.EXPORT], scopeOverride: { CREATE: S.GLOBAL, IMPORT: S.GLOBAL } },
  { module: 'space', labelBn: 'স্পেস (ফ্ল্যাট/দোকান)', labelEn: 'Spaces', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESTORE, A.IMPORT, A.EXPORT] },
  { module: 'renter', labelBn: 'ভাড়াটিয়া', labelEn: 'Renters', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESTORE, A.IMPORT, A.EXPORT], scopeOverride: { CREATE: S.GLOBAL, IMPORT: S.GLOBAL } }, // property দিয়ে ফিল্টার = agreement এর মাধ্যমে (অ্যাপ লেয়ার)
  { module: 'agreement', labelBn: 'চুক্তি', labelEn: 'Agreements', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.APPROVE, A.VOID, A.EXPORT] }, // APPROVE = activate, VOID = cancel
  { module: 'invoice', labelBn: 'ইনভয়েস', labelEn: 'Invoices', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.APPROVE, A.VOID, A.EXPORT] }, // APPROVE = issue; DELETE শুধু DRAFT
  { module: 'payment', labelBn: 'পেমেন্ট', labelEn: 'Payments', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.VOID, A.EXPORT] }, // immutable, তাই EDIT নেই
  { module: 'deposit', labelBn: 'সিকিউরিটি ডিপোজিট', labelEn: 'Security Deposits', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.APPROVE, A.EXPORT] }, // APPROVE = refund/forfeit
  { module: 'expense', labelBn: 'খরচ', labelEn: 'Expenses', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.VOID, A.EXPORT] },
  { module: 'ledger', labelBn: 'হিসাবখাতা (লেজার)', labelEn: 'Ledger', scope: S.GLOBAL, actions: [A.VIEW, A.EXPORT] },
  { module: 'report', labelBn: 'রিপোর্ট', labelEn: 'Reports', scope: S.PROPERTY, actions: [A.VIEW, A.EXPORT] },
  { module: 'maintenance', labelBn: 'রক্ষণাবেক্ষণ', labelEn: 'Maintenance', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ASSIGN, A.EXPORT] },
  { module: 'notice', labelBn: 'নোটিশ', labelEn: 'Notices', scope: S.PROPERTY, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE] },
  { module: 'document', labelBn: 'ডকুমেন্ট', labelEn: 'Documents', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.DELETE] },
  { module: 'import', labelBn: 'ডেটা ইমপোর্ট', labelEn: 'Data Import', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE] },
  { module: 'staff_user', labelBn: 'স্টাফ ইউজার', labelEn: 'Staff Users', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ARCHIVE, A.RESET, A.ASSIGN] }, // ARCHIVE = deactivate, RESET = password reset, ASSIGN = role/property assign
  { module: 'role', labelBn: 'রোল ও পারমিশন', labelEn: 'Roles & Permissions', scope: S.GLOBAL, actions: [A.VIEW, A.CREATE, A.EDIT, A.DELETE, A.ASSIGN] },
  { module: 'settings', labelBn: 'সেটিংস', labelEn: 'Settings', scope: S.GLOBAL, actions: [A.VIEW, A.EDIT] },
  { module: 'subscription', labelBn: 'সাবস্ক্রিপশন/প্ল্যান', labelEn: 'Subscription', scope: S.GLOBAL, actions: [A.VIEW] },
  { module: 'audit_log', labelBn: 'অডিট লগ', labelEn: 'Audit Logs', scope: S.GLOBAL, actions: [A.VIEW, A.EXPORT] },
  { module: 'portal', labelBn: 'ভাড়াটিয়া পোর্টাল', labelEn: 'Renter Portal', scope: S.GLOBAL, actions: [A.VIEW] }, // পোর্টালের সব এন্ডপয়েন্ট নিজের ডেটায় সীমিত (অ্যাপ লেয়ার)
];

const allCodes = (mods: ModuleDef[]) =>
  mods.flatMap((m) => m.actions.map((a) => code(m.module, a)));

// ------------------------------------------------------------------------------------
// 3) ROLE definitions
// ------------------------------------------------------------------------------------
type RoleDef = {
  code: string;
  nameBn: string;
  nameEn: string;
  description: string;
  permissions: string[];
};

// ---- Platform roles ----
const PLATFORM_ALL = allCodes(PLATFORM_MODULES);

const PLATFORM_ROLES: (RoleDef & { isSuperAdmin?: boolean })[] = [
  {
    code: 'SUPER_ADMIN',
    nameBn: 'সুপার অ্যাডমিন',
    nameEn: 'Super Admin',
    description: 'পূর্ণ অ্যাক্সেস। isSuperAdmin = true, তাই permission row লাগে না (সব চেক bypass)।',
    isSuperAdmin: true,
    permissions: [],
  },
  {
    code: 'SUPPORT_AGENT',
    nameBn: 'সাপোর্ট এজেন্ট',
    nameEn: 'Support Agent',
    description: 'ক্লায়েন্ট/ডোমেইন/সাবস্ক্রিপশন দেখা; অনুমতি পেলে সাপোর্ট অ্যাক্সেসে ঢোকা।',
    permissions: [
      'tenant.view', 'tenant_domain.view', 'plan.view', 'subscription.view',
      'support_access.view', 'audit_log.view',
    ],
  },
  {
    code: 'BILLING_MANAGER',
    nameBn: 'বিলিং ম্যানেজার',
    nameEn: 'Billing Manager',
    description: 'প্ল্যাটফর্ম ইনভয়েস/পেমেন্ট ও সাবস্ক্রিপশন পরিচালনা।',
    permissions: [
      'tenant.view', 'plan.view', 'subscription.view', 'subscription.edit',
      'platform_billing.view', 'platform_billing.create', 'platform_billing.edit',
      'platform_billing.void', 'platform_billing.export', 'audit_log.view',
    ],
  },
];

// ---- Tenant (system) roles ----
const TENANT_ALL = allCodes(TENANT_MODULES);
const only = (...mods: string[]) => TENANT_ALL.filter((c) => mods.includes(c.split('.')[0]));

const TENANT_ROLES: RoleDef[] = [
  {
    code: 'OWNER',
    nameBn: 'মালিক',
    nameEn: 'Owner',
    description: 'ক্লায়েন্টের সব পারমিশন। নতুন tenant এর প্রথম ইউজারকে এই রোল + scopeAll = true দিন।',
    permissions: TENANT_ALL,
  },
  {
    code: 'MANAGER',
    nameBn: 'ম্যানেজার',
    nameEn: 'Manager',
    description: 'দৈনন্দিন ব্যবস্থাপনা; রোল/সেটিংস/সাবস্ক্রিপশন বাদে প্রায় সবকিছু।',
    permissions: TENANT_ALL.filter(
      (c) =>
        !['role', 'subscription'].includes(c.split('.')[0]) &&
        !['settings.edit', 'staff_user.delete', 'property.delete', 'portal.view'].includes(c),
    ),
  },
  {
    code: 'ACCOUNTANT',
    nameBn: 'হিসাবরক্ষক',
    nameEn: 'Accountant',
    description: 'ইনভয়েস, পেমেন্ট, ডিপোজিট, খরচ, লেজার ও রিপোর্ট।',
    permissions: [
      ...only('invoice', 'payment', 'deposit', 'expense', 'ledger', 'report'),
      'property.view', 'space.view', 'renter.view', 'agreement.view', 'document.view', 'document.create',
    ],
  },
  {
    code: 'CARETAKER',
    nameBn: 'কেয়ারটেকার',
    nameEn: 'Caretaker',
    description: 'রক্ষণাবেক্ষণ অনুরোধ ও নোটিশ দেখা/আপডেট; আর্থিক ডেটা নয়।',
    permissions: [
      'property.view', 'space.view', 'renter.view',
      'maintenance.view', 'maintenance.create', 'maintenance.edit',
      'notice.view', 'document.view', 'document.create',
    ],
  },
  {
    code: 'VIEWER',
    nameBn: 'শুধু দেখা (Viewer)',
    nameEn: 'Viewer',
    description: 'সব মডিউল দেখতে পারবে, কিছু বদলাতে পারবে না।',
    permissions: TENANT_ALL.filter(
      (c) =>
        c.endsWith('.view') &&
        !['staff_user', 'role', 'settings', 'audit_log', 'subscription', 'portal'].includes(c.split('.')[0]),
    ),
  },
  {
    code: 'RENTER',
    nameBn: 'ভাড়াটিয়া',
    nameEn: 'Renter',
    description: 'ভাড়াটিয়া পোর্টাল। সব এন্ডপয়েন্ট নিজের ডেটায় সীমিত (অ্যাপ লেয়ারে enforce)।',
    permissions: ['portal.view'],
  },
];

// ------------------------------------------------------------------------------------
// 4) PLANS (⚠ placeholder — আপনার আসল প্ল্যান/দাম/লিমিট দিয়ে বদলান)
// ------------------------------------------------------------------------------------
type Ent = { int?: number; bool?: boolean; unlimited?: boolean };
type PlanDef = {
  code: string;
  nameBn: string;
  nameEn: string;
  priceMonthly: number | null;
  entitlements: Record<string, Ent>;
};

const PLANS: PlanDef[] = [
  {
    code: 'TRIAL',
    nameBn: 'ট্রায়াল',
    nameEn: 'Trial',
    priceMonthly: 0,
    entitlements: {
      max_properties: { int: 1 }, max_spaces: { int: 20 }, max_staff_users: { int: 2 },
      sms_monthly: { int: 50 }, custom_domain: { bool: false }, data_import: { bool: true }, ai_assistant: { bool: false },
    },
  },
  {
    code: 'STARTER',
    nameBn: 'স্টার্টার',
    nameEn: 'Starter',
    priceMonthly: 999,
    entitlements: {
      max_properties: { int: 3 }, max_spaces: { int: 60 }, max_staff_users: { int: 3 },
      sms_monthly: { int: 200 }, custom_domain: { bool: false }, data_import: { bool: true }, ai_assistant: { bool: false },
    },
  },
  {
    code: 'PRO',
    nameBn: 'প্রো',
    nameEn: 'Pro',
    priceMonthly: 2499,
    entitlements: {
      max_properties: { int: 15 }, max_spaces: { int: 300 }, max_staff_users: { int: 10 },
      sms_monthly: { int: 1000 }, custom_domain: { bool: true }, data_import: { bool: true }, ai_assistant: { bool: false },
    },
  },
  {
    code: 'BUSINESS',
    nameBn: 'বিজনেস',
    nameEn: 'Business',
    priceMonthly: 5999,
    entitlements: {
      max_properties: { unlimited: true }, max_spaces: { unlimited: true }, max_staff_users: { unlimited: true },
      sms_monthly: { int: 5000 }, custom_domain: { bool: true }, data_import: { bool: true }, ai_assistant: { bool: true },
    },
  },
];

// ------------------------------------------------------------------------------------
// 5) RESERVED SLUGS (tenant subdomain হিসেবে নেওয়া যাবে না)
// ------------------------------------------------------------------------------------
const RESERVED_SLUGS: [string, string][] = [
  ['www', 'system'], ['app', 'system'], ['api', 'system'], ['admin', 'system'],
  ['platform', 'system'], ['superadmin', 'system'], ['dashboard', 'system'], ['portal', 'system'],
  ['login', 'system'], ['signin', 'system'], ['signup', 'system'], ['register', 'system'],
  ['auth', 'system'], ['oauth', 'system'], ['sso', 'system'], ['account', 'system'],
  ['billing', 'system'], ['pay', 'system'], ['payment', 'system'], ['payments', 'system'],
  ['support', 'system'], ['help', 'system'], ['docs', 'system'], ['status', 'system'],
  ['blog', 'system'], ['news', 'system'], ['about', 'system'], ['contact', 'system'],
  ['mail', 'system'], ['email', 'system'], ['smtp', 'system'], ['imap', 'system'], ['pop', 'system'],
  ['ftp', 'system'], ['cdn', 'system'], ['static', 'system'], ['assets', 'system'], ['files', 'system'],
  ['media', 'system'], ['img', 'system'], ['images', 'system'], ['upload', 'system'], ['uploads', 'system'],
  ['dev', 'system'], ['staging', 'system'], ['test', 'system'], ['demo', 'system'], ['sandbox', 'system'],
  ['ns1', 'system'], ['ns2', 'system'], ['localhost', 'system'], ['root', 'system'], ['null', 'system'],
  ['basha', 'brand'], ['bashadesk', 'brand'], ['basha-desk', 'brand'], ['anthropic', 'brand'],
];

// ------------------------------------------------------------------------------------
// SEED FUNCTIONS
// ------------------------------------------------------------------------------------
async function seedPlatformPermissions() {
  let order = 0;
  for (const m of PLATFORM_MODULES) {
    for (const action of m.actions) {
      order += 10;
      const c = code(m.module, action);
      const data = {
        module: m.module,
        action,
        descriptionBn: `${m.labelBn} — ${ACTION_BN[action]}`,
        descriptionEn: `${m.labelEn} — ${ACTION_EN[action]}`,
        sortOrder: order,
      };
      await prisma.platformPermission.upsert({ where: { code: c }, create: { code: c, ...data }, update: data });
    }
  }
  console.log(`✔ PlatformPermission: ${PLATFORM_ALL.length}`);
}

async function seedPlatformRoles() {
  for (const r of PLATFORM_ROLES) {
    const data = {
      nameBn: r.nameBn,
      nameEn: r.nameEn,
      description: r.description,
      isSuperAdmin: !!r.isSuperAdmin,
      isSystem: true,
      isActive: true,
    };
    const role = await prisma.platformRole.upsert({ where: { code: r.code }, create: { code: r.code, ...data }, update: data });

    // system role এর permission সেট সিড দিয়ে নিয়ন্ত্রিত: পুরোটা সিঙ্ক
    await prisma.$transaction([
      prisma.platformRolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.platformRolePermission.createMany({
        data: r.permissions.map((p) => ({ roleId: role.id, permissionCode: p })),
        skipDuplicates: true,
      }),
    ]);
  }
  console.log(`✔ PlatformRole: ${PLATFORM_ROLES.length}`);
}

async function seedTenantPermissions() {
  let order = 0;
  for (const m of TENANT_MODULES) {
    for (const action of m.actions) {
      order += 10;
      const c = code(m.module, action);
      const data = {
        module: m.module,
        action,
        scopeType: m.scopeOverride?.[action] ?? m.scope,
        descriptionBn: `${m.labelBn} — ${ACTION_BN[action]}`,
        descriptionEn: `${m.labelEn} — ${ACTION_EN[action]}`,
        sortOrder: order,
      };
      await prisma.permission.upsert({ where: { code: c }, create: { code: c, ...data }, update: data });
    }
  }
  console.log(`✔ Permission (tenant): ${TENANT_ALL.length}`);
}

async function seedTenantSystemRoles() {
  for (const r of TENANT_ROLES) {
    // (tenantId, code) compound unique এ NULL চলে না → findFirst
    const existing = await prisma.role.findFirst({ where: { tenantId: null, code: r.code } });
    const data = { nameBn: r.nameBn, nameEn: r.nameEn, description: r.description, isSystem: true };
    const role = existing
      ? await prisma.role.update({ where: { id: existing.id }, data })
      : await prisma.role.create({ data: { tenantId: null, code: r.code, ...data } });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: [...new Set(r.permissions)].map((p) => ({ roleId: role.id, permissionCode: p })),
        skipDuplicates: true,
      }),
    ]);
  }
  console.log(`✔ Role (system, tenant-side): ${TENANT_ROLES.length}`);
}

async function seedPlans() {
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      create: { code: p.code, nameBn: p.nameBn, nameEn: p.nameEn, priceMonthly: p.priceMonthly },
      update: { nameBn: p.nameBn, nameEn: p.nameEn, priceMonthly: p.priceMonthly },
    });
    for (const [key, v] of Object.entries(p.entitlements)) {
      const data = {
        valueInt: v.int ?? null,
        valueBool: v.bool ?? null,
        isUnlimited: !!v.unlimited,
      };
      await prisma.planEntitlement.upsert({
        where: { planId_key: { planId: plan.id, key } },
        create: { planId: plan.id, key, ...data },
        update: data,
      });
    }
  }
  console.log(`✔ Plan: ${PLANS.length}`);
}

async function seedReservedSlugs() {
  await prisma.reservedSlug.createMany({
    data: RESERVED_SLUGS.map(([slug, reason]) => ({ slug, reason })),
    skipDuplicates: true,
  });
  console.log(`✔ ReservedSlug: ${RESERVED_SLUGS.length}`);
}

async function seedSuperAdminUser() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('… Super Admin user skipped (SEED_SUPER_ADMIN_EMAIL / _PASSWORD সেট নেই)');
    return;
  }
  if (password.length < 12) throw new Error('SEED_SUPER_ADMIN_PASSWORD কমপক্ষে ১২ অক্ষরের হতে হবে');

  const role = await prisma.platformRole.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const existing = await prisma.platformUser.findUnique({ where: { email } });
  if (existing) {
    // পাসওয়ার্ড ওভাররাইট করি না; শুধু রোল নিশ্চিত করি
    await prisma.platformUser.update({ where: { id: existing.id }, data: { roleId: role.id, isActive: true } });
    console.log(`✔ Super Admin (existing): ${email}`);
    return;
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.platformUser.create({
    data: { email, name: process.env.SEED_SUPER_ADMIN_NAME ?? 'Super Admin', passwordHash, roleId: role.id },
  });
  console.log(`✔ Super Admin created: ${email}  (প্রথম লগইনে MFA চালু ও পাসওয়ার্ড বদলান)`);
}

async function main() {
  await seedPlatformPermissions();
  await seedPlatformRoles();
  await seedTenantPermissions();
  await seedTenantSystemRoles();
  await seedPlans();
  await seedReservedSlugs();
  await seedSuperAdminUser();
  console.log('Seed সম্পন্ন ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());