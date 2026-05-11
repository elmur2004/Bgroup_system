import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getCompanies } from "./actions";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const [session, { t, locale }] = await Promise.all([
    getRequiredSession(),
    getServerT(),
  ]);

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search ?? "";

  const data = await getCompanies(session, { search, page });

  return (
    <CompaniesClient
      data={data}
      initialSearch={search}
      currentPage={page}
    />
  );
}
