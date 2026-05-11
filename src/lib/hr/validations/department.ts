import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name_en: z.string().trim().min(1, 'Department name is required'),
  name_ar: z.string().optional(),
  company: z.string().min(1, 'company is required'),
  head_of_dept: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

export const updateDepartmentSchema = z.object({
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
  company: z.string().optional(),
  head_of_dept: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})
