import { db } from "@/lib/db";
import { findAction } from "@/lib/workflows/actions";
import type { WorkflowTriggerKind } from "@/generated/prisma";

/**
 * Persisted shape of a workflow step in `Workflow.steps`. The schema is JSON,
 * so we type-assert at use time.
 */
export type WorkflowStep = {
  kind: string;
  config: Record<string, unknown>;
  /** "continue" runs subsequent steps if this one fails; "stop" aborts. */
  branchOnError?: "continue" | "stop";
};

export type WorkflowTriggerEvent = {
  kind: WorkflowTriggerKind;
  /** "HrLeaveRequest", "PartnerDeal", etc. */
  entity?: string;
  /** Source of truth for placeholder resolution in step configs. */
  payload: Record<string, unknown>;
};

/**
 * Find workflows whose trigger matches and run them.
 *
 * Synchronous-ish — runs each workflow inline. Long-running steps (delays,
 * webhooks) extend the request lifetime; for production move runs to a queue.
 */
export async function dispatchTrigger(event: WorkflowTriggerEvent): Promise<void> {
  const matching = await db.workflow.findMany({
    where: {
      isActive: true,
      triggerKind: event.kind,
    },
  });

  for (const wf of matching) {
    const trigger = (wf.triggerConfig ?? {}) as Record<string, unknown>;
    if (trigger.entity && trigger.entity !== event.entity) continue;
    void runWorkflow(wf.id, event.payload);
  }
}

export async function runWorkflow(
  workflowId: string,
  input: Record<string, unknown>
): Promise<void> {
  const wf = await db.workflow.findUnique({ where: { id: workflowId } });
  if (!wf) return;
  const steps = (wf.steps ?? []) as WorkflowStep[];
  if (!Array.isArray(steps) || steps.length === 0) return;

  const run = await db.workflowRun.create({
    data: {
      workflowId,
      status: "RUNNING",
      input: JSON.parse(JSON.stringify(input)),
    },
  });

  const results: unknown[] = [];
  let stopped = false;
  let lastError: string | null = null;

  for (const [i, step] of steps.entries()) {
    const action = findAction(step.kind);
    if (!action) {
      lastError = `Unknown action: ${step.kind}`;
      if ((step.branchOnError ?? "stop") === "stop") {
        stopped = true;
        break;
      }
      continue;
    }
    const parsed = action.config.safeParse(step.config);
    if (!parsed.success) {
      lastError = `Invalid config for ${step.kind}: ${parsed.error.issues[0].message}`;
      if ((step.branchOnError ?? "stop") === "stop") {
        stopped = true;
        break;
      }
      continue;
    }
    try {
      const out = await action.execute(parsed.data, {
        workflowId,
        runId: run.id,
        input,
      });
      results.push({ step: i, kind: step.kind, ...out });
      if (!out.ok) {
        lastError = out.error;
        if ((step.branchOnError ?? "stop") === "stop") {
          stopped = true;
          break;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      results.push({ step: i, kind: step.kind, ok: false, error: lastError });
      if ((step.branchOnError ?? "stop") === "stop") {
        stopped = true;
        break;
      }
    }
  }

  await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: stopped ? "FAILED" : lastError ? "FAILED" : "SUCCEEDED",
      output: results as object,
      error: lastError,
      finishedAt: new Date(),
    },
  });
}
