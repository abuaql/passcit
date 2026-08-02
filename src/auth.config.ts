import type { NextAuthConfig } from "next-auth";

// This file stays Edge-Runtime-safe (no Prisma, no adapter, no provider
// whose `authorize()` touches a database or any other Node-only API —
// raw sockets, `fs`, native bindings, etc) even though the file that
// imports it, proxy.ts, now runs Node.js-only as of Next.js 16 (Edge is
// no longer supported there). Keeping this edge-safe anyway is
// deliberate: it's still entirely correct under Node.js too, and this
// exact feature's runtime model has had real documented inconsistency
// from the Next.js team in just the last several months — an
// implementation that's correct either way is a cheap hedge against that.
//
// The jwt/session callbacks below only reshape plain token/session
// objects — no I/O — so they're safe to share between this config and
// the full server config in auth.ts. proxy.ts needs them too: without
// them, a decoded token wouldn't carry `role`, and the admin-route check
// in proxy.ts would silently break.
//
// `providers` is intentionally empty here. The real providers (including
// the database-backed Credentials provider) are only ever declared in
// auth.ts, which proxy.ts never imports.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as "USER" | "ADMIN") ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
