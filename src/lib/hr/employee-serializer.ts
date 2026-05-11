import { Prisma } from '@/generated/prisma'
type Decimal = Prisma.Decimal

type EmployeeWithRelations = {
  id: string
  employeeId: string
  fullNameEn: string
  fullNameAr: string
  nationalId: string
  dateOfBirth: Date | null
  gender: string
  personalEmail: string
  phone: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  photo: string | null
  positionEn: string
  positionAr: string
  level: string
  employmentType: string
  workModel: string
  contractStart: Date | null
  contractEnd: Date | null
  probationEnd: Date | null
  status: string
  baseSalary: Decimal
  currency: string
  bankName: string
  bankAccount: string
  iban: string
  createdAt: Date
  updatedAt: Date
  companyId: string
  departmentId: string | null
  directManagerId: string | null
  shiftId: string | null
  userId: string | null
  company?: { nameEn: string } | null
  department?: { nameEn: string } | null
  shift?: { name: string; startTime: string; endTime: string; gracePeriodMinutes: number; dailyWorkHours: Decimal } | null
  directManager?: { fullNameEn: string; employeeId: string } | null
  user?: { email: string } | null
}

export function serializeEmployeeList(emp: EmployeeWithRelations) {
  return {
    id: emp.id,
    employee_id: emp.employeeId,
    full_name_en: emp.fullNameEn,
    full_name_ar: emp.fullNameAr,
    company: emp.companyId,
    company_name: emp.company?.nameEn || '',
    department: emp.departmentId,
    department_name: emp.department?.nameEn || null,
    position_en: emp.positionEn,
    level: emp.level,
    employment_type: emp.employmentType,
    work_model: emp.workModel,
    status: emp.status,
    shift: emp.shiftId,
    shift_name: emp.shift?.name || null,
    direct_manager: emp.directManagerId,
    direct_manager_name: emp.directManager?.fullNameEn || null,
    direct_manager_id: emp.directManager?.employeeId || null,
    base_salary: emp.baseSalary.toString(),
    currency: emp.currency,
    contract_start: emp.contractStart?.toISOString().split('T')[0] || null,
    contract_end: emp.contractEnd?.toISOString().split('T')[0] || null,
    photo: emp.photo || null,
    created_at: emp.createdAt.toISOString(),
  }
}

export function serializeEmployeeDetail(emp: EmployeeWithRelations) {
  return {
    id: emp.id,
    employee_id: emp.employeeId,
    user: emp.userId,
    user_email: emp.user?.email || null,
    email: emp.user?.email || null,
    // Personal
    full_name_en: emp.fullNameEn,
    full_name_ar: emp.fullNameAr,
    national_id: emp.nationalId,
    date_of_birth: emp.dateOfBirth?.toISOString().split('T')[0] || null,
    gender: emp.gender,
    personal_email: emp.personalEmail,
    phone: emp.phone,
    address: emp.address,
    emergency_contact_name: emp.emergencyContactName,
    emergency_contact_phone: emp.emergencyContactPhone,
    photo: emp.photo || null,
    // Employment
    company: emp.companyId,
    company_name: emp.company?.nameEn || '',
    department: emp.departmentId,
    department_name: emp.department?.nameEn || null,
    position_en: emp.positionEn,
    position_ar: emp.positionAr,
    level: emp.level,
    employment_type: emp.employmentType,
    work_model: emp.workModel,
    direct_manager: emp.directManagerId,
    direct_manager_name: emp.directManager?.fullNameEn || null,
    direct_manager_employee_id: emp.directManager?.employeeId || null,
    team_lead_name: emp.directManager?.fullNameEn || null,
    shift: emp.shiftId,
    shift_name: emp.shift?.name || null,
    shift_start: emp.shift?.startTime || null,
    shift_end: emp.shift?.endTime || null,
    shift_grace: emp.shift?.gracePeriodMinutes || null,
    shift_daily_hours: emp.shift?.dailyWorkHours?.toString() || null,
    contract_start: emp.contractStart?.toISOString().split('T')[0] || null,
    contract_end: emp.contractEnd?.toISOString().split('T')[0] || null,
    probation_end: emp.probationEnd?.toISOString().split('T')[0] || null,
    status: emp.status,
    hire_date: emp.contractStart?.toISOString().split('T')[0] || null,
    // Salary
    base_salary: emp.baseSalary.toString(),
    currency: emp.currency,
    bank_name: emp.bankName,
    bank_account: emp.bankAccount,
    iban: emp.iban,
    // Meta
    created_at: emp.createdAt.toISOString(),
    updated_at: emp.updatedAt.toISOString(),
  }
}
