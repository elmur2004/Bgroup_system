import { db } from "@/lib/db";
import { TaskPriority, TaskType } from "@/generated/prisma";

export type OnboardingChecklistItem = {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  /** Days from now until the item is due. */
  dueInDays: number;
};

/**
 * Resolve the items to use for a given checklist run.
 * Precedence: explicit templateId → DB default → hardcoded fallback.
 */
export async function resolveChecklistItems(templateId?: string | null): Promise<OnboardingChecklistItem[]> {
  if (templateId) {
    const tpl = await db.onboardingTemplate.findUnique({
      where: { id: templateId },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (tpl?.isActive && tpl.items.length > 0) return mapItems(tpl.items);
  }
  const def = await db.onboardingTemplate.findFirst({
    where: { isActive: true, isDefault: true },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (def && def.items.length > 0) return mapItems(def.items);
  return DEFAULT_ONBOARDING_CHECKLIST;
}

function mapItems(
  items: Array<{ title: string; description: string; taskType: string; priority: string; dueInDays: number }>
): OnboardingChecklistItem[] {
  const validTypes = Object.values(TaskType) as string[];
  const validPriorities = Object.values(TaskPriority) as string[];
  return items.map((it) => ({
    title: it.title,
    description: it.description,
    type: (validTypes.includes(it.taskType) ? it.taskType : "GENERAL") as TaskType,
    priority: (validPriorities.includes(it.priority) ? it.priority : "MEDIUM") as TaskPriority,
    dueInDays: it.dueInDays,
  }));
}

/**
 * Default 10-step onboarding checklist used when an HR admin clicks
 * "Create onboarding checklist" on a new hire's profile. Each item maps to
 * a Task linked to the employee.
 */
export const DEFAULT_ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  { title: "Send welcome email and Day-1 logistics", type: "EMAIL", priority: "HIGH", dueInDays: 0 },
  { title: "Provision laptop and corporate accounts", type: "ADMIN", priority: "HIGH", dueInDays: 1 },
  { title: "Schedule Day-1 onboarding session", type: "MEETING", priority: "HIGH", dueInDays: 1 },
  { title: "Collect signed offer letter and ID copies", type: "ADMIN", priority: "MEDIUM", dueInDays: 2 },
  { title: "Add to payroll and benefits enrolment", type: "ADMIN", priority: "MEDIUM", dueInDays: 3 },
  { title: "Assign mentor / buddy", type: "GENERAL", priority: "MEDIUM", dueInDays: 3 },
  { title: "Introduce to team and stakeholders", type: "MEETING", priority: "MEDIUM", dueInDays: 5 },
  { title: "Walk through company handbook + policies", type: "ONBOARDING", priority: "MEDIUM", dueInDays: 7 },
  { title: "Set 30-day goals with manager", type: "REVIEW", priority: "HIGH", dueInDays: 14 },
  { title: "Schedule 30-day check-in", type: "MEETING", priority: "MEDIUM", dueInDays: 30 },
];

export type OnboardingResult = {
  parentId: string;
  childCount: number;
};

/**
 * Spawn a parent task ("Onboarding: <employee>") plus a subtask per checklist
 * item. Each task is linked to the employee via the polymorphic
 * `entityType=HR_EMPLOYEE` reference, so they appear under the Tasks tab on
 * the employee profile.
 *
 * @param employeeId  HrEmployee.id
 * @param createdByUserId User creating the checklist (also the assignee for now;
 *   admins can reassign per-task in the drawer)
 * @param items  Override the default checklist if needed.
 */
export async function createOnboardingChecklist(
  employeeId: string,
  createdByUserId: string,
  items?: OnboardingChecklistItem[],
  templateId?: string | null
): Promise<OnboardingResult> {
  if (!items) items = await resolveChecklistItems(templateId);
  const employee = await db.hrEmployee.findUnique({
    where: { id: employeeId },
    select: { id: true, fullNameEn: true },
  });
  if (!employee) throw new Error("Employee not found");

  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const parent = await db.task.create({
    data: {
      title: `Onboarding: ${employee.fullNameEn}`,
      description: "Day-0 through 30-day onboarding checklist.",
      type: "ONBOARDING",
      priority: "HIGH",
      module: "hr",
      assigneeId: createdByUserId,
      createdById: createdByUserId,
      entityType: "HR_EMPLOYEE",
      entityId: employeeId,
      dueAt: addDays(today, 30),
    },
    select: { id: true },
  });

  await db.task.createMany({
    data: items.map((item) => ({
      title: item.title,
      description: item.description ?? "",
      type: item.type ?? "GENERAL",
      priority: item.priority ?? "MEDIUM",
      module: "hr",
      assigneeId: createdByUserId,
      createdById: createdByUserId,
      entityType: "HR_EMPLOYEE" as const,
      entityId: employeeId,
      parentId: parent.id,
      dueAt: addDays(today, item.dueInDays),
    })),
  });

  return { parentId: parent.id, childCount: items.length };
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
