import { db } from "@/lib/db";

/**
 * Returns true if adding `taskId depends on blockedById` would create a cycle.
 * Walks the existing dependency graph forward from `blockedById` to see if
 * `taskId` is reachable. O(V+E) over the connected component.
 */
export async function wouldCreateCycle(taskId: string, blockedById: string): Promise<boolean> {
  if (taskId === blockedById) return true;

  // Walk: who blocks the would-be-blocker, transitively. If any of them is the
  // dependent task itself, we have a cycle.
  const visited = new Set<string>();
  const queue: string[] = [blockedById];

  while (queue.length > 0) {
    const cursor = queue.shift()!;
    if (visited.has(cursor)) continue;
    visited.add(cursor);

    if (cursor === taskId) return true;

    const upstream = await db.taskDependency.findMany({
      where: { taskId: cursor },
      select: { blockedById: true },
    });
    for (const u of upstream) {
      if (!visited.has(u.blockedById)) queue.push(u.blockedById);
    }
  }

  return false;
}

/**
 * After a task transitions to DONE, find any dependents whose ALL blockers are
 * now done — those are now unblocked. Returns the unblocked task ids so the
 * caller can fan out notifications.
 */
export async function findUnblockedTasks(completedTaskId: string): Promise<string[]> {
  const dependents = await db.taskDependency.findMany({
    where: { blockedById: completedTaskId },
    select: { taskId: true },
  });
  if (dependents.length === 0) return [];

  const unblocked: string[] = [];
  for (const d of dependents) {
    const remainingBlockers = await db.taskDependency.findMany({
      where: { taskId: d.taskId },
      include: { blockedBy: { select: { status: true } } },
    });
    const allDone = remainingBlockers.every((r) => r.blockedBy.status === "DONE");
    if (allDone) unblocked.push(d.taskId);
  }
  return unblocked;
}
