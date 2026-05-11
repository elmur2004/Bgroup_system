import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getGroupDashboardData } from "../data";
import { HealthPageClient } from "@/components/crm/dashboard/HealthPageClient";

export default async function HealthPage() {
  const session = await getRequiredSession();
  const { locale } = await getServerT();
  const data = await getGroupDashboardData(session);

  return (
    <HealthPageClient
      hygieneScore={data.hygieneScore}
      totalAlerts={data.totalAlerts}
      leaderboard={JSON.parse(JSON.stringify(data.leaderboard))}
      locale={locale}
    />
  );
}
