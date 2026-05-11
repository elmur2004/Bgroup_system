import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company')

    const where: Record<string, unknown> = {}
    if (companyId) where.employee = { companyId: companyId }

    const incidents = await prisma.hrIncident.findMany({
      where,
      include: {
        employee: { select: { fullNameEn: true, employeeId: true } },
        violationRule: { select: { nameEn: true } },
      },
      orderBy: { incidentDate: 'desc' },
      take: 10,
    })

    return NextResponse.json(
      incidents.map((inc) => ({
        id: inc.id,
        employee_name: inc.employee.fullNameEn,
        employee_id_str: inc.employee.employeeId,
        violation_rule_name: inc.violationRule.nameEn,
        incident_date: inc.incidentDate.toISOString().split('T')[0],
        action_taken: inc.actionTaken,
        status: inc.status,
      }))
    )
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
