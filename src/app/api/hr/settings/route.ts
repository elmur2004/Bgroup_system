import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isSuperAdmin } from '@/lib/hr/permissions'
import { createAuditLog, getClientIp } from '@/lib/hr/audit'
import { createSettingSchema } from '@/lib/hr/validations'

const VALUE_TYPE_MAP: Record<string, [string, string[] | null]> = {
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

function serializeSetting(s: any) {
  const typeInfo = VALUE_TYPE_MAP[s.key] || ['string', null]
  return {
    id: s.id,
    key: s.key,
    value: s.value,
    description: s.description,
    category: s.category,
    value_type: typeInfo[0],
    options: typeInfo[1],
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (category) where.category = category

    const settings = await prisma.hrAppSetting.findMany({ where })
    return NextResponse.json(settings.map(serializeSetting))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isSuperAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createSettingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    if (Array.isArray(data)) {
      const results = []
      for (const item of data) {
        if (!item.key) continue
        if (!VALUE_TYPE_MAP[item.key]) {
          return NextResponse.json(
            { detail: `Unknown setting key: '${item.key}'.` },
            { status: 400 }
          )
        }
        const typeInfo = VALUE_TYPE_MAP[item.key]
        if (typeInfo && typeInfo[0] === 'number' && isNaN(Number(item.value))) {
          return NextResponse.json(
            { detail: `Setting '${item.key}' must be a numeric value.` },
            { status: 400 }
          )
        }
        const itemValue = item.value !== undefined && item.value !== null ? String(item.value) : ''
        const setting = await prisma.hrAppSetting.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            value: itemValue,
            description: item.description || '',
            category: item.category || 'general',
            createdAt: now,
            updatedAt: now,
          },
          update: {
            value: itemValue,
            description: item.description || '',
            category: item.category || 'general',
            updatedAt: now,
          },
        })
        results.push(serializeSetting(setting))
      }

      await createAuditLog({
        userId: authUser.id,
        action: 'update',
        entityType: 'setting',
        details: `Bulk updated ${results.length} settings`,
        ipAddress: getClientIp(request),
      })

      return NextResponse.json(results)
    } else {
      const item = data
      if (!VALUE_TYPE_MAP[item.key]) {
        return NextResponse.json(
          { detail: `Unknown setting key: '${item.key}'.` },
          { status: 400 }
        )
      }
      const typeInfo = VALUE_TYPE_MAP[item.key]
      if (typeInfo && typeInfo[0] === 'number' && isNaN(Number(item.value))) {
        return NextResponse.json(
          { detail: `Setting '${item.key}' must be a numeric value.` },
          { status: 400 }
        )
      }
      const itemValue = item.value !== undefined && item.value !== null ? String(item.value) : ''
      const setting = await prisma.hrAppSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: itemValue,
          description: item.description || '',
          category: item.category || 'general',
          createdAt: now,
          updatedAt: now,
        },
        update: {
          value: itemValue,
          description: item.description || '',
          category: item.category || 'general',
          updatedAt: now,
        },
      })

      await createAuditLog({
        userId: authUser.id,
        action: 'update',
        entityType: 'setting',
        entityId: setting.id,
        details: `Updated setting "${item.key}" to "${itemValue}"`,
        ipAddress: getClientIp(request),
      })

      return NextResponse.json(serializeSetting(setting))
    }
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
