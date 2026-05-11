import { z } from 'zod'

export const createBonusSchema = z.object({
  employee: z.string().min(1, 'employee is required'),
  bonus_rule: z.string().min(1, 'bonus_rule is required'),
  bonus_date: z.string().min(1, 'bonus_date is required'),
  comments: z.string().optional(),
  evidence: z.string().optional().nullable(),
})

export const updateBonusSchema = z.object({
  employee: z.string().optional(),
  bonus_rule: z.string().optional(),
  bonus_date: z.string().optional(),
  comments: z.string().optional(),
  evidence: z.string().optional().nullable(),
})

export const cancelBonusSchema = z.object({
  dismissed_reason: z.string().optional(),
})

// Bonus categories
export const createBonusCategorySchema = z.object({
  code: z.string().min(1, 'code is required'),
  name_en: z.string().min(1, 'name_en is required'),
  name_ar: z.string().optional(),
})

export const updateBonusCategorySchema = createBonusCategorySchema.partial()

// Bonus rules
export const createBonusRuleSchema = z.object({
  code: z.string().min(1, 'code is required'),
  name_en: z.string().min(1, 'name_en is required'),
  name_ar: z.string().optional(),
  category: z.string().min(1, 'category is required'),
  value_type: z.string().min(1, 'value_type is required'),
  value: z.union([z.number(), z.string()]),
  frequency: z.string().optional(),
  max_per_month: z.number().optional(),
  approval_authority: z.string().optional(),
  trigger_condition: z.string().optional(),
})

export const updateBonusRuleSchema = createBonusRuleSchema.partial()
