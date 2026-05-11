import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isSuperAdmin } from '@/lib/hr/permissions'
import { bulkSettingsSchema, isAllowedSettingsKey, validateSettingValue, HR_SETTINGS_ALLOWED_CATEGORIES } from '@/lib/hr/settings-schema'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isSuperAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = bulkSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }

    const now = new Date()
    const results = []
    for (const item of parsed.data) {
      if (!isAllowedSettingsKey(item.key)) {
        return NextResponse.json({ detail: `Setting key not allowed: ${item.key}` }, { status: 400 })
      }
      const valueCheck = validateSettingValue(item.key, item.value)
      if (!valueCheck.ok) {
        return NextResponse.json({ detail: valueCheck.error }, { status: 400 })
      }
      const category = item.category && HR_SETTINGS_ALLOWED_CATEGORIES.has(item.category) ? item.category : 'general'
      const description = item.description ?? ''

      const setting = await prisma.hrAppSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: valueCheck.value,
          description,
          category,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          value: valueCheck.value,
          description,
          category,
          updatedAt: now,
        },
      })
      results.push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        created_at: setting.createdAt.toISOString(),
        updated_at: setting.updatedAt.toISOString(),
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
