import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request)

    await prisma.hrAuditLog.create({
      data: {
        action: 'logout',
        entityType: 'CustomUser',
        entityId: String(user.id),
        fieldName: '',
        oldValue: '',
        newValue: '',
        timestamp: new Date(),
        userId: user.id,
      },
    })

    // Blacklist the refresh token before clearing cookies
    const cookieHeader = request.headers.get('cookie') || ''
    const refreshMatch = cookieHeader.match(/bghr_refresh=([^;]+)/)
    const refreshToken = refreshMatch ? refreshMatch[1] : undefined
    if (refreshToken) {
      try {
        const outstanding = await prisma.hrOutstandingToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            jti: `logout-${user.id}-${Date.now()}`,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
          },
        }).catch(() => null)
        if (outstanding) {
          await prisma.hrBlacklistedToken.create({
            data: {
              tokenId: outstanding.id,
              blacklistedAt: new Date(),
            },
          })
        }
      } catch (e) { /* Don't block logout */ }
    }

    const response = NextResponse.json({ message: 'Logged out successfully.' })

    // Clear auth cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    }
    response.cookies.set('bghr_access', '', cookieOptions)
    response.cookies.set('bghr_refresh', '', cookieOptions)

    return response
  } catch (error) {
    // Even on error, clear cookies so user is logged out
    const response = NextResponse.json({ message: 'Logged out successfully.' })
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    }
    response.cookies.set('bghr_access', '', cookieOptions)
    response.cookies.set('bghr_refresh', '', cookieOptions)

    if (error instanceof Response) return error
    return response
  }
}
