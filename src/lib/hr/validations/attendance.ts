import { z } from 'zod'

// Attendance log (manual create/update)
export const createAttendanceLogSchema = z.object({
  employee: z.string().min(1, 'employee is required'),
  date: z.string().min(1, 'date is required'),
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  status: z.string().optional(),
  hours_worked: z.union([z.number(), z.string()]).optional(),
  overtime_hours: z.union([z.number(), z.string()]).optional(),
  manual_reason: z.string().optional(),
})

export const updateAttendanceLogSchema = z.object({
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  status: z.string().optional(),
  hours_worked: z.union([z.number(), z.string()]).optional(),
  overtime_hours: z.union([z.number(), z.string()]).optional(),
  manual_reason: z.string().optional(),
  date: z.string().optional(),
})

// Manual entry (upsert by employee + date)
export const manualEntrySchema = z.object({
  employee_id: z.string().min(1, 'employee_id is required'),
  date: z.string().min(1, 'date is required'),
  check_in: z.string().optional().nullable(),
  check_out: z.string().optional().nullable(),
  reason: z.string().optional(),
})

// Attendance auto rules
export const createAutoRuleSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  condition_description: z.string().optional(),
  threshold_value: z.union([z.number(), z.string()]).optional(),
  time_window_months: z.union([z.number(), z.string()]).optional(),
  action: z.string().optional(),
  is_active: z.boolean().optional(),
})

export const updateAutoRuleSchema = createAutoRuleSchema.partial()
