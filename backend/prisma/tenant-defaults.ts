// =====================================================================================
// Basha Desk — prisma/tenant-defaults.ts
// নতুন Tenant provisioning এর সময় (PROVISIONING → READY এর আগে) এক transaction এ চালান।
// idempotent: আবার চালালে ডুপ্লিকেট হয় না।
//
// ব্যবহার:
//   await prisma.$transaction(async (tx) => {
//     await seedTenantDefaults(tx, tenant.id);
//     await assignOwner(tx, tenant.id, ownerUserId);
//   });
// ⚠ RLS: এই ফাংশন চালানোর আগে tx এ current tenant সেট করুন (SET LOCAL app.tenant_id = ...)
// =====================================================================================

import { Prisma, ChargeCategory, LedgerAccountType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const CHARGE_TYPES: {
  code: string;
  nameBn: string;
  nameEn: string;
  category: ChargeCategory;
}[] = [
  { code: "RENT", nameBn: "ভাড়া", nameEn: "Rent", category: "RENT" },
  {
    code: "SERVICE_CHARGE",
    nameBn: "সার্ভিস চার্জ",
    nameEn: "Service Charge",
    category: "SERVICE_CHARGE",
  },
  {
    code: "ELECTRICITY",
    nameBn: "বিদ্যুৎ বিল",
    nameEn: "Electricity",
    category: "ELECTRICITY",
  },
  { code: "GAS", nameBn: "গ্যাস বিল", nameEn: "Gas", category: "GAS" },
  { code: "WATER", nameBn: "পানি বিল", nameEn: "Water", category: "WATER" },
  {
    code: "PARKING",
    nameBn: "পার্কিং ফি",
    nameEn: "Parking",
    category: "PARKING",
  },
  {
    code: "LATE_FEE",
    nameBn: "বিলম্ব ফি",
    nameEn: "Late Fee",
    category: "LATE_FEE",
  },
  { code: "OTHER", nameBn: "অন্যান্য", nameEn: "Other", category: "OTHER" },
];

// system ledger account (isSystem = true) — অ্যাপের journal posting এগুলোর code এ নির্ভর করে, বদলাবেন না
const LEDGER_ACCOUNTS: {
  code: string;
  name: string;
  type: LedgerAccountType;
}[] = [
  { code: "1000", name: "Cash in Hand", type: "ASSET" },
  { code: "1010", name: "Bank", type: "ASSET" },
  { code: "1020", name: "Mobile Wallet (bKash/Nagad/Rocket)", type: "ASSET" },
  { code: "1100", name: "Accounts Receivable", type: "ASSET" },
  { code: "2000", name: "Renter Advance / Credit", type: "LIABILITY" },
  { code: "2100", name: "Security Deposits Held", type: "LIABILITY" },
  { code: "3000", name: "Owner Equity", type: "EQUITY" },
  { code: "4000", name: "Rent Income", type: "INCOME" },
  { code: "4100", name: "Service Charge Income", type: "INCOME" },
  { code: "4200", name: "Utility Income", type: "INCOME" },
  { code: "4300", name: "Parking Income", type: "INCOME" },
  { code: "4400", name: "Late Fee Income", type: "INCOME" },
  { code: "4900", name: "Other Income", type: "INCOME" },
  { code: "5000", name: "Maintenance & Repairs", type: "EXPENSE" },
  { code: "5100", name: "Utilities Expense", type: "EXPENSE" },
  { code: "5200", name: "Salaries & Wages", type: "EXPENSE" },
  { code: "5300", name: "Taxes & Government Fees", type: "EXPENSE" },
  { code: "5400", name: "Cleaning & Security", type: "EXPENSE" },
  { code: "5900", name: "Other Expense", type: "EXPENSE" },
];

const EXPENSE_CATEGORIES: { code: string; nameBn: string; nameEn: string }[] = [
  {
    code: "MAINTENANCE",
    nameBn: "মেরামত ও রক্ষণাবেক্ষণ",
    nameEn: "Maintenance & Repairs",
  },
  {
    code: "UTILITIES",
    nameBn: "ইউটিলিটি (বিদ্যুৎ/গ্যাস/পানি)",
    nameEn: "Utilities",
  },
  { code: "SALARY", nameBn: "বেতন", nameEn: "Salaries" },
  { code: "TAX", nameBn: "কর ও সরকারি ফি", nameEn: "Taxes & Fees" },
  { code: "CLEANING", nameBn: "পরিচ্ছন্নতা", nameEn: "Cleaning" },
  { code: "SECURITY", nameBn: "নিরাপত্তা", nameEn: "Security" },
  { code: "OTHER", nameBn: "অন্যান্য", nameEn: "Other" },
];

export async function seedTenantDefaults(tx: Tx, tenantId: string) {
  for (const c of CHARGE_TYPES) {
    await tx.chargeType.upsert({
      where: { tenantId_code: { tenantId, code: c.code } },
      create: { tenantId, ...c },
      update: {},
    });
  }

  for (const a of LEDGER_ACCOUNTS) {
    await tx.ledgerAccount.upsert({
      where: { tenantId_code: { tenantId, code: a.code } },
      create: { tenantId, ...a, isSystem: true },
      update: {},
    });
  }

  for (const e of EXPENSE_CATEGORIES) {
    await tx.expenseCategory.upsert({
      where: { tenantId_code: { tenantId, code: e.code } },
      create: { tenantId, ...e },
      update: {},
    });
  }
}

// প্রথম ইউজারকে Owner বানানো (সব property তে অ্যাক্সেস: scopeAll = true)
export async function assignOwner(tx: Tx, tenantId: string, userId: string) {
  const ownerRole = await tx.role.findFirstOrThrow({
    where: { tenantId: null, code: "OWNER", isSystem: true },
  });

  await tx.membership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, roleId: ownerRole.id, scopeAll: true },
    update: { roleId: ownerRole.id, scopeAll: true, isActive: true },
  });

  await tx.tenant.update({
    where: { id: tenantId },
    data: { ownerUserId: userId },
  });
}
