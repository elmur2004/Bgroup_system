"use client";

import { useSession, signOut } from "next-auth/react";
import type { PartnerUser, PartnerRole } from "./types";

/**
 * Compatibility layer: maps NextAuth useSession to the Partners Portal's useAuth interface.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  let user: PartnerUser | null = null;
  if (session?.user) {
    const isAdmin = !session.user.partnerId;
    user = {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name!,
      role: (isAdmin ? "ADMIN" : "PARTNER") as PartnerRole,
      partnerId: session.user.partnerId,
    };
  }

  const logout = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return { user, loading, logout };
}
