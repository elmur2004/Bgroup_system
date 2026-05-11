import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'

export async function GET(request: Request) {
  return handlePdfRequest(request, new URL(request.url).searchParams)
}

export async function POST(request: Request) {
  const body = await request.json()
  const params = new URLSearchParams()
  if (body.company) params.set('company', String(body.company))
  if (body.company_id) params.set('company', String(body.company_id))
  if (body.month) params.set('month', String(body.month))
  if (body.year) params.set('year', String(body.year))
  if (body.sections) params.set('sections', body.sections.join(','))
  return handlePdfRequest(request, params)
}

async function handlePdfRequest(request: Request, searchParams: URLSearchParams) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const companyId = searchParams.get('company') || searchParams.get('company_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const sectionsParam = searchParams.get('sections')
    const sections = sectionsParam
      ? sectionsParam.split(',')
      : ['executive_summary', 'employee_detail_table']

    if (!month || !year) {
      return NextResponse.json({ detail: 'month and year are required.' }, { status: 400 })
    }

    const m = month
    const y = year

    let company = null
    const salaryWhere: Record<string, unknown> = { month: m, year: y }
    if (companyId) {
      company = await prisma.hrCompany.findUnique({ where: { id: companyId } })
      if (!company) return NextResponse.json({ detail: 'Company not found.' }, { status: 404 })
      salaryWhere.employee = { companyId: company.id }
    }

    const salaries = await prisma.hrMonthlySalary.findMany({
      where: salaryWhere,
      include: {
        employee: { include: { department: true } },
      },
      orderBy: { employee: { employeeId: 'asc' } },
    })

    const companyLabel = company ? company.nameEn : 'All Companies'

    // Build PDF data as JSON (frontend can render with pdfmake or similar client-side)
    const totalNet = salaries.reduce((sum, s) => sum + Number(s.netSalary), 0)
    const totalBase = salaries.reduce((sum, s) => sum + Number(s.baseSalary), 0)
    const totalBonuses = salaries.reduce((sum, s) => sum + Number(s.totalBonuses), 0)
    const totalDeductions = salaries.reduce((sum, s) => sum + Number(s.totalDeductions), 0)
    const totalOt = salaries.reduce((sum, s) => sum + Number(s.overtimeAmount), 0)

    const pdfData: Record<string, unknown> = {
      title: `${companyLabel} — HR Report ${String(m).padStart(2, '0')}/${y}`,
      generated: new Date().toISOString().split('T')[0],
      company_name: companyLabel,
      month: m,
      year: y,
      total_employees: salaries.length,
      sections: {},
    }

    if (sections.includes('executive_summary')) {
      (pdfData.sections as Record<string, unknown>).executive_summary = {
        total_active_employees: salaries.length,
        total_base_salary: Math.round(totalBase * 100) / 100,
        total_overtime: Math.round(totalOt * 100) / 100,
        total_bonuses: Math.round(totalBonuses * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        total_net_payroll: Math.round(totalNet * 100) / 100,
      }
    }

    if (sections.includes('employee_detail_table')) {
      (pdfData.sections as Record<string, unknown>).employee_detail_table = salaries.map((s) => ({
        employee_id: s.employee.employeeId,
        name: s.employee.fullNameEn,
        department: s.employee.department?.nameEn || '',
        position: s.employee.positionEn,
        base_salary: Number(s.baseSalary),
        ot_hours: Number(s.overtimeHours),
        ot_amount: Number(s.overtimeAmount),
        bonuses: Number(s.totalBonuses),
        deductions: Number(s.totalDeductions),
        net_salary: Number(s.netSalary),
        work_days: s.workDays,
        absent_days: s.absentDays,
        late_count: s.lateCount,
      }))
    }

    return NextResponse.json(pdfData)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('PDF report error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
