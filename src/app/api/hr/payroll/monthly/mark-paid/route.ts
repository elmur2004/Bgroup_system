import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
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

    if (!period || period.status !== 'finalized') {
      return NextResponse.json({ detail: 'Only finalized periods can be marked as paid.' }, { status: 400 })
    }

    await prisma.hrPayrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'paid',
        paidById: authUser.id,
        paidAt: now,
        updatedAt: now,
      },
    })

    await prisma.hrMonthlySalary.updateMany({
      where: {
        employee: { companyId },
        month: m,
        year: y,
      },
      data: { status: 'paid' },
    })

    // Notify employees
    const employees = await prisma.hrEmployee.findMany({
      where: {
        companyId,
        status: { in: ['active', 'probation'] },
        userId: { not: null },
      },
      select: { userId: true },
    })

    for (const emp of employees) {
      if (emp.userId) {
        await prisma.hrNotification.create({
          data: {
            userId: emp.userId,
            notificationType: 'salary_slip',
            title: 'Salary Paid',
            message: `Your salary for ${String(m).padStart(2, '0')}/${y} has been paid.`,
            isRead: false,
            relatedObjectType: 'PayrollPeriod',
            relatedObjectId: period.id,
            createdAt: now,
          },
        })
      }
    }

    return NextResponse.json({ detail: 'Payroll marked as paid.', status: 'PAID' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Mark paid error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
