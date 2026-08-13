import "dotenv/config";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";
import { isDatabaseReachable } from "@/lib/native-auth/test-helpers";

// Public route — no requireUser() at all, so (unlike every auth-gated
// route in this codebase) it's fully callable directly here.
describe("GET /api/content/version", () => {
  test("responds 200 with a version string, no Authorization header sent", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const res = await GET();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.version, "string");
    assert.match(body.version, /^[0-9a-f]{16}$/);
  });

  test("returns a stable shape across repeated calls", async (t) => {
    if (!(await isDatabaseReachable())) return t.skip("no database reachable in this environment");

    const first = await (await GET()).json();
    const second = await (await GET()).json();
    assert.deepEqual(Object.keys(first).sort(), Object.keys(second).sort());
    assert.equal(first.version, second.version);
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
