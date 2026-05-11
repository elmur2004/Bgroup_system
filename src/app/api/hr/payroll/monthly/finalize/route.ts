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

    const period = await prisma.hrPayrollPeriod.findFirst({
      where: { companyId, month: m, year: y },
    })

    if (!period || period.status !== 'locked') {
      return NextResponse.json({ detail: 'Only locked periods can be finalized.' }, { status: 400 })
    }

    await prisma.hrPayrollPeriod.update({
      where: { id: period.id },
      data: { status: 'finalized', finalizedAt: now, updatedAt: now },
    })

    await prisma.hrMonthlySalary.updateMany({
      where: {
        employee: { companyId },
        month: m,
        year: y,
      },
      data: { status: 'finalized', finalizedAt: now },
    })

    await createAuditLog({
      userId: authUser.id,
      action: 'finalize',
      entityType: 'payroll',
      entityId: period.id,
      details: `Finalized payroll for company ${companyId}, ${m}/${y}`,
      ipAddress: getClientIp(request),
    })

    // Notify each employee in this payroll period that their salary slip is ready
    const salaries = await prisma.hrMonthlySalary.findMany({
      where: { employee: { companyId }, month: m, year: y },
      include: { employee: true },
    })
    for (const sal of salaries) {
      if (sal.employee.userId) {
        await prisma.hrNotification.create({
          data: {
            userId: sal.employee.userId,
            notificationType: 'salary_slip_ready',
            title: 'Salary Slip Ready',
            message: `Your salary slip for ${String(m).padStart(2, '0')}/${y} is now available.`,
            isRead: false,
            relatedObjectType: 'MonthlySalary',
            relatedObjectId: sal.id,
            createdAt: now,
          },
        })
      }
    }

    return NextResponse.json({ detail: 'Payroll finalized.', status: 'FINALIZED' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Finalize error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
