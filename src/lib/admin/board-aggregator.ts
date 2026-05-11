import { db } from "@/lib/db";

/**
 * Cross-module aggregator for the admin board (daily / weekly / monthly).
 *
 * Each section returns a structured object so the page can render KPI cards
 * + ranked lists without further client-side aggregation. Only platform
 * admins should hit these — the route handler enforces that.
 *
 * The set of metrics surfaced here is derived from what a typical group
 * board needs to monitor weekly/monthly across:
 *   - Sales pipeline (CRM)
 *   - People operations (HR)
 *   - Partner revenue (Partners)
 *   - Operational execution (Tasks + workflow SLAs)
 */

export type Period = "daily" | "weekly" | "monthly";

function windowFor(period: Period): { start: Date; previousStart: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") start.setDate(start.getDate() - 7);
  else if (period === "monthly") start.setDate(start.getDate() - 30);
  const previousStart = new Date(start);
  if (period === "daily") previousStart.setDate(previousStart.getDate() - 1);
  else if (period === "weekly") previousStart.setDate(previousStart.getDate() - 7);
  else previousStart.setDate(previousStart.getDate() - 30);
  return { start, previousStart };
}

export type BoardData = {
  period: Period;
  generatedAt: string;
  pipeline: {
    openOpportunityCount: number;
    weightedPipelineValueEGP: number;
    newOpportunitiesInPeriod: number;
    newOpportunitiesValueEGP: number;
    callsInPeriod: number;
    wonInPeriod: number;
    wonValueEGP: number;
  };
  people: {
    activeEmployees: number;
    newHiresInPeriod: number;
    pendingOvertime: number;
    pendingLeave: number;
    incidentsInPeriod: number;
    bonusesInPeriod: number;
    attendanceRateOnTime: number | null;
  };
  partners: {
    activePartners: number;
    leadsInPeriod: number;
    dealsWonInPeriod: number;
    dealsWonValueUSD: number;
    pendingContracts: number;
    pendingInvoices: number;
  };
  execution: {
    tasksOpen: number;
    tasksOverdue: number;
    tasksCompletedInPeriod: number;
    workflowRunsCompleted: number;
    workflowRunsRunning: number;
    slaLateCount: number;
    slaEarlyCount: number;
  };
  leaders: {
    topCrmReps: Array<{ name: string; wonValueEGP: number }>;
    topPartners: Array<{ name: string; wonValueUSD: number }>;
  };
};

