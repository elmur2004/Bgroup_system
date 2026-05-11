/**
 * Returns a 409-friendly message for Prisma's `P2002` unique-constraint error
 * if `e` is one. Returns null otherwise — caller should rethrow / fall through.
 *
 * Duck-typed on `code === "P2002"` so it survives class-identity mismatches
 * across Turbopack / Next.js boundaries (importing the same `Prisma` namespace
 * from generated client doesn't always satisfy `instanceof`).
 *
 * Usage:
 *   } catch (e) {
 *     const dup = uniqueViolationMessage(e, "name");
 *     if (dup) return NextResponse.json({ error: dup }, { status: 409 });
 *     throw e;
 *   }
 */
export function uniqueViolationMessage(e: unknown, fallbackField = "value"): string | null {
  if (!e || typeof e !== "object") return null;
  const err = e as { code?: unknown; meta?: { target?: unknown } };
  if (err.code !== "P2002") return null;
  const target = err.meta?.target as string | string[] | undefined;
  const fields = Array.isArray(target) ? target.join(", ") : target ?? fallbackField;
  return `A record with this ${fields} already exists`;
}
