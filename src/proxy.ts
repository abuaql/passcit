import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed this file-convention from middleware.ts to proxy.ts —
// this is a functional change, not cosmetic. As of Next.js 16.2.x,
// middleware.ts is no longer read at all: no error, no warning, the file
// (and every check inside it) is silently skipped. This file is the fix
// for that — a straight rename, same logic, same matcher config (which
// Next.js explicitly kept unchanged across the rename).
//
// Two officially-documented sources (Next.js's own v16 upgrade guide and
// Vercel's own docs, both May 2026) confirm proxy.ts runs Node.js-only —
// the Edge Runtime is no longer supported here and can't be configured.
// That actually means the elaborate edge-safe split below (importing
// authConfig instead of the full @/auth, which pulls in Prisma + a real
// MySQL driver) is no longer *strictly* required for this specific file.
// It's kept anyway: it's still correct under Node.js (Node is a superset
// of what Edge could do, so nothing here breaks), and this exact feature
// has had real documented inconsistency from the Next.js team itself in
// just the last several months — keeping an implementation that's
// correct under either runtime model is a deliberate hedge against that,
// not an oversight.
const { auth } = NextAuth(authConfig);

// Runs as the first line of defense. Every protected page ALSO re-checks
// the session server-side in its layout (see src/app/(app)/layout.tsx and
// src/app/admin/layout.tsx) — defense in depth, since proxy/middleware-only
// protection has known bypass classes in Next.js.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/questions") ||
    pathname.startsWith("/flashcards") ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/eligibility") ||
    isAdminRoute;

  if (isAdminRoute && !isAdmin) {
    const url = isLoggedIn ? "/403" : "/login";
    return NextResponse.redirect(new URL(url, req.url));
  }

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/questions/:path*",
    "/flashcards/:path*",
    "/practice/:path*",
    "/interview/:path*",
    "/eligibility/:path*",
  ],
};
