"use client";

import { useLocale } from "@/lib/i18n";
import { EntityBadge } from "@/components/crm/shared/EntityBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Rep = {
  userId: string;
  userName: string;
  entityCode: string;
  entityColor: string;
  openOpps: number;
};

export function HealthPageClient({
  hygieneScore,
  totalAlerts,
  leaderboard,
  locale,
}: {
  hygieneScore: number;
  totalAlerts: number;
  leaderboard: Rep[];
  locale: Locale;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.nav.health}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Overall Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {t.kpis.hygieneScore}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <span
                  className={`text-6xl font-bold ltr-nums ${
                    hygieneScore >= 70 ? "text-green-600" : hygieneScore >= 40 ? "text-amber-600" : "text-red-600"
                  }`}
                >
                  {hygieneScore}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
            </div>
            <Progress value={hygieneScore} className="h-3" />
          </CardContent>
        </Card>

        {/* Alerts Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t.alerts.title}
              </CardTitle>
              <Badge variant={totalAlerts > 0 ? "destructive" : "secondary"}>
                {totalAlerts}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {totalAlerts === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t.alerts.noAlerts}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {totalAlerts} {t.alerts.title}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reps with open opps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.leaderboard.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaderboard.map((rep) => (
              <div
                key={rep.userId}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{rep.userName}</span>
                  <EntityBadge code={rep.entityCode} color={rep.entityColor} />
                </div>
                <Badge variant="outline" className="ltr-nums">
                  {rep.openOpps} {t.kpis.openOpportunities}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
