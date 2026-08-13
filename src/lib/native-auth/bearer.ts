/**
 * Resolves an `Authorization: Bearer <token>` header into an
 * authenticated user. Deliberately takes the raw header value as a
 * parameter rather than reading `next/headers` itself — that keeps this
 * function callable (and unit-testable) outside of a Next.js request
 * context. `requireUser()` in src/lib/require-admin.ts is the only
 * caller and is responsible for supplying the header.
 */

import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "./access-token";
import type { UserRole } from "./access-token";

export interface BearerUser {
  id: string;
  role: UserRole;
}

const BEARER_PREFIX = "Bearer ";

export async function resolveBearerUser(
  authorizationHeader: string | null | undefined
): Promise<BearerUser | null> {
  if (!authorizationHeader?.startsWith(BEARER_PREFIX)) return null;

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) return null;

  const claims = verifyAccessToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, isActive: true, role: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, role: user.role };
}
