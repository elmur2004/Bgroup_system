import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const salary = await prisma.hrMonthlySalary.findUnique({
      where: { id: id },
      include: { employee: true },
    })
    if (!salary) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    if (salary.status !== 'open') {
      return NextResponse.json({ detail: 'Only open records can be locked.' }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.hrMonthlySalary.update({
      where: { id: salary.id },
      data: {
        status: 'locked',
        lockedById: authUser.id,
        lockedAt: now,
        updatedAt: now,
      },
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: true,
      },
    })

    // Notify employee
    if (salary.employee.userId) {
      await prisma.hrNotification.create({
        data: {
          userId: salary.employee.userId,
          notificationType: 'salary_slip',
          title: 'Salary Slip Ready',
          message: `Your salary slip for ${String(salary.month).padStart(2, '0')}/${salary.year} is now available. Net salary: ${Number(salary.netSalary)} ${salary.employee.currency || 'EGP'}.`,
          isRead: false,
          relatedObjectType: 'MonthlySalary',
          relatedObjectId: salary.id,
          createdAt: now,
        },
      })
    }

    return NextResponse.json({
      id: updated.id,
      employee: updated.employeeId,
      employee_name: updated.employee.fullNameEn,
      status: updated.status,
      net_salary: Number(updated.netSalary),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
