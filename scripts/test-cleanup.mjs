import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const admin = await db.user.findUnique({
  where: { email: "admin@bgroup.com" },
  select: { id: true },
});
if (!admin) {
  console.log("[cleanup] admin not found, nothing to wipe");
  await db.$disconnect();
  process.exit(0);
}

const scope = process.argv[2] ?? "all";

const tally = {};

if (scope === "all" || scope === "tasks") {
  // Wipe everything that prior task-suite runs may have left behind,
  // narrowed to the test admin so we never touch real user data.
  const taskWhere = { OR: [{ createdById: admin.id }, { assigneeId: admin.id }] };

  const subTasks = await db.taskDependency.deleteMany({
    where: { OR: [
      { taskId: { in: (await db.task.findMany({ where: taskWhere, select: { id: true } })).map((t) => t.id) } },
      { blockedById: { in: (await db.task.findMany({ where: taskWhere, select: { id: true } })).map((t) => t.id) } },
    ] },
  });
  tally.taskDependency = subTasks.count;

  const tWatchers = await db.taskWatcher.deleteMany({
    where: { task: taskWhere },
  });
  tally.taskWatcher = tWatchers.count;

  const tComments = await db.taskComment.deleteMany({
    where: { task: taskWhere },
  });
  tally.taskComment = tComments.count;

  // Cascade: task children → parents, then everything else.
  const tDeleted = await db.task.deleteMany({ where: taskWhere });
  tally.task = tDeleted.count;
}

if (scope === "all" || scope === "workflows") {
  // Wipe sequential-workflow leftovers, narrowed to the admin.
  const wfWhere = { createdById: admin.id };
  const runs = await db.sequentialWorkflowRun.deleteMany({
    where: { workflow: wfWhere },
  });
  tally.sequentialWorkflowRun = runs.count;

  const steps = await db.sequentialWorkflowStep.deleteMany({
    where: { workflow: wfWhere },
  });
  tally.sequentialWorkflowStep = steps.count;

  const wfs = await db.sequentialWorkflow.deleteMany({ where: wfWhere });
  tally.sequentialWorkflow = wfs.count;
}

const removed = Object.entries(tally)
  .filter(([, n]) => n > 0)
  .map(([k, n]) => `${k}=${n}`)
  .join(", ");

console.log(`[cleanup ${scope}] ${removed || "no residue"}`);

await db.$disconnect();
