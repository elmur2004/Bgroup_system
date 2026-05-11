import { z } from 'zod'

export const createShiftSchema = z.object({
  name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  grace_period_minutes: z.union([z.number(), z.string()]).optional(),
  daily_work_hours: z.union([z.number(), z.string()]).optional(),
  weekly_off_day: z.number().optional(),
  is_default: z.boolean().optional(),
})

export const updateShiftSchema = createShiftSchema.partial()
