import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '@/lib/hr/auth-utils'
import { serializeUser } from '@/lib/hr/serializers'
import { checkRateLimit } from '@/lib/hr/rate-limit'

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, remember_me } = body

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required.' },
        { status: 400 }
      )
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipCheck = checkRateLimit(`login-ip:${ip}`, 20, LOGIN_WINDOW_MS)
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { detail: 'Too many login attempts. Please try again later.', retry_after: Math.ceil(ipCheck.resetIn / 1000) },
        { status: 429 }
      )
    }

    // Rate limiting by email
    const rateCheck = checkRateLimit(`login:${email.toLowerCase()}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          detail: 'Too many login attempts. Please try again later.',
          retry_after: Math.ceil(rateCheck.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const profile = await prisma.hrUserProfile.findUnique({
      where: { username: email },
      include: { user: true },
    })
    // Also try finding by user email if username lookup fails
    const hrProfile = profile ?? await prisma.hrUserProfile.findFirst({
      where: { user: { email } },
      include: { user: true },
    })
    if (!hrProfile) {
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    if (!hrProfile.isActive) {
      return NextResponse.json(
        { detail: 'Account is disabled.' },
        { status: 401 }
      )
    }

    const storedPassword = hrProfile.user.password
    if (!storedPassword) {
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, storedPassword)
    if (!valid) {
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      )
    }

    // Re-hash with bcrypt if still using Django format
    if (storedPassword.startsWith('pbkdf2_sha256$')) {
      const bcrypt = await import('bcryptjs')
      const newHash = await bcrypt.hash(password, 12)
      await prisma.user.update({
        where: { id: hrProfile.userId },
        data: { password: newHash },
      })
    }

    const userId = hrProfile.userId
    const access = generateAccessToken(userId)
    const refresh = generateRefreshToken(userId)
    const userData = await serializeUser(userId)

    // Audit log
    try {
      await prisma.hrAuditLog.create({
        data: {
          action: 'login',
          entityType: 'CustomUser',
          entityId: userId,
          fieldName: '',
          oldValue: '',
          newValue: '',
          timestamp: new Date(),
          ipAddress: ip,
          userId: userId,
        },
      })
    } catch {
      // Non-critical — don't block login if audit fails
    }

    const response = NextResponse.json({
      user: userData,
      message: 'Login successful.',
    })

    // Set httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    if (remember_me) {
      response.cookies.set('bghr_access', access, {
        ...cookieOptions,
        maxAge: 60 * 60, // 1 hour
      })
      response.cookies.set('bghr_refresh', refresh, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      })
    } else {
      // Session-only cookies (no maxAge = deleted when browser closes)
      response.cookies.set('bghr_access', access, cookieOptions)
      response.cookies.set('bghr_refresh', refresh, cookieOptions)
    }

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { detail: 'An error occurred during login.' },
      { status: 500 }
    )
  }
}
