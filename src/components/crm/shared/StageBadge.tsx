"use client";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CrmOpportunityStage } from "@/types";

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-sky-100 text-sky-800",
  DISCOVERY: "bg-cyan-100 text-cyan-800",
  QUALIFIED: "bg-teal-100 text-teal-800",
  TECH_MEETING: "bg-emerald-100 text-emerald-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  VERBAL_YES: "bg-lime-100 text-lime-800",
  POSTPONED: "bg-gray-100 text-gray-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
};

export function StageBadge({
  stage,
  probabilityPct,
  showProbability = false,
}: {
  stage: CrmOpportunityStage;
  probabilityPct?: number;
  showProbability?: boolean;
}) {
  const { t } = useLocale();
  const label = t.stages[stage] || stage;

  return (
    <Badge
      variant="secondary"
      className={cn("font-medium", STAGE_COLORS[stage])}
    >
      {label}
      {showProbability && probabilityPct !== undefined && (
        <span className="ms-1 opacity-70 ltr-nums">{probabilityPct}%</span>
      )}
    </Badge>
  );
}
