/**
 * Email/password verification for the native login and register
 * endpoints. Deliberately mirrors the rules in the Credentials
 * provider's authorize() in src/auth.ts exactly (lookup, isActive,
 * bcrypt.compare) so native and web sign-in behave identically — but
 * lives here rather than being imported from auth.ts, since auth.ts is
 * the full Auth.js config for the web app and must stay untouched by
 * this native-auth layer.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "./access-token";

export interface VerifiedCredentialsUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
}

/**
 * Returns the user on success, or null for every failure mode — no such
 * email, no password set (OAuth-only account), disabled account, or
 * wrong password. Callers must turn a null into one generic error
 * message; never report which specific reason caused it.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<VerifiedCredentialsUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;
  if (!user.isActive) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}
