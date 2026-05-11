import { z } from 'zod'

export const createCompanySchema = z.object({
  name_en: z.string().trim().min(1, 'English name is required'),
  name_ar: z.string().optional(),
  logo: z.string().optional().nullable(),
  industry: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.email('Invalid email'), z.literal('')]).optional(),
  tax_id: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const updateCompanySchema = createCompanySchema.partial()
