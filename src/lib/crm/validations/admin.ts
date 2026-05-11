import { z } from "zod";

// ========== USERS ==========

export const createUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  fullNameAr: z.string().optional(),
  email: z.string().email("Valid email is required"),
  role: z.enum(["CEO", "ADMIN", "MANAGER", "REP", "TECH_DIRECTOR", "ACCOUNT_MGR", "FINANCE"]),
  entityId: z.string().optional(),
  monthlyTargetEGP: z.number().min(0).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  fullNameAr: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["CEO", "ADMIN", "MANAGER", "REP", "TECH_DIRECTOR", "ACCOUNT_MGR", "FINANCE"]).optional(),
  entityId: z.string().nullable().optional(),
  monthlyTargetEGP: z.number().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

// ========== ENTITIES ==========

export const updateEntitySchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameAr: z.string().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
});

// ========== FX RATES ==========

export const updateFxRateSchema = z.object({
  currency: z.string().min(1, "CrmCurrency is required"),
  rate: z.number().positive("Rate must be positive"),
});

// ========== STAGE CONFIGS ==========

export const updateStageConfigSchema = z.object({
  probabilityPct: z.number().min(0).max(100).optional(),
  slaHours: z.number().min(0).nullable().optional(),
});

// ========== LOSS REASONS ==========

export const createLossReasonSchema = z.object({
  labelEn: z.string().min(1, "English label is required"),
  labelAr: z.string().min(1, "Arabic label is required"),
  code: z.string().min(1, "Code is required"),
  entityId: z.string().optional(),
});

export const updateLossReasonSchema = z.object({
  labelEn: z.string().min(1).optional(),
  labelAr: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

// ========== LEAD SOURCES ==========

export const createLeadSourceSchema = z.object({
  labelEn: z.string().min(1, "English label is required"),
  labelAr: z.string().min(1, "Arabic label is required"),
  code: z.string().min(1, "Code is required"),
  entityId: z.string().optional(),
});

export const updateLeadSourceSchema = z.object({
  labelEn: z.string().min(1).optional(),
  labelAr: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  active: z.boolean().optional(),
});
