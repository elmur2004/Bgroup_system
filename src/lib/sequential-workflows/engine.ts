import { db } from "@/lib/db";
import { publish } from "@/lib/events/bus";
import { CrmRole, type SequentialWorkflowRun, type SequentialWorkflowStep, type SequentialStepSlaResult } from "@/generated/prisma";

export type RunContext = {
  /** User who triggered the run — used as fallback assignee when steps say `creator`. */
  triggeredById: string;
  /** Optional entity reference attached to every spawned task. */
  entityType?: string | null;
  entityId?: string | null;
};

/**
 * Resolve who a step's task should be assigned to.
 *
 * Order of precedence:
 *   1. Explicit step.assigneeUserId
 *   2. step.assigneeRole === "creator" / "trigger_user" → run.triggeredById
 *   3. step.assigneeRole = some literal role → first user matching that role
 *      (lookup currently scans HR profile + CRM profile)
 *   4. Fallback: run.triggeredById
 */
export async function resolveStepAssignee(
  step: SequentialWorkflowStep,
  run: { triggeredById: string }
): Promise<string> {
  if (step.assigneeUserId) return step.assigneeUserId;
  if (step.assigneeRole === "creator" || step.assigneeRole === "trigger_user") {
    return run.triggeredById;
  }
  if (step.assigneeRole) {
    const role = step.assigneeRole;
    const hrUser = await db.hrUserRole.findFirst({
      where: { role: { name: role } },
      include: { user: true },
    });
    if (hrUser?.user) return hrUser.user.id;
    const validCrmRoles = Object.values(CrmRole);
    if (validCrmRoles.includes(role as CrmRole)) {
      const crmUser = await db.crmUserProfile.findFirst({
        where: { role: role as CrmRole },
        select: { userId: true },
      });
      if (crmUser?.userId) return crmUser.userId;
    }
  }
  return run.triggeredById;
}

/**
 * Spawn the task for a given step inside a run. Creates the SequentialWorkflowRunStep
 * row that links them. Idempotent — does nothing if the step already has a run-step.
 */
export async function spawnStepTask(
  run: SequentialWorkflowRun & { workflow?: { module: string } },
  step: SequentialWorkflowStep,
  ctx: { entityType?: string | null; entityId?: string | null }
): Promise<{ taskId: string; runStepId: string }> {
  const existing = await db.sequentialWorkflowRunStep.findFirst({
    where: { runId: run.id, stepId: step.id },
    select: { id: true, taskId: true },
  });
  if (existing) return { taskId: existing.taskId, runStepId: existing.id };

  const assigneeId = await resolveStepAssignee(step, run);
  const moduleName = run.workflow?.module ?? "general";

  const taskType = step.taskType as "GENERAL" | "CALL" | "EMAIL" | "MEETING" | "FOLLOW_UP" | "ADMIN" | "ONBOARDING" | "REVIEW" | "APPROVAL";
  const taskPriority = step.taskPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  // Due-date model differs by workflow kind:
  //   TEMPLATE → relative budget (now + budgetHours)
  //   CUSTOM   → absolute deadlineAt from the step (the user picked a
  //              calendar date+time when authoring this one-shot workflow).
  // If a CUSTOM step is missing its deadline (shouldn't happen with proper
  // form validation, but defend against it) we fall back to the relative
  // budget so a task still has a sensible dueAt.
  const dueAt = step.deadlineAt
    ? new Date(step.deadlineAt)
    : new Date(Date.now() + step.budgetHours * 3600_000);

  const task = await db.task.create({
    data: {
      title: step.taskTitle,
      description: step.taskDescription,
      type: taskType,
      priority: taskPriority,
      status: "TODO",
      module: moduleName,
      assigneeId,
      createdById: run.triggeredById,
      entityType: (ctx.entityType ?? null) as null,
      entityId: ctx.entityId ?? null,
      dueAt,
    },
    select: { id: true },
  });

  const runStep = await db.sequentialWorkflowRunStep.create({
    data: {
      runId: run.id,
      stepId: step.id,
      position: step.position,
      taskId: task.id,
    },
  });

  publish({
    type: "task.created",
    userId: assigneeId,
    payload: { id: task.id, title: step.taskTitle, module: moduleName },
  });

  return { taskId: task.id, runStepId: runStep.id };
}

/**
 * Trigger a brand-new run of a workflow. Creates the run row + spawns the
 * first step's task. Caller must have permission (typically platform admin
 * or workflow owner).
 */
