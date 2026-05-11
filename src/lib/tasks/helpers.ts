import type { TaskEntityType } from "@/generated/prisma";

export type TaskModule = "hr" | "crm" | "partners" | "general";

export function moduleForEntityType(t: TaskEntityType | null | undefined): TaskModule {
  if (!t) return "general";
  if (t.startsWith("CRM_")) return "crm";
  if (t.startsWith("HR_")) return "hr";
  if (t.startsWith("PARTNER_")) return "partners";
  return "general";
}

const ENTITY_HREF: Record<TaskEntityType, (id: string) => string> = {
  CRM_OPPORTUNITY: (id) => `/crm/opportunities/${id}`,
  CRM_COMPANY: (id) => `/crm/companies/${id}`,
  CRM_CONTACT: (id) => `/crm/contacts/${id}`,
  CRM_CALL: () => `/crm/calls`,
  HR_EMPLOYEE: (id) => `/hr/employees/${id}`,
  HR_LEAVE_REQUEST: () => `/hr/attendance/today`,
  HR_OVERTIME_REQUEST: () => `/hr/overtime/pending`,
  HR_INCIDENT: () => `/hr/incidents/all`,
  HR_REVIEW: () => `/hr/performance/reviews`,
  HR_GOAL: () => `/hr/performance/goals`,
  PARTNER_LEAD: (id) => `/partners/leads/${id}`,
  PARTNER_CLIENT: (id) => `/partners/clients/${id}`,
  PARTNER_DEAL: (id) => `/partners/deals/${id}`,
  PARTNER_REGISTRATION: () => `/partners/registrations`,
};

export function entityHref(t: TaskEntityType | null | undefined, id: string | null | undefined) {
  if (!t || !id) return null;
  const fn = ENTITY_HREF[t];
  return fn ? fn(id) : null;
}
