import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Next.js 16 + ESLint 9 flat config.
 *
 * eslint-config-next v16 ships *native* flat config via subpath exports,
 * so it is imported and spread directly. It must NOT be routed through
 * @eslint/eslintrc's FlatCompat: that layer exists to translate legacy
 * eslintrc configs into flat config. Handing it an already-flat config
 * sends it into the legacy config validator, which walks plugin objects
 * containing circular references (plugin -> configs -> plugin) and
 * throws "TypeError: Converting circular structure to JSON" before
 * ESLint ever loads a single rule.
 *
 * Written as a plain array rather than with eslint/config's
 * defineConfig() helper on purpose: defineConfig and globalIgnores were
 * added in ESLint 9.23, and this project declares eslint ^9.17.0 with no
 * lockfile pinning a higher version. A plain array of config objects is
 * the canonical flat config format, behaves identically, and cannot
 * break on the low end of that declared range.
 */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // A standalone `ignores` object is flat config's global-ignores
    // mechanism. Specifying it replaces eslint-config-next's own default
    // ignores, so those are re-listed here alongside this project's.
    ignores: [
      // eslint-config-next defaults:
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // This project's own:
      "src/generated/**",
      "node_modules/**",
      "prisma/migrations/**",
    ],
  },
];

export default eslintConfig;
