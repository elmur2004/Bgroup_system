import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/**
 * Run NextAuth's `auth()` and swallow JWT decryption errors.
 *
 * Why: when NEXTAUTH_SECRET changes (or a user has a cookie from a previous
 * deploy), `auth()` throws JWTSessionError("no matching decryption secret").
 * That error in the root layout takes down the whole tree and lands users on
 * a server-error page they can't escape from.
 *
 * Treating an undecryptable token as "no session" is the same outcome the
 * user would get by clicking "log out" — they'll be redirected to /login on
 * the next protected page, set a fresh cookie, and continue normally.
 */
export async function safeAuth(): Promise<Session | null> {
  try {
    return (await auth()) as Session | null;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[safeAuth] auth() threw — treating as unauthenticated.",
        e instanceof Error ? e.message : e
      );
    }
    return null;
  }
}
