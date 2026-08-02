import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma ORM 7 moved CLI configuration (connection string, migrations path,
// seed command) out of schema.prisma and into this file.
// Docs: https://www.prisma.io/docs/orm/reference/prisma-config-reference
//
// Deliberately NOT using the `env()` helper from "prisma/config" below.
// That helper throws PrismaConfigEnvError the moment DATABASE_URL is
// unset — and every Prisma CLI command loads this file, including
// `prisma generate`, which doesn't actually need a working database
// connection at all (it only reads schema.prisma to generate typed
// client code). Since `npm install` runs `prisma generate` via
// postinstall, that throw would break `npm install` itself on any fresh
// clone that doesn't have a .env file yet — before anyone even gets the
// chance to configure a database.
//
// Reading `process.env.DATABASE_URL` directly with a fallback avoids
// that: `generate` always gets a syntactically valid connection string
// and succeeds. The fallback below is the same placeholder documented in
// .env.example, so it also happens to work out of the box if the
// included docker-compose MySQL is running. Anything that actually needs
// a real database — `migrate`, `db push`, `db seed`, or `next dev` once
// you hit a page that queries the database — uses the real DATABASE_URL
// from your .env once you've created one.
const FALLBACK_DATABASE_URL = "mysql://civicsprep:civicsprep@localhost:3306/civicsprep";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL,
  },
});
