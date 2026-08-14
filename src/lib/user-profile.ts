/**
 * The one place GET /api/user/me's query lives, so it's directly
 * testable without needing requireUser()'s request-context-bound auth to
 * run first (see the Phase 7 report's testing-boundary note).
 */

import { prisma } from "@/lib/prisma";
import type { VerifiedCredentialsUser } from "@/lib/native-auth/credentials";
import type { StudyLanguage } from "@/generated/prisma/client";

// Extends (rather than modifies) VerifiedCredentialsUser deliberately —
// that type is shared with native login/register/OAuth, which don't need
// studyLanguage in their response. Only GET /api/user/me does, since
// that's what the iOS Study Panel's language picker initializes from.
export interface PublicUser extends VerifiedCredentialsUser {
  studyLanguage: StudyLanguage;
}

/** Explicit `select` — never `include` — so this can never accidentally start returning passwordHash or any other field added to User later. */
export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true, studyLanguage: true },
  });
}
