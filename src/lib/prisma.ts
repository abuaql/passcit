import { PrismaClient } from "@/generated/prisma/client";
import { createDbAdapter } from "./db-adapter";

// Prevent creating a new PrismaClient (and connection pool) on every
// hot-reload in development, which otherwise exhausts MySQL connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createDbAdapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
