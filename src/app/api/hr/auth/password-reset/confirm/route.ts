import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { hashPassword } from '@/lib/hr/auth-utils'
import { validatePassword, passwordResetConfirmSchema } from '@/lib/hr/validations'
import crypto from 'crypto'
import { resetTokenStore } from '@/lib/hr/reset-token-store'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = passwordResetConfirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { email, token, new_password } = parsed.data

    // Validate password strength
    const passwordCheck = validatePassword(new_password)
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { detail: 'Password does not meet requirements.', errors: passwordCheck.errors },
        { status: 400 }
      )
    }

    // Look up the stored token for this email
    const stored = resetTokenStore.get(email.toLowerCase())
    if (!stored) {
      return NextResponse.json(
        { detail: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    // Check expiry
    if (Date.now() > stored.expiry) {
      resetTokenStore.delete(email.toLowerCase())
      return NextResponse.json(
        { detail: 'Reset token has expired.' },
        { status: 400 }
      )
    }

    // Verify token by hashing the provided token and comparing
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    if (hashedToken !== stored.hashedToken) {
      return NextResponse.json(
        { detail: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    // Update password
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { detail: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    const newHash = await hashPassword(new_password)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash, updatedAt: new Date() },
    })

    // Invalidate token
    resetTokenStore.delete(email.toLowerCase())

    // Audit log
    await prisma.hrAuditLog.create({
      data: {
        action: 'password_reset',
        entityType: 'CustomUser',
        entityId: String(user.id),
        fieldName: 'password',
        oldValue: '',
        newValue: '',
        timestamp: new Date(),
        userId: user.id,
      },
    })

    return NextResponse.json({
      message: 'Password reset successfully.',
    })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
