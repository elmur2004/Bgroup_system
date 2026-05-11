"use server";

import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/crm/session";
import { revalidatePath } from "next/cache";
import {
  createUserSchema,
  updateUserSchema,
  updateEntitySchema,
  updateFxRateSchema,
  updateStageConfigSchema,
  createLossReasonSchema,
  updateLossReasonSchema,
  createLeadSourceSchema,
  updateLeadSourceSchema,
} from "@/lib/crm/validations/admin";

async function requireAdmin() {
  const session = await getRequiredSession();
  if (session.role !== "CEO" && session.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
}

// ========== USERS ==========

export async function getUsers() {
  await requireAdmin();
  const users = await db.crmUserProfile.findMany({
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true, color: true },
      },
    },
    orderBy: [{ active: "desc" }, { fullName: "asc" }],
  });
  return JSON.parse(JSON.stringify(users));
}

export async function createUser(data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = createUserSchema.parse(data);

  // Create unified User first, then CRM profile
  const unifiedUser = await db.user.create({
    data: {
      email: parsed.email,
      name: parsed.fullName,
      crmAccess: true,
    },
  });

  const user = await db.crmUserProfile.create({
    data: {
      userId: unifiedUser.id,
      fullName: parsed.fullName,
      fullNameAr: parsed.fullNameAr || null,
      role: parsed.role,
      entityId: parsed.entityId || null,
      monthlyTargetEGP: parsed.monthlyTargetEGP ?? null,
    },
  });
  revalidatePath("/crm/admin/users");
  return JSON.parse(JSON.stringify(user));
}

export async function updateUser(id: string, data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = updateUserSchema.parse(data);

  // Update email on unified User if provided
  if (parsed.email !== undefined) {
    const profile = await db.crmUserProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (profile) {
      await db.user.update({
        where: { id: profile.userId },
        data: { email: parsed.email, name: parsed.fullName },
      });
    }
  }

  const user = await db.crmUserProfile.update({
    where: { id },
    data: {
      ...(parsed.fullName !== undefined && { fullName: parsed.fullName }),
      ...(parsed.fullNameAr !== undefined && {
        fullNameAr: parsed.fullNameAr || null,
      }),
      ...(parsed.role !== undefined && { role: parsed.role }),
      ...(parsed.entityId !== undefined && {
        entityId: parsed.entityId || null,
      }),
      ...(parsed.monthlyTargetEGP !== undefined && {
        monthlyTargetEGP: parsed.monthlyTargetEGP,
      }),
      ...(parsed.active !== undefined && { active: parsed.active }),
    },
  });
  revalidatePath("/crm/admin/users");
  return JSON.parse(JSON.stringify(user));
}

// ========== ENTITIES ==========

export async function getEntitiesAdmin() {
  await requireAdmin();
  const entities = await db.crmEntity.findMany({
    orderBy: { code: "asc" },
  });
  return JSON.parse(JSON.stringify(entities));
}

export async function updateEntity(id: string, data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = updateEntitySchema.parse(data);
  const entity = await db.crmEntity.update({
    where: { id },
    data: parsed,
  });
  revalidatePath("/crm/admin/entities");
  return JSON.parse(JSON.stringify(entity));
}

// ========== FX RATES ==========

export async function getFxRates() {
  await requireAdmin();
  const rates = await db.crmFxRate.findMany({
    orderBy: { currency: "asc" },
  });
  return JSON.parse(JSON.stringify(rates));
}

export async function updateFxRate(currency: string, rate: number) {
  await requireAdmin();
  const parsed = updateFxRateSchema.parse({ currency, rate });
  const fxRate = await db.crmFxRate.update({
    where: { currency: parsed.currency as never },
    data: { toEGP: parsed.rate },
  });
  revalidatePath("/crm/admin/fx-rates");
  return JSON.parse(JSON.stringify(fxRate));
}

// ========== STAGE CONFIGS ==========

export async function getStageConfigs() {
  await requireAdmin();
  const configs = await db.crmStageConfig.findMany({
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true },
      },
    },
    orderBy: [{ displayOrder: "asc" }],
  });
  return JSON.parse(JSON.stringify(configs));
}

export async function updateStageConfig(id: string, data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = updateStageConfigSchema.parse(data);
  const config = await db.crmStageConfig.update({
    where: { id },
    data: parsed,
  });
  revalidatePath("/crm/admin/stage-config");
  return JSON.parse(JSON.stringify(config));
}

// ========== LOSS REASONS ==========

export async function getLossReasons() {
  await requireAdmin();
  const reasons = await db.crmLossReason.findMany({
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true },
      },
    },
    orderBy: [{ active: "desc" }, { labelEn: "asc" }],
  });
  return JSON.parse(JSON.stringify(reasons));
}

export async function createLossReason(data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = createLossReasonSchema.parse(data);
  const reason = await db.crmLossReason.create({
    data: {
      code: parsed.code,
      labelEn: parsed.labelEn,
      labelAr: parsed.labelAr,
      entityId: parsed.entityId || null,
    },
  });
  revalidatePath("/crm/admin/loss-reasons");
  return JSON.parse(JSON.stringify(reason));
}

export async function updateLossReason(id: string, data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = updateLossReasonSchema.parse(data);
  const reason = await db.crmLossReason.update({
    where: { id },
    data: parsed,
  });
  revalidatePath("/crm/admin/loss-reasons");
  return JSON.parse(JSON.stringify(reason));
}

// ========== LEAD SOURCES ==========

export async function getLeadSources() {
  await requireAdmin();
  const sources = await db.crmLeadSource.findMany({
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true },
      },
    },
    orderBy: [{ active: "desc" }, { labelEn: "asc" }],
  });
  return JSON.parse(JSON.stringify(sources));
}

export async function createLeadSource(data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = createLeadSourceSchema.parse(data);
  const source = await db.crmLeadSource.create({
    data: {
      code: parsed.code,
      labelEn: parsed.labelEn,
      labelAr: parsed.labelAr,
      entityId: parsed.entityId || null,
    },
  });
  revalidatePath("/crm/admin/lead-sources");
  return JSON.parse(JSON.stringify(source));
}

export async function updateLeadSource(id: string, data: Record<string, unknown>) {
  await requireAdmin();
  const parsed = updateLeadSourceSchema.parse(data);
  const source = await db.crmLeadSource.update({
    where: { id },
    data: parsed,
  });
  revalidatePath("/crm/admin/lead-sources");
  return JSON.parse(JSON.stringify(source));
}
