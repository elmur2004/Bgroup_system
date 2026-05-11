import { NextResponse } from 'next/server'
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/hr/auth-utils'
import { db as prisma } from '@/lib/db'
import { refreshTokenSchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    let refreshTokenValue: string | undefined

    // Check cookie first, then body
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieMatch = cookieHeader.match(/bghr_refresh=([^;]+)/)
    if (cookieMatch) {
      refreshTokenValue = cookieMatch[1]
    }

    if (!refreshTokenValue) {
      try {
        const body = await request.json()
        const parsed = refreshTokenSchema.safeParse(body)
        if (parsed.success) {
          refreshTokenValue = parsed.data.refresh
        }
      } catch {
        // Body may be empty when using cookie-based auth
      }
    }

    if (!refreshTokenValue) {
      return NextResponse.json(
        { detail: 'Refresh token not provided.' },
        { status: 400 }
      )
    }

    // Check if token has been blacklisted
    const blacklisted = await prisma.hrBlacklistedToken.findFirst({
      where: {
        token: { token: refreshTokenValue },
      },
    })
    if (blacklisted) {
      return NextResponse.json(
        { detail: 'Token has been revoked.' },
        { status: 401 }
      )
    }

    const payload = verifyToken(refreshTokenValue)
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { detail: 'Token is invalid or expired.' },
        { status: 401 }
      )
    }

    // Rotate: issue new access AND refresh tokens
    const access = generateAccessToken(payload.userId)
    const refresh = generateRefreshToken(payload.userId)

    const response = NextResponse.json({
      message: 'Token refreshed.',
    })

    // Set httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('bghr_access', access, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    })
    response.cookies.set('bghr_refresh', refresh, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch {
    return NextResponse.json(
      { detail: 'Token is invalid or expired.' },
      { status: 401 }
    )
  }
}
