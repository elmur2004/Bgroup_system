import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin, canViewAllEmployees } from '@/lib/hr/permissions'
import { createCompanySchema } from '@/lib/hr/validations'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)

    let companies
    if (canViewAllEmployees(authUser)) {
      companies = await prisma.hrCompany.findMany({
        include: { departments: true, employees: true },
        orderBy: { nameEn: 'asc' },
      })
    } else {
      companies = await prisma.hrCompany.findMany({
        where: { id: { in: authUser.companies } },
        include: { departments: true, employees: true },
        orderBy: { nameEn: 'asc' },
      })
    }

    const serialized = companies.map((c) => ({
      id: c.id,
      name_en: c.nameEn,
      name_ar: c.nameAr,
      logo: c.logo,
      industry: c.industry,
      is_active: c.isActive,
      employee_count: c.employees.filter((e) => ['active', 'probation'].includes(e.status)).length,
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const company = await prisma.hrCompany.create({
      data: {
        nameEn: data.name_en || '',
        nameAr: data.name_ar || '',
        logo: data.logo || null,
        industry: data.industry || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        taxId: data.tax_id || '',
        isActive: data.is_active ?? true,
        createdAt: now,
        updatedAt: now,
      },
    })

    return NextResponse.json({
      id: company.id,
      name_en: company.nameEn,
      name_ar: company.nameAr,
      logo: company.logo,
      industry: company.industry,
      address: company.address,
      phone: company.phone,
      email: company.email,
      tax_id: company.taxId,
      is_active: company.isActive,
      created_at: company.createdAt.toISOString(),
      updated_at: company.updatedAt.toISOString(),
      departments: [],
      employee_count: 0,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
