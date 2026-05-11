import { z } from 'zod'

export const settingItemSchema = z.object({
  key: z.string().min(1, 'key is required'),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

// POST /api/hr/settings accepts either a single item or an array
export const createSettingSchema = z.union([
  settingItemSchema,
  z.array(settingItemSchema),
])

export const updateSettingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})
