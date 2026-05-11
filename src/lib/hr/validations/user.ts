import { z } from 'zod'

export const updateUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
  password: z.string().optional(),
  role_names: z.array(z.string()).optional(),
  company_ids: z.array(z.union([z.string(), z.number()])).optional(),
  link_employee_id: z.string().optional().nullable(),
})

// PATCH /api/hr/auth/me
export const updateMeSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional().nullable(),
})

// POST /api/hr/auth/refresh
export const refreshTokenSchema = z.object({
  refresh: z.string().optional(),
})
