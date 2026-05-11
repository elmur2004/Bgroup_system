import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const count = await prisma.hrNotification.count({
      where: { userId: authUser.id, isRead: false },
    })
    return NextResponse.json({ unread_count: count })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
