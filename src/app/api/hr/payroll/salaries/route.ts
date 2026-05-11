import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isManagement } from '@/lib/hr/permissions'

function serializeSalary(s: any) {
  return {
    id: s.id,
    employee: s.employeeId,
    employee_name: s.employee?.fullNameEn || '',
    employee_id_str: s.employee?.employeeId || '',
    company_name: s.employee?.company?.nameEn || '',
    department_name: s.employee?.department?.nameEn || null,
    currency: s.employee?.currency || 'EGP',
    month: s.month,
    year: s.year,
    base_salary: Number(s.baseSalary),
    overtime_amount: Number(s.overtimeAmount),
    total_bonuses: Number(s.totalBonuses),
    total_deductions: Number(s.totalDeductions),
    net_salary: Number(s.netSalary),
    work_days: s.workDays,
    absent_days: s.absentDays,
    late_count: s.lateCount,
    overtime_hours: Number(s.overtimeHours),
    notes: s.notes || '',
    status: s.status,
    status_display: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    locked_by: s.lockedById,
    locked_by_email: s.lockedBy?.email || null,
    locked_at: s.lockedAt?.toISOString() || null,
    finalized_at: s.finalizedAt?.toISOString() || null,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const { searchParams } = new URL(request.url)

    const where: Record<string, unknown> = {}
    const statusParam = searchParams.get('status')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const employee = searchParams.get('employee')
    const company = searchParams.get('company') || searchParams.get('employee__company')
    const search = searchParams.get('search')

    if (statusParam) where.status = statusParam
    if (month) where.month = month
    if (year) where.year = year
    if (employee) where.employeeId = employee

    if (isManagement(authUser)) {
      if (company) {
        where.employee = { ...((where.employee as object) || {}), companyId: company }
      }
    } else {
      // Regular employees can only see their own
      const emp = await prisma.hrEmployee.findFirst({ where: { userId: authUser.id } })
      if (emp) {
        where.employeeId = emp.id
      } else {
        return NextResponse.json([])
      }
    }

    if (search) {
      where.employee = {
        ...((where.employee as object) || {}),
        OR: [
          { fullNameEn: { contains: search } },
          { employeeId: { contains: search } },
        ],
      }
    }

    const salaries = await prisma.hrMonthlySalary.findMany({
      where,
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(salaries.map(serializeSalary))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