export async function getBoardData(period: Period): Promise<BoardData> {
  const { start } = windowFor(period);

  const [
    openOpps,
    newOpps,
    wonOppsAgg,
    callsCount,
    activeEmployees,
    newHires,
    pendingOvertime,
    pendingLeave,
    incidentsCount,
    bonusesCount,
    attendanceRows,
    activePartners,
    leadsCount,
    dealsWonAgg,
    pendingContracts,
    pendingInvoices,
    tasksOpen,
    tasksOverdue,
    tasksCompleted,
    runsCompleted,
    runsRunning,
    slaLate,
    slaEarly,
    repsRaw,
    partnersRaw,
  ] = await Promise.all([
    db.crmOpportunity.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      select: { weightedValueEGP: true },
    }),
    db.crmOpportunity.findMany({
      where: { createdAt: { gte: start } },
      select: { estimatedValueEGP: true },
    }),
    db.crmOpportunity.findMany({
      where: { stage: "WON", dateClosed: { gte: start } },
      select: { estimatedValueEGP: true },
    }),
    db.crmCall.count({ where: { callAt: { gte: start } } }),
    db.hrEmployee.count({ where: { status: { in: ["active", "probation"] } } }),
    db.hrEmployee.count({ where: { contractStart: { gte: start } } }),
    db.hrOvertimeRequest.count({ where: { status: "pending" } }),
    db.hrLeaveRequest.count({ where: { status: "pending" } }),
    db.hrIncident.count({ where: { incidentDate: { gte: start } } }),
    db.hrBonus.count({ where: { bonusDate: { gte: start } } }),
    db.hrAttendanceLog.findMany({
      where: { date: { gte: start } },
      select: { status: true },
    }),
    db.partnerProfile.count({ where: { isActive: true } }),
    db.partnerLead.count({ where: { createdAt: { gte: start } } }),
    db.partnerDeal.findMany({
      where: { status: "WON", wonAt: { gte: start } },
      select: { value: true },
    }),
    db.partnerContract.count({ where: { status: "REQUESTED" } }),
    db.partnerInvoice.count({ where: { status: "REQUESTED" } }),
    db.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
    db.task.count({
      where: { status: { in: ["TODO", "IN_PROGRESS"] }, dueAt: { lt: new Date() } },
    }),
    db.task.count({
      where: { status: "DONE", completedAt: { gte: start } },
    }),
    db.sequentialWorkflowRun.count({
      where: { status: "COMPLETED", completedAt: { gte: start } },
    }),
    db.sequentialWorkflowRun.count({ where: { status: "RUNNING" } }),
    db.sequentialWorkflowRunStep.count({
      where: { slaResult: "LATE", completedAt: { gte: start } },
    }),
    db.sequentialWorkflowRunStep.count({
      where: { slaResult: "EARLY_BONUS", completedAt: { gte: start } },
    }),
    db.crmOpportunity.groupBy({
      by: ["ownerId"],
      where: { stage: "WON", dateClosed: { gte: start } },
      _sum: { estimatedValueEGP: true },
      orderBy: { _sum: { estimatedValueEGP: "desc" } },
      take: 5,
    }),
    db.partnerDeal.groupBy({
      by: ["partnerId"],
      where: { status: "WON", wonAt: { gte: start } },
      _sum: { value: true },
      orderBy: { _sum: { value: "desc" } },
      take: 5,
    }),
  ]);

  const weightedPipeline = openOpps.reduce((acc, o) => acc + Number(o.weightedValueEGP), 0);
  const newOppsValue = newOpps.reduce((acc, o) => acc + Number(o.estimatedValueEGP), 0);
  const wonValue = wonOppsAgg.reduce((acc, o) => acc + Number(o.estimatedValueEGP), 0);
  const dealsWonValue = dealsWonAgg.reduce((acc, d) => acc + Number(d.value), 0);

  const attendanceRate =
    attendanceRows.length === 0
      ? null
      : attendanceRows.filter((r) => r.status === "on_time").length / attendanceRows.length;

  // Hydrate top-rep names.
  const repIds = repsRaw.map((r) => r.ownerId);
  const reps =
    repIds.length === 0
      ? []
      : await db.crmUserProfile.findMany({
          where: { id: { in: repIds } },
          select: { id: true, fullName: true },
        });
  const topCrmReps = repsRaw.map((r) => ({
    name: reps.find((u) => u.id === r.ownerId)?.fullName ?? "(unknown)",
    wonValueEGP: Number(r._sum.estimatedValueEGP ?? 0),
  }));

  const partnerIds = partnersRaw.map((p) => p.partnerId);
  const partners =
    partnerIds.length === 0
      ? []
      : await db.partnerProfile.findMany({
          where: { id: { in: partnerIds } },
          select: { id: true, companyName: true },
        });
  const topPartners = partnersRaw.map((p) => ({
    name: partners.find((u) => u.id === p.partnerId)?.companyName ?? "(unknown)",
    wonValueUSD: Number(p._sum.value ?? 0),
  }));

  return {
    period,
    generatedAt: new Date().toISOString(),
    pipeline: {
      openOpportunityCount: openOpps.length,
      weightedPipelineValueEGP: weightedPipeline,
      newOpportunitiesInPeriod: newOpps.length,
      newOpportunitiesValueEGP: newOppsValue,
      callsInPeriod: callsCount,
      wonInPeriod: wonOppsAgg.length,
      wonValueEGP: wonValue,
    },
    people: {
      activeEmployees,
      newHiresInPeriod: newHires,
      pendingOvertime,
      pendingLeave,
      incidentsInPeriod: incidentsCount,
      bonusesInPeriod: bonusesCount,
      attendanceRateOnTime: attendanceRate,
    },
    partners: {
      activePartners,
      leadsInPeriod: leadsCount,
      dealsWonInPeriod: dealsWonAgg.length,
      dealsWonValueUSD: dealsWonValue,
      pendingContracts,
      pendingInvoices,
    },
    execution: {
      tasksOpen,
      tasksOverdue,
      tasksCompletedInPeriod: tasksCompleted,
      workflowRunsCompleted: runsCompleted,
      workflowRunsRunning: runsRunning,
      slaLateCount: slaLate,
      slaEarlyCount: slaEarly,
    },
    leaders: { topCrmReps, topPartners },
  };
}
