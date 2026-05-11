import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isSuperAdmin } from '@/lib/hr/permissions'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isSuperAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ detail: 'No file uploaded.' }, { status: 400 })
    }

    const ExcelJS = (await import('exceljs')).default
    const buffer = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)

    const { db: prisma } = await import('@/lib/db')
    const now = new Date()
    const results: Record<string, { created: number; errors: string[] }> = {}

    // Process Companies sheet
    const companiesSheet = wb.getWorksheet('Companies')
    if (companiesSheet) {
      results.companies = { created: 0, errors: [] }
      const companyRows: Array<{ rowNumber: number; nameEn: string; nameAr: string }> = []
      companiesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return
        companyRows.push({
          rowNumber,
          nameEn: String(row.getCell(1).value || ''),
          nameAr: String(row.getCell(2).value || ''),
        })
      })
      for (const r of companyRows) {
        try {
          if (!r.nameEn) continue
          const existing = await prisma.hrCompany.findFirst({ where: { nameEn: r.nameEn } })
          if (existing) {
            await prisma.hrCompany.update({
              where: { id: existing.id },
              data: { nameAr: r.nameAr, updatedAt: now },
            })
          } else {
            await prisma.hrCompany.create({
              data: {
                nameEn: r.nameEn,
                nameAr: r.nameAr,
                isActive: true,
                industry: '',
                address: '',
                phone: '',
                email: '',
                taxId: '',
                createdAt: now,
                updatedAt: now,
              },
            })
          }
          results.companies.created++
        } catch (e: unknown) {
          results.companies.errors.push(
            `Row ${r.rowNumber}: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    }

    // Process Departments sheet
    const deptsSheet = wb.getWorksheet('Departments')
    if (deptsSheet) {
      results.departments = { created: 0, errors: [] }
      const rows: Array<{ rowNumber: number; nameEn: string; nameAr: string; companyName: string }> = []
      deptsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return
        rows.push({
          rowNumber,
          nameEn: String(row.getCell(1).value || ''),
          nameAr: String(row.getCell(2).value || ''),
          companyName: String(row.getCell(3).value || ''),
        })
      })
      for (const r of rows) {
        try {
          if (!r.nameEn) continue
          const company = await prisma.hrCompany.findFirst({ where: { nameEn: r.companyName } })
          if (!company) {
            results.departments.errors.push(`Row ${r.rowNumber}: Company "${r.companyName}" not found`)
            continue
          }
          const existing = await prisma.hrDepartment.findFirst({
            where: { nameEn: r.nameEn, companyId: company.id },
          })
          if (existing) {
            await prisma.hrDepartment.update({
              where: { id: existing.id },
              data: { nameAr: r.nameAr, updatedAt: now },
            })
          } else {
            await prisma.hrDepartment.create({
              data: {
                nameEn: r.nameEn,
                nameAr: r.nameAr,
                companyId: company.id,
                isActive: true,
                createdAt: now,
                updatedAt: now,
              },
            })
          }
          results.departments.created++
        } catch (e: unknown) {
          results.departments.errors.push(
            `Row ${r.rowNumber}: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    }

    return NextResponse.json({
      detail: 'Seed import completed.',
      results,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Seed import error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
