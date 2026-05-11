// Barrel file re-exporting all HR Zod schemas grouped by entity.
// Import from '@/lib/hr/validations' in route handlers.

// Attendance (logs, auto-rules, manual-entry)
export * from './attendance'
// Leave requests + leave types
export * from './leaveRequest'
// Shifts
export * from './shift'
// Bonuses (bonuses, categories, rules, cancel)
export * from './bonus'
// Incidents (incidents, violation-categories, violation-rules, resolve)
export * from './incident'
// Companies
export * from './company'
// Departments
export * from './department'
// Employees (main employee create/update lives in ./employee)
export * from './employee'
export * from './employeeExtras'
// Overtime (policies, requests, deny)
export * from './overtime'
// Payroll (calculate, monthly actions, periods, monthly salary)
export * from './payroll'
// Users (admin-managed) + me + refresh
export * from './user'
// App settings
export * from './settings'
// Employee documents
export * from './document'

// Auth schemas live in ./auth and export password helpers too
export {
  loginSchema,
  createUserSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  validatePassword,
} from './auth'
