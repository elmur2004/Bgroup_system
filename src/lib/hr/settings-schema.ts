import { z } from 'zod'

export const HR_SETTINGS_VALUE_TYPE_MAP: Record<string, [string, string[] | null]> = {
  company_name: ['string', null],
  fiscal_year_start: ['select', ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']],
  default_currency: ['select', ['EGP', 'QAR', 'AED', 'USD']],
  timezone: ['string', null],
  max_deduction_pct: ['number', null],
  payroll_lock_day: ['number', null],
  payment_method: ['select', ['bank_transfer', 'cash', 'check']],
  salary_calculation_basis: ['select', ['30_days', 'working_days']],
  late_threshold_minutes: ['number', null],
  absent_by_time: ['string', null],
  working_hours_per_day: ['number', null],
  working_days_per_month: ['number', null],
  ot_requires_approval: ['boolean', null],
  ot_max_hours_monthly: ['number', null],
  ot_min_hours: ['number', null],
  ot_rate_weekday: ['number', null],
  incident_requires_approval: ['boolean', null],
  bonus_requires_approval: ['boolean', null],
  leave_requires_approval: ['boolean', null],
  allow_checkin_from_app: ['boolean', null],
  allow_ot_submission: ['boolean', null],
  allow_leave_request: ['boolean', null],
  allow_profile_update_request: ['boolean', null],
  excel_format_company_logo: ['boolean', null],
  pdf_watermark: ['boolean', null],
  pdf_language: ['select', ['en', 'ar']],
  include_bank_in_export: ['boolean', null],
}

export const HR_SETTINGS_ALLOWED_KEYS = new Set(Object.keys(HR_SETTINGS_VALUE_TYPE_MAP))
export const HR_SETTINGS_ALLOWED_CATEGORIES = new Set(['general', 'payroll', 'attendance', 'overtime', 'incidents', 'bonuses', 'leave', 'self_service', 'export'])

export function isAllowedSettingsKey(key: unknown): key is string {
  return typeof key === 'string' && HR_SETTINGS_ALLOWED_KEYS.has(key)
}

export function validateSettingValue(key: string, value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const typeInfo = HR_SETTINGS_VALUE_TYPE_MAP[key]
  if (!typeInfo) return { ok: false, error: `Unknown setting key: ${key}` }
  const [valueType, options] = typeInfo
  const asString = value == null ? '' : String(value)

  if (valueType === 'number') {
    if (asString !== '' && Number.isNaN(Number(asString))) {
      return { ok: false, error: `${key} must be numeric` }
    }
  } else if (valueType === 'boolean') {
    if (!['true', 'false', ''].includes(asString.toLowerCase())) {
      return { ok: false, error: `${key} must be boolean` }
    }
  } else if (valueType === 'select') {
    if (options && asString !== '' && !options.includes(asString)) {
      return { ok: false, error: `${key} must be one of: ${options.join(', ')}` }
    }
  }
  return { ok: true, value: asString }
}

export const bulkSettingsItemSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const bulkSettingsSchema = z.array(bulkSettingsItemSchema)
