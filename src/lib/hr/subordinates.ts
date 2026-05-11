import { db } from "@/lib/db";

/**
 * Org-chart-derived authorization helpers.
 *
 * Anyone with subordinates in the HrEmployee.directManager chain is
 * effectively a team lead — no `team_lead` HR role flag required. The user's
 * authority comes from who reports to them, not from a flag we set at
 * creation time.
 */

/**
 * Walks the directManager → reports tree from `managerEmployeeId` and returns
 * the IDs of every HrEmployee that ultimately reports up to that manager
 * (direct + indirect). Excludes the manager themselves.
 *
 * O(N) over the subtree; uses BFS with batched queries per level.
 */
export async function getSubordinateEmployeeIds(managerEmployeeId: string): Promise<Set<string>> {
  const result = new Set<string>();
  let frontier: string[] = [managerEmployeeId];
  while (frontier.length > 0) {
    const directs = await db.hrEmployee.findMany({
      where: { directManagerId: { in: frontier } },
      select: { id: true },
    });
    const next: string[] = [];
    for (const d of directs) {
      if (!result.has(d.id) && d.id !== managerEmployeeId) {
        result.add(d.id);
        next.push(d.id);
      }
    }
    frontier = next;
  }
  return result;
}

/**
 * Same as {@link getSubordinateEmployeeIds} but returns the underlying User
 * IDs (useful when scoping queries that key off User.id — e.g. Tasks,
 * comments, login-based modules).
 */
export async function getSubordinateUserIds(userId: string): Promise<Set<string>> {
  const me = await db.hrEmployee.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!me) return new Set();
  const empIds = await getSubordinateEmployeeIds(me.id);
  if (empIds.size === 0) return new Set();
  const emps = await db.hrEmployee.findMany({
    where: { id: { in: Array.from(empIds) } },
    select: { userId: true },
  });
  return new Set(emps.map((e) => e.userId).filter((id): id is string => !!id));
}

/**
 * Quick check — does this user have anyone reporting to them?
 * Used by UI to decide whether to render team-lead surfaces.
 */
export async function hasSubordinates(userId: string): Promise<boolean> {
  const me = await db.hrEmployee.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!me) return false;
  const one = await db.hrEmployee.findFirst({
    where: { directManagerId: me.id },
    select: { id: true },
  });
  return !!one;
}
