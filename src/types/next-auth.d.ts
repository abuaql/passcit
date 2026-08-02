import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "ADMIN";
  }
}

/**
 * The JWT interface is *declared* in `@auth/core/jwt`. `next-auth/jwt`
 * only re-exports it, and TypeScript declaration merging applies to the
 * module where an interface is declared — augmenting a re-export path
 * silently creates a separate, unused interface rather than extending
 * the real one.
 *
 * That distinction is the whole bug: `NextAuthConfig`'s callback
 * signatures read `JWT` from `@auth/core/jwt`, so only an augmentation
 * targeting that module reaches the `token` parameter. Without it,
 * `token.id` falls back to the base interface's `Record<string, unknown>`
 * index signature and resolves to `unknown` — hence
 * "Type 'unknown' is not assignable to type 'string'".
 *
 * Both paths are augmented: `@auth/core/jwt` is the one doing the actual
 * work, and `next-auth/jwt` is kept so the type stays correct for any
 * code that imports `JWT` from the public path instead.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
  }
}
