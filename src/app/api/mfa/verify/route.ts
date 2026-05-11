import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyTotpEnrollment } from "@/lib/mfa/totp";
import { z } from "zod";

const bodySchema = z.object({
  credentialId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const result = await verifyTotpEnrollment(
    session.user.id,
    parsed.data.credentialId,
    parsed.data.code
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes });
}
