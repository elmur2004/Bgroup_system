import { db } from "@/lib/db";
import type { SessionUser } from "@/types";
import { scopeOpportunityByRole } from "@/lib/crm/rbac";
import { computeHygieneScore, getOverdueFollowups, getAgingProposals, getStaleLeads, getMissingNextActions } from "@/lib/crm/business/alerts";

export async function getGroupDashboardData(
  session: SessionUser,
  filters?: { entityId?: string }
) {
  const scope = scopeOpportunityByRole(session);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const entityFilter = filters?.entityId ? { entityId: filters.entityId } : {};

  // Fetch open and won opps in parallel
  const [openOpps, wonOpps] = await Promise.all([
    db.crmOpportunity.findMany({
      where: {
        ...scope,
        ...entityFilter,
        stage: { notIn: ["WON", "LOST"] },
      },
      include: {
        company: { select: { nameEn: true } },
        owner: { select: { id: true, fullName: true, fullNameAr: true, monthlyTargetEGP: true } },
        entity: { select: { code: true, nameEn: true, nameAr: true, color: true } },
      },
    }),
    db.crmOpportunity.findMany({
      where: {
        ...scope,
        ...entityFilter,
        stage: "WON",
        dateClosed: { gte: monthStart },
      },
      include: {
        owner: { select: { id: true, fullName: true, fullNameAr: true, monthlyTargetEGP: true } },
        entity: { select: { code: true, nameEn: true, nameAr: true, color: true } },
      },
    }),
  ]);

  // Aggregate KPIs
  const weightedPipeline = openOpps.reduce((sum, o) => sum + Number(o.weightedValueEGP), 0);
  const wonValueMTD = wonOpps.reduce((sum, o) => sum + Number(o.estimatedValueEGP), 0);

  // Leaderboard: group by owner
  const repMap = new Map<string, {
    userId: string;
    userName: string;
    entityCode: string;
    entityColor: string;
    openOpps: number;
    weightedPipeline: number;
    wonCount: number;
    wonValue: number;
    target: number;
  }>();

  for (const opp of openOpps) {
    const key = opp.owner.id;
    if (!repMap.has(key)) {
      repMap.set(key, {
        userId: opp.owner.id,
        userName: opp.owner.fullName,
        entityCode: opp.entity.code,
        entityColor: opp.entity.color,
        openOpps: 0,
        weightedPipeline: 0,
        wonCount: 0,
        wonValue: 0,
        target: Number(opp.owner.monthlyTargetEGP || 50000),
      });
    }
    const rep = repMap.get(key)!;
    rep.openOpps++;
    rep.weightedPipeline += Number(opp.weightedValueEGP);
  }

  for (const opp of wonOpps) {
    const key = opp.owner.id;
    if (!repMap.has(key)) {
      repMap.set(key, {
        userId: opp.owner.id,
        userName: opp.owner.fullName,
        entityCode: opp.entity.code,
        entityColor: opp.entity.color,
        openOpps: 0,
        weightedPipeline: 0,
        wonCount: 0,
        wonValue: 0,
        target: Number(opp.owner.monthlyTargetEGP || 50000),
      });
    }
    const rep = repMap.get(key)!;
    rep.wonCount++;
    rep.wonValue += Number(opp.estimatedValueEGP);
  }

  const leaderboard = Array.from(repMap.values())
    .map((rep) => ({
      ...rep,
      attainment: rep.target > 0 ? Math.round((rep.wonValue / rep.target) * 100) : 0,
      weightedPipeline: Math.round(rep.weightedPipeline),
      wonValue: Math.round(rep.wonValue),
    }))
    .sort((a, b) => b.wonValue - a.wonValue);

  // Top 10 hot
  const topHot = openOpps
    .filter((o) => o.priority === "HOT" || o.stage === "NEGOTIATION" || o.stage === "VERBAL_YES")
    .sort((a, b) => Number(b.weightedValueEGP) - Number(a.weightedValueEGP))
    .slice(0, 10)
    .map((o) => ({
      id: o.id,
      code: o.code,
      company: o.company.nameEn,
      owner: o.owner.fullName,
      entity: o.entity,
      stage: o.stage,
      priority: o.priority,
      weightedValueEGP: Number(o.weightedValueEGP),
    }));

  // Pipeline by entity
  const entityGroups: Record<string, { code: string; name: string; nameAr: string; color: string; count: number; totalValue: number; weightedValue: number }> = {};
  for (const opp of openOpps) {
    const key = opp.entity.code;
    if (!entityGroups[key]) {
      entityGroups[key] = { code: opp.entity.code, name: opp.entity.nameEn, nameAr: opp.entity.nameAr, color: opp.entity.color, count: 0, totalValue: 0, weightedValue: 0 };
    }
    entityGroups[key].count++;
    entityGroups[key].totalValue += Number(opp.estimatedValueEGP);
    entityGroups[key].weightedValue += Number(opp.weightedValueEGP);
  }

  // Alerts
  const alertableOpps = openOpps.map((o) => ({
    id: o.id,
    code: o.code,
    stage: o.stage,
    nextAction: o.nextAction,
    nextActionDate: o.nextActionDate,
    dateProposalSent: o.dateProposalSent,
    createdAt: o.createdAt,
    company: { nameEn: o.company.nameEn },
  }));

  const totalAlerts =
    getOverdueFollowups(alertableOpps).length +
    getAgingProposals(alertableOpps).length +
    getStaleLeads(alertableOpps).length +
    getMissingNextActions(alertableOpps).length;

  return {
    kpis: {
      openOpps: openOpps.length,
      weightedPipeline: Math.round(weightedPipeline),
      wonCountMTD: wonOpps.length,
      wonValueMTD: Math.round(wonValueMTD),
    },
    leaderboard,
    topHotOpportunities: topHot,
    pipelineByEntity: Object.values(entityGroups),
    totalAlerts,
    hygieneScore: computeHygieneScore(alertableOpps),
  };
}
