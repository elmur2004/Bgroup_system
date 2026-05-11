"use server";

import { getRequiredSession } from "@/lib/crm/session";
import { createContact, updateContact } from "./actions";
import type { CreateContactInput, UpdateContactInput } from "@/lib/crm/validations/contact";

export async function createContactAction(data: CreateContactInput) {
  const session = await getRequiredSession();
  const contact = await createContact(session, data);
  return contact;
}

export async function updateContactAction(id: string, data: UpdateContactInput) {
  const session = await getRequiredSession();
  const contact = await updateContact(session, id, data);
  return contact;
}
