import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** TOTP code window: ±1 step (~30s slack each direction) — generous on mobile clocks. */
authenticator.options = { window: 1, step: 30 };

const ISSUER = "BGroup Super App";

export type EnrollmentChallenge = {
  credentialId: string;
  secret: string;
  /** otpauth:// URL — render to QR. */
  uri: string;
};

/** Start enrolment: create an unverified TOTP credential and return the QR URI. */
export async function startTotpEnrollment(userId: string, email: string): Promise<EnrollmentChallenge> {
  const secret = authenticator.generateSecret();
  const cred = await db.userMfaCredential.create({
    data: {
      userId,
      kind: "TOTP",
      secret,
      label: "Authenticator app",
      verified: false,
    },
  });
  const uri = authenticator.keyuri(email, ISSUER, secret);
  return { credentialId: cred.id, secret, uri };
}

/** Finish enrolment: verify the user-typed code. On success, mark the credential verified
 *  and flip the User-level mfaEnabled flag. Returns recovery codes (plaintext) — show ONCE. */
export async function verifyTotpEnrollment(
  userId: string,
  credentialId: string,
  code: string
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; reason: string }> {
  const cred = await db.userMfaCredential.findUnique({ where: { id: credentialId } });
  if (!cred || cred.userId !== userId) return { ok: false, reason: "Invalid credential" };
  if (cred.verified) return { ok: false, reason: "Already verified" };
  if (!authenticator.check(code, cred.secret)) return { ok: false, reason: "Invalid code" };

  const recovery = generateRecoveryCodes(10);
  const hashes = await Promise.all(recovery.map((c) => bcrypt.hash(c, 10)));

  await db.$transaction([
    db.userMfaCredential.update({
      where: { id: credentialId },
      data: { verified: true, lastUsedAt: new Date() },
    }),
    db.userRecoveryCode.deleteMany({ where: { userId } }),
    db.userRecoveryCode.createMany({
      data: hashes.map((h) => ({ userId, codeHash: h })),
    }),
    db.user.update({ where: { id: userId }, data: { mfaEnabled: true } }),
  ]);

  return { ok: true, recoveryCodes: recovery };
}

/** Verify a TOTP code at sign-in. */
export async function verifyTotpAtSignIn(userId: string, code: string): Promise<boolean> {
  const creds = await db.userMfaCredential.findMany({
    where: { userId, kind: "TOTP", verified: true },
  });
  for (const c of creds) {
    if (authenticator.check(code, c.secret)) {
      await db.userMfaCredential.update({
        where: { id: c.id },
        data: { lastUsedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

/** Burn a one-time recovery code at sign-in. */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const codes = await db.userRecoveryCode.findMany({
    where: { userId, used: false },
  });
  for (const c of codes) {
    if (await bcrypt.compare(code, c.codeHash)) {
      await db.userRecoveryCode.update({
        where: { id: c.id },
        data: { used: true, usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

/** Disable MFA: delete all credentials + recovery codes, clear the flag. */
export async function disableMfa(userId: string): Promise<void> {
  await db.$transaction([
    db.userMfaCredential.deleteMany({ where: { userId } }),
    db.userRecoveryCode.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { mfaEnabled: false } }),
  ]);
}

function generateRecoveryCodes(n: number): string[] {
  return Array.from({ length: n }, () => {
    // 10-char base32-ish (no I/O/0/1 to avoid confusion).
    const buf = randomBytes(8);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += alphabet[buf[i % buf.length] % alphabet.length];
    return out.match(/.{1,5}/g)!.join("-");
  });
}
