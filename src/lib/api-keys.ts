import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** Generate a fresh API key. Returns the plaintext value (show ONCE) and stored hash. */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const body = randomBytes(24).toString("base64url");
  const plaintext = `sk_live_${body}`;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash, prefix: plaintext.slice(0, 16) + "…" };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Resolve and validate an API key from the Authorization header. */
export async function authenticateApiKey(req: Request): Promise<
  | { ok: true; ownerId: string; scopes: string[]; keyId: string }
  | { ok: false; status: number; error: string }
> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) return { ok: false, status: 401, error: "Missing API key" };
  const plaintext = m[1].trim();
  const hash = hashApiKey(plaintext);
  const key = await db.apiKey.findUnique({ where: { hash } });
  if (!key || !key.isActive) return { ok: false, status: 401, error: "Invalid API key" };
  // Update lastUsedAt asynchronously; don't block the request.
  void db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { ok: true, ownerId: key.ownerId, scopes: key.scopes, keyId: key.id };
}

export function requireScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes("*");
}
