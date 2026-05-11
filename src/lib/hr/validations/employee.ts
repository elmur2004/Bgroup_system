import { z } from 'zod'

export const createEmployeeSchema = z.object({
  full_name_en: z.string().min(1, 'Full name is required'),
  full_name_ar: z.string().optional(),
  national_id: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  work_email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['M', 'F', 'male', 'female', '']).optional(),
  address: z.string().optional(),
  company: z.string({ error: 'Company is required' }).min(1, 'Company is required'),
  department: z.union([z.number(), z.string()]).optional(),
  shift: z.union([z.number(), z.string()]).optional(),
  direct_manager: z.union([z.number(), z.string()]).optional(),
  position_en: z.string().optional(),
  position_ar: z.string().optional(),
  level: z.string().optional(),
  employment_type: z.string().optional(),
  work_model: z.string().optional(),
  base_salary: z.union([z.number(), z.string()]).transform((val) => {
    const n = typeof val === 'number' ? val : parseFloat(String(val))
    return isNaN(n) ? undefined : n
  }).pipe(z.number({ error: 'Base salary is required' }).positive('Salary must be positive')),
  currency: z.string().default('EGP'),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  iban: z.string().optional(),
  personal_email: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  probation_end: z.string().optional(),
  status: z.string().optional(),
})
