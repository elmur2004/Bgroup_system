import { z } from 'zod'

// Policies
export const createOvertimePolicySchema = z.object({
  type_code: z.string().min(1, 'type_code is required'),
  name_en: z.string().min(1, 'name_en is required'),
  name_ar: z.string().optional(),
  rate_multiplier: z.union([z.number(), z.string()]),
  min_hours: z.union([z.number(), z.string()]).optional(),
  max_hours_per_day: z.union([z.number(), z.string()]).optional(),
  max_hours_per_month: z.union([z.number(), z.string()]).optional(),
  requires_pre_approval: z.boolean().optional(),
  approval_authority: z.string().optional(),
})

export const updateOvertimePolicySchema = createOvertimePolicySchema.partial()

// Requests
export const createOvertimeRequestSchema = z.object({
  employee: z.string().optional(),
  overtime_type: z.string().min(1, 'overtime_type is required'),
  date: z.string().min(1, 'date is required'),
  hours_requested: z.union([z.number(), z.string()]),
  reason: z.string().optional(),
  evidence: z.string().optional().nullable(),
})

export const updateOvertimeRequestSchema = z.object({
  overtime_type: z.string().optional(),
  date: z.string().optional(),
  hours_requested: z.union([z.number(), z.string()]).optional(),
  reason: z.string().optional(),
  evidence: z.string().optional().nullable(),
})

export const denyOvertimeRequestSchema = z.object({
  denial_reason: z.string().optional(),
  reason: z.string().optional(),
})
