import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { createAuditLog, getClientIp } from '@/lib/hr/audit'
import { payrollMonthlyActionSchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = payrollMonthlyActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { company, month, year } = parsed.data

    const now = new Date()
    const m = month !== undefined ? parseInt(String(month), 10) : now.getMonth() + 1
    const y = year !== undefined ? parseInt(String(year), 10) : now.getFullYear()
    const companyId = company

    let period = await prisma.hrPayrollPeriod.findFirst({
      where: { month: m, year: y, companyId },
    })

    if (!period) {
      // Create as open first, then lock
      period = await prisma.hrPayrollPeriod.create({
        data: {
          companyId,
          month: m,
          year: y,
          status: 'open',
          createdAt: now,
          updatedAt: now,
        },
      })
    }

    if (period.status === 'locked') {
      return NextResponse.json({ detail: 'Payroll period is already locked.' }, { status: 400 })
    }
    if (period.status === 'finalized') {
      return NextResponse.json({ detail: 'Cannot lock a finalized payroll period.' }, { status: 400 })
    }

    // Now lock it
    period = await prisma.hrPayrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'locked',
        lockedById: authUser.id,
        lockedAt: now,
        updatedAt: now,
      },
    })

    await prisma.hrMonthlySalary.updateMany({
      where: {
        employee: { companyId },
        month: m,
        year: y,
        status: 'open',
      },
      data: { status: 'locked' },
    })

    await createAuditLog({
      userId: authUser.id,
      action: 'lock',
      entityType: 'payroll',
      entityId: period.id,
      details: `Locked payroll for company ${companyId}, ${m}/${y}`,
      ipAddress: getClientIp(request),
    })

    // Notify accountants and CEOs
    const notifyUsers = await prisma.hrUserRole.findMany({
      where: { role: { name: { in: ['accountant', 'ceo'] } } },
      select: { userId: true },
    })
    const uniqueUserIds = Array.from(new Set(notifyUsers.map((u) => u.userId)))
    for (const uid of uniqueUserIds) {
      await prisma.hrNotification.create({
        data: {
          userId: uid,
          notificationType: 'payroll_locked',
          title: 'Payroll Locked',
          message: `Payroll for ${String(m).padStart(2, '0')}/${y} has been locked and is ready for review.`,
          isRead: false,
          relatedObjectType: 'PayrollPeriod',
          relatedObjectId: period.id,
          createdAt: now,
        },
      })
    }

    return NextResponse.json({ detail: 'Payroll locked.', status: 'LOCKED' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Lock error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
