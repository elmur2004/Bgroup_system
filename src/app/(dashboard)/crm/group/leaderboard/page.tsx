import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getGroupDashboardData } from "../data";
import { LeaderboardPageClient } from "@/components/crm/dashboard/LeaderboardPageClient";

export default async function LeaderboardPage() {
  const session = await getRequiredSession();
  const { locale } = await getServerT();
  const data = await getGroupDashboardData(session);

  return (
    <LeaderboardPageClient
      leaderboard={JSON.parse(JSON.stringify(data.leaderboard))}
      locale={locale}
    />
  );
}
