import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/auth.config";

// This is the FULL Auth.js config — the Prisma adapter and the
// database-backed Credentials provider both live here, and ONLY here.
// It's safe to import from Route Handlers, Server Actions, API routes,
// and Server Components (all Node.js runtime), but it must never be
// imported from proxy.ts — that's what auth.config.ts is for.
//
// Google sign-in only activates if credentials are provided — the app
// works fine with email/password alone otherwise.
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    // Covers Google sign-in specifically — the Credentials provider's own
    // authorize() above already checks isActive for password login, but
    // that check doesn't run for OAuth. Re-checked here so a disabled
    // account can't bypass the restriction by using Google instead.
    async signIn({ user }) {
      if (!user.id) return true; // let Auth.js's own validation handle this case
      const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      });
      return record?.isActive !== false;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        if (!user.isActive) return null; // admin-disabled account

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
});
