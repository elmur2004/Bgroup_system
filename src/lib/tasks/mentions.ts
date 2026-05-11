import { db } from "@/lib/db";

/**
 * Parse @mentions from a comment body and resolve them to user ids.
 * Mention syntax:
 *   @[email protected]            (exact email)
 *   @username                     (matches "name" startsWith, case-insensitive)
 *
 * Returns the deduped list of user ids that should be added as watchers.
 */
export async function resolveMentions(body: string, excludeUserId?: string): Promise<string[]> {
  if (!body) return [];

  // Tokens: anything after `@` up to whitespace or punctuation we don't want.
  // Allow letters, digits, dot, underscore, hyphen, plus, at-sign for emails.
  const tokens = Array.from(body.matchAll(/@([\w.+\-]+(?:@[\w.\-]+)?)/g)).map((m) => m[1]);
  if (tokens.length === 0) return [];

  const unique = Array.from(new Set(tokens));

  // Split into emails (contain "@") and name-tokens.
  const emails = unique.filter((t) => t.includes("@"));
  const names = unique.filter((t) => !t.includes("@"));

  const where: { OR: Array<Record<string, unknown>> } = { OR: [] };
  if (emails.length > 0) {
    where.OR.push({ email: { in: emails, mode: "insensitive" } });
  }
  for (const n of names) {
    // First-token match: any name starting with the token.
    where.OR.push({ name: { startsWith: n, mode: "insensitive" } });
  }
  if (where.OR.length === 0) return [];

  const users = await db.user.findMany({
    where,
    select: { id: true },
    take: 50,
  });
  const ids = users.map((u) => u.id).filter((id) => id !== excludeUserId);
  return Array.from(new Set(ids));
}
