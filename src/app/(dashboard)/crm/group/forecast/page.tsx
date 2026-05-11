import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getGroupDashboardData } from "../data";
import { ForecastPageClient } from "@/components/crm/dashboard/ForecastPageClient";

export default async function ForecastPage() {
  const session = await getRequiredSession();
  const { locale } = await getServerT();
  const data = await getGroupDashboardData(session);

  return (
    <ForecastPageClient
      data={JSON.parse(JSON.stringify(data))}
      locale={locale}
    />
  );
}
