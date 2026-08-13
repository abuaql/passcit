import "dotenv/config";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { createAccessToken, verifyAccessToken } from "./access-token";

const USER = { id: "user_123", role: "USER" as const };

// Manually builds a token with an arbitrary payload, signed with the same
// secret/algorithm the module itself uses — lets tests construct claim
// shapes (e.g. a wrong `type`) that createAccessToken() never produces.
function buildToken(claims: Record<string, unknown>): string {
  const secret = process.env.AUTH_SECRET!;
  const base64url = (input: string) => Buffer.from(input, "utf8").toString("base64url");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("access-token", () => {
  test("round-trips a token with the expected claims", () => {
    const { token, expiresIn } = createAccessToken(USER);
    assert.equal(expiresIn, 900);

    const claims = verifyAccessToken(token);
    assert.ok(claims);
    assert.equal(claims.sub, USER.id);
    assert.equal(claims.role, USER.role);
    assert.equal(claims.type, "access");
    assert.equal(claims.exp - claims.iat, 900);
  });

  test("rejects a token with a tampered signature", () => {
    const { token } = createAccessToken(USER);
    const [header, payload, signature] = token.split(".");
    const flipped = signature!.slice(0, -1) + (signature!.endsWith("A") ? "B" : "A");
    assert.equal(verifyAccessToken(`${header}.${payload}.${flipped}`), null);
  });

  test("rejects a token with a tampered payload", () => {
    const { token } = createAccessToken(USER);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "someone-else", role: "ADMIN", type: "access", iat: 0, exp: 9999999999 }),
      "utf8"
    ).toString("base64url");
    assert.equal(verifyAccessToken(`${header}.${forgedPayload}.${signature}`), null);
  });

  test("rejects an expired token", () => {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const { token } = createAccessToken(USER, twentyMinutesAgo);
    assert.equal(verifyAccessToken(token), null);
  });

  test("rejects a token whose type is not 'access'", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = buildToken({
      sub: USER.id,
      role: USER.role,
      type: "refresh",
      iat: now,
      exp: now + 900,
    });
    assert.equal(verifyAccessToken(token), null);
  });

  test("rejects malformed tokens", () => {
    assert.equal(verifyAccessToken("not-a-jwt"), null);
    assert.equal(verifyAccessToken("only.two"), null);
    assert.equal(verifyAccessToken(""), null);
  });

  test("rejects a token with an invalid role claim", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = buildToken({ sub: USER.id, role: "SUPERUSER", type: "access", iat: now, exp: now + 900 });
    assert.equal(verifyAccessToken(token), null);
  });

  test("createAccessToken throws without AUTH_SECRET", () => {
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      assert.throws(() => createAccessToken(USER));
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });

  test("verifyAccessToken returns null (not throw) without AUTH_SECRET", () => {
    const { token } = createAccessToken(USER);
    const original = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      assert.equal(verifyAccessToken(token), null);
    } finally {
      process.env.AUTH_SECRET = original;
    }
  });
});
