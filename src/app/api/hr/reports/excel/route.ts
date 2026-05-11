import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import ExcelJS from 'exceljs'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company') || searchParams.get('company_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

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

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(`Payroll ${month}-${year}`)

    const companyLabel = company ? company.nameEn : 'All Companies'

    // Title row
    ws.mergeCells('A1:N1')
    const titleCell = ws.getCell('A1')
    titleCell.value = `${companyLabel} — Payroll ${String(m).padStart(2, '0')}/${y}`
    titleCell.font = { bold: true, size: 14 }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 30

    // Headers
    const headers = [
      'Employee ID', 'Name', 'Department', 'Position',
      'Base Salary', 'OT Hours', 'OT Amount', 'Bonuses',
      'Deductions', 'Net Salary', 'Currency',
      'Work Days', 'Absent Days', 'Late Count',
    ]
    const headerRow = ws.getRow(2)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
      ws.getColumn(i + 1).width = 16
    })

    let totalNet = 0
    salaries.forEach((sal, idx) => {
      const e = sal.employee
      const row = ws.getRow(idx + 3)
      const data = [
        e.employeeId, e.fullNameEn,
        e.department?.nameEn || '', e.positionEn,
        Number(sal.baseSalary), Number(sal.overtimeHours),
        Number(sal.overtimeAmount), Number(sal.totalBonuses),
        Number(sal.totalDeductions), Number(sal.netSalary),
        e.currency, sal.workDays, sal.absentDays, sal.lateCount,
      ]
      data.forEach((val, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = val
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        }
        if ([4, 6, 7, 8, 9].includes(ci)) {
          cell.numFmt = '#,##0.00'
        }
        // Alternating row colors (light gray on odd data rows)
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
        }
      })
      totalNet += Number(sal.netSalary)
    })

    // Auto-fit column widths based on content
    for (let ci = 1; ci <= headers.length; ci++) {
      const col = ws.getColumn(ci)
      let maxLen = headers[ci - 1].length
      salaries.forEach((sal) => {
        const e = sal.employee
        const vals = [
          e.employeeId, e.fullNameEn,
          e.department?.nameEn || '', e.positionEn,
          String(Number(sal.baseSalary)), String(Number(sal.overtimeHours)),
          String(Number(sal.overtimeAmount)), String(Number(sal.totalBonuses)),
          String(Number(sal.totalDeductions)), String(Number(sal.netSalary)),
          e.currency, String(sal.workDays), String(sal.absentDays), String(sal.lateCount),
        ]
        const cellLen = (vals[ci - 1] || '').length
        if (cellLen > maxLen) maxLen = cellLen
      })
      col.width = Math.min(Math.max(maxLen + 4, 12), 40)
    }

    // Totals row
    const totalRow = ws.getRow(salaries.length + 3)
    totalRow.getCell(1).value = 'TOTAL'
    totalRow.getCell(1).font = { bold: true }
    totalRow.getCell(10).value = Math.round(totalNet * 100) / 100
    totalRow.getCell(10).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    const fileCompany = company ? company.nameEn : 'AllCompanies'

    return new Response(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileCompany}_payroll_${y}_${String(m).padStart(2, '0')}.xlsx"`,
      },
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Excel export error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
