import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import crypto from 'crypto'

import { resetTokenStore } from '@/lib/hr/reset-token-store'
import { passwordResetSchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = passwordResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { email } = parsed.data

    // Always return success to not leak user existence
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
      const expiry = Date.now() + 60 * 60 * 1000 // 1 hour

      // Store hashed token
      resetTokenStore.set(email.toLowerCase(), { hashedToken, expiry })

      // In dev mode, log the reset URL (since we can't send emails)
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
      console.log(`\n[DEV] Password reset link for ${email}:\n${resetUrl}\n`)
    }

    return NextResponse.json({
      message: 'If that email is registered, you will receive a reset link.',
    })
  } catch {
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
