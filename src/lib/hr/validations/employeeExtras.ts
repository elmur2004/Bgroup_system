import { z } from 'zod'

export const changeEmployeeStatusSchema = z.object({
  status: z.enum(['active', 'probation', 'suspended', 'terminated']),
})
