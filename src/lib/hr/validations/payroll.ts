import { z } from 'zod'

// Calculate uses company_id (note distinct name from monthly endpoints that use company)
export const payrollCalculateSchema = z.object({
  company_id: z.string().min(1, 'company_id is required'),
  month: z.union([z.number(), z.string()]),
  year: z.union([z.number(), z.string()]),
})

// Monthly lock/finalize/paid/recalculate share shape
export const payrollMonthlyActionSchema = z.object({
  company: z.string().min(1, 'company is required'),
  month: z.union([z.number(), z.string()]).optional(),
  year: z.union([z.number(), z.string()]).optional(),
})

// Periods
export const createPayrollPeriodSchema = z.object({
  company: z.string().min(1, 'company is required'),
  month: z.union([z.number(), z.string()]),
  year: z.union([z.number(), z.string()]),
})

export const updatePayrollPeriodSchema = z.object({
  status: z.string().optional(),
  month: z.union([z.number(), z.string()]).optional(),
  year: z.union([z.number(), z.string()]).optional(),
})

// Monthly salary PATCH (edit notes only)
export const updateMonthlySalarySchema = z.object({
  notes: z.string().optional(),
})
