/**
 * Shared account-resolution policy for both native OAuth providers
 * (Apple, Google) — the exact order required by the approved blueprint:
 *
 *   A. Find Account by (provider, providerAccountId).
 *      Found -> resolve its User, require isActive, done.
 *   B. Not found, but the credential carries a *verified* email:
 *      find an existing User by that email. Found -> link a new Account
 *      row to that User (never reassign an existing Account), done.
 *   C. No Account, no matching verified-email User -> create a new User
 *      + Account.
 *
 * A missing or unverified email never links and never creates an
 * account — there is nothing safe to match or create against.
 *
 * This is intentionally the ONLY place this policy is implemented; the
 * Apple and Google routes both call this one function so the linking
 * rules can't drift between providers.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { VerifiedCredentialsUser } from "./credentials";

export type OAuthProvider = "apple" | "google";

export interface ResolveOAuthAccountParams {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  /** Only ever supplied by the client on a provider's first authorization (Apple); used solely when creating a brand-new User. */
  name?: string | null;
}

export type OAuthResolutionResult =
  | { status: "ok"; user: VerifiedCredentialsUser; isNewUser: boolean }
  | { status: "error" };

const ERROR: OAuthResolutionResult = { status: "error" };

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
} as const;

function toPublicUser(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: VerifiedCredentialsUser["role"];
}): VerifiedCredentialsUser {
  // Deliberately whitelist fields — never forwards providerAccountId,
  // internal Account ids, or anything beyond what login/register already
  // return, so a caller can't accidentally leak them through this path.
  return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role };
}

export async function resolveOAuthAccount(
  params: ResolveOAuthAccountParams
): Promise<OAuthResolutionResult> {
  const { provider, providerAccountId, email, emailVerified, name } = params;

  // Step A — an Account for this exact provider identity already exists.
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { user: { select: USER_SELECT } },
  });

  if (existingAccount) {
    if (!existingAccount.user.isActive) return ERROR;
    return { status: "ok", user: toPublicUser(existingAccount.user), isNewUser: false };
  }

  // No existing Account for this identity. Linking or creating an
  // account both require a verified email — never link or create on the
  // strength of an unverified or absent one.
  if (!email || !emailVerified) return ERROR;

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Step B — an existing User owns this (verified) email; link to it.
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: USER_SELECT,
    });

    if (existingUser) {
      if (!existingUser.isActive) return ERROR;
      await prisma.account.create({
        data: { userId: existingUser.id, type: "oauth", provider, providerAccountId },
      });
      return { status: "ok", user: toPublicUser(existingUser), isNewUser: false };
    }

    // Step C — no match anywhere; create a new User + Account together.
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ?? null,
        emailVerified: new Date(),
        accounts: { create: { type: "oauth", provider, providerAccountId } },
      },
      select: USER_SELECT,
    });

    return { status: "ok", user: toPublicUser(created), isNewUser: true };
  } catch (error) {
    // A concurrent request can race between the Step A check above and
    // the create() calls here — e.g. two simultaneous sign-ins for a
    // brand-new Apple identity both pass Step A, then both try to create
    // the same (provider, providerAccountId) Account, or the same new
    // User email. The loser hits a unique-constraint violation; that's
    // "this identity/email is already claimed," reported the same
    // generic way as every other rejection — never a distinct error that
    // would hint at why.
    if (isUniqueConstraintViolation(error)) return ERROR;
    throw error;
  }
}
