"use client";

import { useCurrentUser } from "@/lib/queries/useAuth";

/**
 * Invisible component that hydrates the auth state on mount.
 * If a token exists in localStorage, fetches /auth/me to restore the user.
 * If the token is invalid, clears it.
 */
export function AuthHydrator() {
  useCurrentUser();
  return null;
}
