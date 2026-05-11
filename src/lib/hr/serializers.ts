import { db as prisma } from '@/lib/db'

export async function serializeUser(userId: string) {
  const profile = await prisma.hrUserProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      roles: { include: { role: true } },
      companies: true,
      employee: true,
    },
  })
  if (!profile) return null

  return {
    id: profile.userId,
    email: profile.user.email ?? '',
    username: profile.username,
    first_name: profile.firstName,
    last_name: profile.lastName,
    full_name: `${profile.firstName} ${profile.lastName}`.trim() || profile.user.email,
    phone: profile.phone,
    avatar: profile.avatar,
    roles: profile.roles.map((ur) => ur.role.name),
    employee_id: profile.employee?.employeeId || null,
    linked_employee: profile.employee
      ? { id: profile.employee.id, employee_id: profile.employee.employeeId, name: profile.employee.fullNameEn }
      : null,
    companies: profile.companies.map((uc) => uc.companyId),
    is_active: profile.isActive,
    created_at: profile.createdAt.toISOString(),
  }
}
