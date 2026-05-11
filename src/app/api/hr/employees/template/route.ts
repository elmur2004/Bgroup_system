import { NextResponse } from 'next/server'

export async function GET() {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Employees')

  const headers = [
    'full_name_en', 'full_name_ar', 'national_id', 'date_of_birth',
    'gender', 'personal_email', 'phone', 'company_name', 'department_name',
    'position_en', 'level', 'employment_type', 'work_model',
    'contract_start', 'contract_end', 'base_salary', 'currency', 'status',
  ]

  const headerRow = worksheet.addRow(headers)
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } }
    cell.font = { color: { argb: 'FFFFFF' }, bold: true }
    cell.alignment = { horizontal: 'center' }
  })

  headers.forEach((_, idx) => {
    worksheet.getColumn(idx + 1).width = 20
  })

  worksheet.addRow([
    'John Smith', 'جون سميث', '12345678901234', '1990-01-15',
    'male', 'john@example.com', '+201001234567', 'ByteForce', 'Engineering',
    'Software Engineer', 'mid', 'full_time', 'onsite',
    '2024-01-01', '', '15000', 'EGP', 'active',
  ])

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee_import_template.xlsx"',
    },
  })
}
