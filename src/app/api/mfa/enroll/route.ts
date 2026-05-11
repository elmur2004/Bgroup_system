import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startTotpEnrollment } from "@/lib/mfa/totp";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const enrol = await startTotpEnrollment(session.user.id, session.user.email!);
  // Return the secret + uri so the client can render a QR. Secret stays
  // client-only after enrolment because it's generated fresh per enrolment.
  return NextResponse.json({
    credentialId: enrol.credentialId,
    secret: enrol.secret,
    uri: enrol.uri,
  });
}
