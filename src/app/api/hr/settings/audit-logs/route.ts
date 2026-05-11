import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isSuperAdmin } from '@/lib/hr/permissions'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isSuperAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const where: Record<string, unknown> = {}
    if (entityType) where.entityType = entityType
    if (action) where.action = action
    if (userId) where.userId = userId
    if (startDate || endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      where.timestamp = dateFilter
    }

    const total = await prisma.hrAuditLog.count({ where })
    const logs = await prisma.hrAuditLog.findMany({
      where,
      include: { user: { include: { user: { select: { email: true } } } } },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const ACTION_DISPLAY: Record<string, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      login: 'Login',
      logout: 'Logout',
    }

    return NextResponse.json({
      count: total,
      page,
      page_size: pageSize,
      results: logs.map((log) => ({
        id: log.id,
        user: log.userId,
        user_email: log.user?.user?.email || null,
        action: log.action,
        action_display: ACTION_DISPLAY[log.action] || log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        field_name: log.fieldName,
        old_value: log.oldValue,
        new_value: log.newValue,
        timestamp: log.timestamp.toISOString(),
        ip_address: log.ipAddress,
      })),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
