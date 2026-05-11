import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params
    const pk = id

    const notification = await prisma.hrNotification.findFirst({
      where: { id: pk, userId: authUser.id },
    })
    if (!notification) {
      return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    }

    await prisma.hrNotification.update({
      where: { id: pk },
      data: { isRead: true },
    })

    return NextResponse.json({
      id: notification.id,
      notification_type: notification.notificationType,
      title: notification.title,
      message: notification.message,
      is_read: true,
      related_object_type: notification.relatedObjectType,
      related_object_id: notification.relatedObjectId,
      created_at: notification.createdAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
