"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Flame, Calendar, Users } from "lucide-react";
import { STAGE_LABEL_EN, STAGE_LABEL_AR, SPEC_STAGES } from "@/lib/crm/stage-labels";

type Board = {
  scope: "team" | "mine";
  kpi: {
    total: number;
    stageCounts: Record<string, number>;
    conversionRate: number;
    active: number;
    newOppsThisMonth: number;
    highPriority: number;
  };
  repTable: Array<{
    repId: string;
    name: string;
    total: number;
    perStage: Record<string, number>;
    active: number;
    conversion: number;
  }>;
  serviceDistribution: Array<{ name: string; code: string; count: number; pct: number }>;
  meetings: {
    total: number;
    today: number;
    thisWeek: number;
    confirmed: number;
    done: number;
    cancelled: number;
  };
  stages: string[];
};

const SERVICE_BARS = [
  "bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500",
];

export function SalesBoardClient() {
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/crm/sales-board")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-4 w-4 me-2 animate-spin" />
        Loading sales board...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI tiles per stage */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {SPEC_STAGES.map((s) => (
          <StageTile
            key={s}
            stage={s}
            labelEn={STAGE_LABEL_EN[s]}
            labelAr={STAGE_LABEL_AR[s]}
            value={data.kpi.stageCounts[s] ?? 0}
          />
        ))}
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total opportunities" value={data.kpi.total} icon={Users} tone="indigo" />
        <Kpi
          label="Conversion rate"
          value={`${data.kpi.conversionRate}%`}
          icon={TrendingUp}
          tone="emerald"
        />
        <Kpi label="Active deals" value={data.kpi.active} icon={Flame} tone="amber" />
        <Kpi label="High priority" value={data.kpi.highPriority} icon={Flame} tone="rose" />
      </div>

      {/* Per-rep performance + service distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales team performance ({data.scope === "team" ? "all reps" : "you"})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.repTable.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No reps to display.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-2 py-2 text-start font-medium">Rep</th>
                      <th className="px-2 py-2 text-end font-medium">Total</th>
                      {SPEC_STAGES.filter((s) => s !== "NEW").map((s) => (
                        <th
                          key={s}
                          className="px-1.5 py-2 text-end font-medium whitespace-nowrap"
                          title={STAGE_LABEL_EN[s]}
                        >
                          {STAGE_LABEL_EN[s].split(" ").slice(-2).join(" ")}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-end font-medium">Active</th>
                      <th className="px-2 py-2 text-end font-medium">Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repTable.map((r) => (
                      <tr key={r.repId} className="border-b">
                        <td className="px-2 py-2 truncate max-w-[10rem]">{r.name}</td>
                        <td className="px-2 py-2 text-end font-semibold">{r.total}</td>
                        {SPEC_STAGES.filter((s) => s !== "NEW").map((s) => (
                          <td key={s} className="px-1.5 py-2 text-end ltr-nums">
                            {r.perStage[s] || ""}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-end font-semibold text-primary">{r.active}</td>
                        <td className="px-2 py-2 text-end font-medium">{r.conversion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service mix</CardTitle>
          </CardHeader>
          <CardContent>
            {data.serviceDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No products on opportunities yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.serviceDistribution.map((s, i) => (
                  <li key={s.code} className="text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="truncate">{s.name}</span>
                      <span className="text-muted-foreground ms-2 shrink-0">
                        {s.count} · {s.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${SERVICE_BARS[i % SERVICE_BARS.length]}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meetings panel */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Technical meetings
          </CardTitle>
          <span className="text-xs text-muted-foreground">{data.scope === "team" ? "team-wide" : "yours only"}</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <MiniStat label="Total" value={data.meetings.total} />
            <MiniStat label="Today" value={data.meetings.today} />
            <MiniStat label="This week" value={data.meetings.thisWeek} />
            <MiniStat label="Confirmed" value={data.meetings.confirmed} />
            <MiniStat label="Done" value={data.meetings.done} />
            <MiniStat label="Cancelled" value={data.meetings.cancelled} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageTile({
  labelEn,
  labelAr,
  value,
}: {
  stage: string;
  labelEn: string;
  labelAr: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{labelEn}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{labelAr}</p>
        <p className="text-2xl font-bold text-foreground mt-1.5 ltr-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof TrendingUp;
  tone: "indigo" | "emerald" | "amber" | "rose";
}) {
  const tile = {
    indigo: "tile-indigo",
    emerald: "tile-emerald",
    amber: "tile-amber",
    rose: "tile-rose",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 ltr-nums">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1 ltr-nums">{value}</p>
    </div>
  );
}
