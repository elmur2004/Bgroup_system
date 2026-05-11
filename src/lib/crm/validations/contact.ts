import { z } from "zod";

export const createContactSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  fullName: z.string().min(1, "Contact name is required"),
  role: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  isPrimary: z.boolean().optional(),
  linkedIn: z.string().optional(),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial().omit({
  companyId: true,
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
