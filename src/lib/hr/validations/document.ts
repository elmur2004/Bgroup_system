import { z } from 'zod'

// Employee document upload uses multipart/form-data; we only validate the string field.
export const uploadDocumentSchema = z.object({
  document_type: z.string().optional(),
})
