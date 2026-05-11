import { z } from "zod";
import { db } from "@/lib/db";
import type { Task } from "@/generated/prisma";

/**
 * Recurrence config stored on `Task.recurrence` (JSON).
 *
 * Two modes:
 *   - `after_complete`: when the task is marked DONE, a fresh instance is
 *     spawned `intervalDays` after completion. Chain follow-on tasks.
 *   - `fixed_schedule`: spawn a fresh instance on a fixed cadence regardless
 *     of completion. Driven by the cron endpoint `/api/cron/recurring-tasks`.
 *     `every` is a simple cadence ("daily" | "weekly" | "monthly") so we don't
 *     need a full cron expression parser.
 *
 * `until` (ISO date string) caps how long the chain runs in either mode.
 */
const afterCompleteSchema = z.object({
  kind: z.literal("after_complete"),
  intervalDays: z.number().int().positive().max(365),
  until: z.string().datetime().optional(),
});

const fixedScheduleSchema = z.object({
  kind: z.literal("fixed_schedule"),
  every: z.enum(["daily", "weekly", "monthly"]),
  /// Local hour (0-23) at which the next instance becomes due. Defaults to 9.
  atHour: z.number().int().min(0).max(23).optional(),
  until: z.string().datetime().optional(),
});

export const recurrenceSchema = z.discriminatedUnion("kind", [
  afterCompleteSchema,
  fixedScheduleSchema,
]);

export type RecurrenceConfig = z.infer<typeof recurrenceSchema>;

export function parseRecurrence(value: unknown): RecurrenceConfig | null {
  if (!value || typeof value !== "object") return null;
  const result = recurrenceSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Spawn the next instance of a recurring task on completion (after_complete
 * mode). For `fixed_schedule` recurrence the spawning happens via the cron
 * endpoint instead. Returns the new task id, or null if no spawn is needed
 * (wrong mode, past `until`, etc.).
 */
export async function spawnNextRecurrence(source: Task): Promise<string | null> {
  const rule = parseRecurrence(source.recurrence);
  if (!rule || rule.kind !== "after_complete") return null;

  const next = new Date();
  next.setDate(next.getDate() + rule.intervalDays);

  if (rule.until && next > new Date(rule.until)) return null;

  const templateId = source.recurrenceTemplateId ?? source.id;

  const created = await db.task.create({
    data: {
      title: source.title,
      description: source.description,
      type: source.type,
      priority: source.priority,
      status: "TODO",
      assigneeId: source.assigneeId,
      createdById: source.createdById,
      entityType: source.entityType,
      entityId: source.entityId,
      module: source.module,
      dueAt: next,
      recurrence: source.recurrence ?? undefined,
      recurrenceTemplateId: templateId,
      parentId: source.parentId,
    },
    select: { id: true },
  });

  return created.id;
}

/**
 * Compute the next due date for a fixed_schedule rule given a "last spawn"
 * anchor. Returns null if the rule's `until` has already passed.
 */
export function computeNextFixedDueAt(
  rule: Extract<RecurrenceConfig, { kind: "fixed_schedule" }>,
  lastAnchor: Date
): Date | null {
  const next = new Date(lastAnchor);
  if (rule.every === "daily") next.setDate(next.getDate() + 1);
  else if (rule.every === "weekly") next.setDate(next.getDate() + 7);
  else if (rule.every === "monthly") next.setMonth(next.getMonth() + 1);
  next.setHours(rule.atHour ?? 9, 0, 0, 0);
  if (rule.until && next > new Date(rule.until)) return null;
  return next;
}
