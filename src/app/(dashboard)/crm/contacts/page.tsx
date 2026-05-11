import { getRequiredSession } from "@/lib/crm/session";
import { getContacts } from "./actions";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; companyId?: string }>;
}) {
  const session = await getRequiredSession();
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search ?? "";

  const data = await getContacts(session, {
    search,
    page,
    companyId: params.companyId,
  });

  return (
    <ContactsClient
      data={data}
      initialSearch={search}
      currentPage={page}
    />
  );
}
