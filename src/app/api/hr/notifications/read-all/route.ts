import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const result = await prisma.hrNotification.updateMany({
      where: { userId: authUser.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ marked_read: result.count })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
