import { NextResponse } from 'next/server'
import { z } from 'zod'

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    return {
      success: false,
      response: NextResponse.json({ detail: 'Validation error', errors }, { status: 400 }),
    }
  }
  return { success: true, data: result.data }
}

export function parseIntSafe(value: string | null | undefined, fieldName: string): number | null {
  if (!value) return null
  const n = parseInt(value, 10)
  if (isNaN(n)) return null
  return n
}