export async function triggerWorkflow(
  workflowId: string,
  ctx: RunContext
): Promise<{ runId: string; firstTaskId: string } | { error: string }> {
  const workflow = await db.sequentialWorkflow.findUnique({
    where: { id: workflowId },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!workflow || !workflow.isActive) {
    return { error: "Workflow not found or inactive" };
  }
  if (workflow.steps.length === 0) {
    return { error: "Workflow has no steps" };
  }

  const run = await db.sequentialWorkflowRun.create({
    data: {
      workflowId: workflow.id,
      triggeredById: ctx.triggeredById,
      context: { entityType: ctx.entityType ?? null, entityId: ctx.entityId ?? null },
      status: "RUNNING",
      currentStepIndex: 0,
    },
  });

  const { taskId } = await spawnStepTask(
    { ...run, workflow: { module: workflow.module } },
    workflow.steps[0],
    { entityType: ctx.entityType, entityId: ctx.entityId }
  );

  return { runId: run.id, firstTaskId: taskId };
}

export type AdvanceResult =
  | {
      ok: true;
      sla: SequentialStepSlaResult;
      durationMinutes: number;
      budgetMinutes: number;
      nextTaskId?: string;
      runCompleted: boolean;
    }
  | { ok: false; reason: string };

/**
 * Called when a task linked to a run-step transitions to DONE. Computes the
 * SLA outcome, fires HR side-effects (incident/bonus), and spawns the next
 * step's task. If this was the last step, marks the run COMPLETED.
 */
export async function advanceRunOnTaskDone(taskId: string): Promise<AdvanceResult> {
  const runStep = await db.sequentialWorkflowRunStep.findUnique({
    where: { taskId },
    include: {
      step: true,
      run: { include: { workflow: { include: { steps: { orderBy: { position: "asc" } } } } } },
    },
  });
  if (!runStep) return { ok: false, reason: "Task is not part of a sequential workflow run" };
  if (runStep.completedAt) {
    return { ok: false, reason: "Run step already completed" };
  }

  const startedAt = runStep.startedAt ?? runStep.createdAt;
  const completedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60_000));

  // Budget semantics depend on workflow kind:
  //   TEMPLATE → budgetHours (relative). The step took at most budgetHours.
  //   CUSTOM   → deadlineAt   (absolute). Late if completed past the deadline,
  //              "early bonus" if completed at least 50% of the available
  //              window before the deadline. budgetMinutes for the report
  //              is the original window from createdAt → deadlineAt.
  const kind = runStep.run.workflow.kind ?? "TEMPLATE";
  let budgetMinutes: number;
  let sla: SequentialStepSlaResult = "ON_TIME";

  if (kind === "CUSTOM" && runStep.step.deadlineAt) {
    const deadline = new Date(runStep.step.deadlineAt);
    const windowFrom = runStep.createdAt;
    budgetMinutes = Math.max(
      1,
      Math.round((deadline.getTime() - windowFrom.getTime()) / 60_000)
    );
    if (completedAt > deadline) sla = "LATE";
    else if (deadline.getTime() - completedAt.getTime() >= (deadline.getTime() - windowFrom.getTime()) / 2) {
      sla = "EARLY_BONUS";
    }
  } else {
    budgetMinutes = Math.max(1, Math.round(runStep.step.budgetHours * 60));
    if (durationMinutes > budgetMinutes) sla = "LATE";
    else if (durationMinutes < budgetMinutes / 2) sla = "EARLY_BONUS";
  }

  await db.sequentialWorkflowRunStep.update({
    where: { id: runStep.id },
    data: { completedAt, durationMinutes, slaResult: sla },
  });

  // SLA side-effects on HR.
  const completedTask = await db.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, title: true },
  });
  if (completedTask) {
    const employee = await db.hrEmployee.findFirst({
      where: { userId: completedTask.assigneeId },
      select: { id: true },
    });
    const adminProfile = await db.hrUserProfile.findUnique({
      where: { userId: runStep.run.triggeredById },
      select: { userId: true },
    });
    if (employee && adminProfile) {
      if (sla === "LATE" && runStep.step.slaIncidentOnLate) {
        await ensureSlaIncident({
          employeeId: employee.id,
          submittedById: adminProfile.userId,
          taskTitle: completedTask.title,
          overMinutes: durationMinutes - budgetMinutes,
        });
      } else if (sla === "EARLY_BONUS" && runStep.step.slaBonusOnEarly) {
        await ensureSlaBonus({
          employeeId: employee.id,
          submittedById: adminProfile.userId,
          taskTitle: completedTask.title,
        });
      }
    }
  }

  // Advance: spawn next step or complete the run.
  const allSteps = runStep.run.workflow.steps;
  const nextStep = allSteps.find((s) => s.position === runStep.position + 1);
  let nextTaskId: string | undefined;
  let runCompleted = false;
  if (nextStep) {
    const ctx = (runStep.run.context as { entityType?: string | null; entityId?: string | null } | null) ?? {};
    const spawn = await spawnStepTask(
      { ...runStep.run, workflow: { module: runStep.run.workflow.module } },
      nextStep,
      { entityType: ctx.entityType ?? null, entityId: ctx.entityId ?? null }
    );
    nextTaskId = spawn.taskId;
    await db.sequentialWorkflowRun.update({
      where: { id: runStep.runId },
      data: { currentStepIndex: nextStep.position },
    });
  } else {
    await db.sequentialWorkflowRun.update({
      where: { id: runStep.runId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    runCompleted = true;
    // One-shot CUSTOM workflows auto-archive when the run finishes — they
    // were never intended to be re-triggered. Deactivating the workflow
    // hides it from the template picker.
    if (runStep.run.workflow.kind === "CUSTOM") {
      await db.sequentialWorkflow.update({
        where: { id: runStep.run.workflow.id },
        data: { isActive: false, consumedAt: new Date() },
      });
    }
  }

  return { ok: true, sla, durationMinutes, budgetMinutes, nextTaskId, runCompleted };
}

/**
 * Mark the run-step as started when the user clicks Start on the task. Pure
 * timestamp update; the SLA only matters at completion. Idempotent.
 */
export async function markRunStepStarted(taskId: string): Promise<void> {
  const runStep = await db.sequentialWorkflowRunStep.findUnique({
    where: { taskId },
    select: { id: true, startedAt: true },
  });
  if (!runStep || runStep.startedAt) return;
  await db.sequentialWorkflowRunStep.update({
    where: { id: runStep.id },
    data: { startedAt: new Date() },
  });
}

// ─── HR side-effects ───────────────────────────────────────────────────────

async function ensureSlaIncident(args: {
  employeeId: string;
  submittedById: string;
  taskTitle: string;
  overMinutes: number;
}) {
  // Need a violation rule to attach to. Auto-provision a generic SLA rule.
  let category = await db.hrViolationCategory.findFirst({ where: { code: "SLA" } });
  if (!category) {
    try {
      category = await db.hrViolationCategory.create({
        data: { code: "SLA", nameEn: "SLA breach", nameAr: "إخلال بالخدمة" },
      });
    } catch {
      // Race: another caller created it, refetch.
      category = await db.hrViolationCategory.findFirst({ where: { code: "SLA" } });
    }
  }
  if (!category) return;
  let rule = await db.hrViolationRule.findFirst({ where: { code: "SLA-LATE" } });
  if (!rule) {
    try {
      rule = await db.hrViolationRule.create({
        data: {
          code: "SLA-LATE",
          nameEn: "Workflow SLA breach",
          nameAr: "تجاوز مهلة سير العمل",
          offense1Action: "verbal_warning",
          offense2Action: "written_warning",
          offense3Action: "final_warning",
          categoryId: category.id,
        },
      });
    } catch {
      rule = await db.hrViolationRule.findFirst({ where: { code: "SLA-LATE" } });
    }
  }
  if (!rule) return;
  // Best-effort offense counter.
  const previous = await db.hrIncident.count({ where: { employeeId: args.employeeId } });
  await db.hrIncident.create({
    data: {
      employeeId: args.employeeId,
      submittedById: args.submittedById,
      violationRuleId: rule.id,
      offenseNumber: previous + 1,
      incidentDate: new Date(),
      actionTaken: "verbal_warning",
      comments: `Workflow task "${args.taskTitle}" exceeded its time budget by ${args.overMinutes} minutes.`,
      status: "applied",
    },
  });
}

async function ensureSlaBonus(args: {
  employeeId: string;
  submittedById: string;
  taskTitle: string;
}) {
  let category = await db.hrBonusCategory.findFirst({ where: { code: "SLA" } });
  if (!category) {
    try {
      category = await db.hrBonusCategory.create({
        data: { code: "SLA", nameEn: "SLA bonus", nameAr: "مكافأة الالتزام بالمواعيد" },
      });
    } catch {
      category = await db.hrBonusCategory.findFirst({ where: { code: "SLA" } });
    }
  }
  if (!category) return;
  let rule = await db.hrBonusRule.findFirst({ where: { code: "SLA-EARLY" } });
  if (!rule) {
    try {
      rule = await db.hrBonusRule.create({
        data: {
          code: "SLA-EARLY",
          nameEn: "Early-completion bonus",
          nameAr: "مكافأة الإنجاز المبكر",
          valueType: "fixed",
          value: 500,
          frequency: "per_task",
          categoryId: category.id,
        },
      });
    } catch {
      rule = await db.hrBonusRule.findFirst({ where: { code: "SLA-EARLY" } });
    }
  }
  if (!rule) return;
  await db.hrBonus.create({
    data: {
      employeeId: args.employeeId,
      submittedById: args.submittedById,
      bonusRuleId: rule.id,
      bonusDate: new Date(),
      bonusAmount: 500,
      comments: `Completed workflow task "${args.taskTitle}" in under half the budgeted time.`,
      status: "pending",
    },
  });
}
