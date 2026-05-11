import { getRequiredSession } from "@/lib/crm/session";
import { getContact } from "../actions";
import { notFound } from "next/navigation";
import { ContactDetailClient } from "./contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([
    getRequiredSession(),
    params,
  ]);

  const contact = await getContact(session, id);
  if (!contact) notFound();

  return <ContactDetailClient contact={contact} />;
}
