import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)
    const isRead = url.searchParams.get('is_read')
    const notificationType = url.searchParams.get('notification_type')

    const where: any = { userId: authUser.id }
    if (isRead !== null && isRead !== '') where.isRead = isRead === 'true'
    if (notificationType) where.notificationType = notificationType

    const notifications = await prisma.hrNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const serialized = notifications.map((n) => ({
      id: n.id,
      notification_type: n.notificationType,
      notification_type_display: n.notificationType,
      title: n.title,
      message: n.message,
      is_read: n.isRead,
      related_object_type: n.relatedObjectType,
      related_object_id: n.relatedObjectId,
      created_at: n.createdAt.toISOString(),
    }))

    return NextResponse.json({ results: serialized, count: serialized.length })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
