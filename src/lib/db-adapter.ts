import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Prisma ORM 7 requires PrismaClient to be constructed with an explicit
 * driver adapter (no more implicit engine). This builds the MySQL/MariaDB
 * adapter from a single DATABASE_URL, so the rest of the app only ever
 * has to think about one connection string.
 *
 * Expected format: mysql://user:password@host:port/database
 */
export function createDbAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and set your MySQL connection string."
    );
  }

  const url = new URL(connectionString);

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
}
