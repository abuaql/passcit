import "dotenv/config";
import { randomUUID } from "crypto";
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, enforceRateLimit, AUTH_RATE_LIMITS, __resetRateLimitStoreForTests } from "./rate-limit";

function freshKey(): string {
  return `test-${randomUUID()}`;
}

function requestWithIp(ip: string): Request {
  return new Request("http://localhost/api/whatever", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("allows every request while under the limit", () => {
    const key = freshKey();
    const config = { windowMs: 60_000, max: 3 };
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, config);
      assert.equal(result.allowed, true);
    }
  });

  test("rejects once the limit is reached within the window", () => {
    const key = freshKey();
    const config = { windowMs: 60_000, max: 3 };
    for (let i = 0; i < 3; i++) checkRateLimit(key, config);

    const fourth = checkRateLimit(key, config);
    assert.equal(fourth.allowed, false);
    assert.equal(fourth.remaining, 0);
    assert.ok(fourth.retryAfterSeconds > 0);
  });

  test("retryAfterSeconds never exceeds the window and is at least 1", () => {
    const key = freshKey();
    const config = { windowMs: 5_000, max: 1 };
    const now = 1_000_000;
    checkRateLimit(key, config, now);
    const rejected = checkRateLimit(key, config, now + 100); // well inside the window

    assert.ok(rejected.retryAfterSeconds >= 1);
    assert.ok(rejected.retryAfterSeconds <= 5);
  });

  test("resets cleanly once the window has elapsed", () => {
    const key = freshKey();
    const config = { windowMs: 1_000, max: 1 };
    const now = 1_000_000;

    assert.equal(checkRateLimit(key, config, now).allowed, true);
    assert.equal(checkRateLimit(key, config, now + 500).allowed, false); // still inside the window

    const afterWindow = checkRateLimit(key, config, now + 1_000);
    assert.equal(afterWindow.allowed, true);
    assert.equal(afterWindow.remaining, config.max - 1);
  });

  test("independent keys never share a budget", () => {
    const keyA = freshKey();
    const keyB = freshKey();
    const config = { windowMs: 60_000, max: 1 };

    assert.equal(checkRateLimit(keyA, config).allowed, true);
    assert.equal(checkRateLimit(keyA, config).allowed, false); // A is now exhausted
    assert.equal(checkRateLimit(keyB, config).allowed, true); // B is untouched
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  test("returns null (allowed) while under the limit", () => {
    const ip = randomUUID();
    const config = { windowMs: 60_000, max: 2 };
    assert.equal(enforceRateLimit(requestWithIp(ip), "test-endpoint", config), null);
    assert.equal(enforceRateLimit(requestWithIp(ip), "test-endpoint", config), null);
  });

  test("returns a 429 with Retry-After once the limit is exceeded", () => {
    const ip = randomUUID();
    const config = { windowMs: 60_000, max: 1 };
    enforceRateLimit(requestWithIp(ip), "test-endpoint", config);

    const response = enforceRateLimit(requestWithIp(ip), "test-endpoint", config);
    assert.ok(response);
    assert.equal(response!.status, 429);
    assert.ok(response!.headers.get("Retry-After"));
  });

  test("the 429 body is a single generic message — no account/IP/key leakage", async () => {
    const ip = randomUUID();
    const config = { windowMs: 60_000, max: 1 };
    enforceRateLimit(requestWithIp(ip), "test-endpoint", config);

    const response = enforceRateLimit(requestWithIp(ip), "test-endpoint", config)!;
    const body = await response.json();
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.equal(typeof body.error, "string");
    assert.equal(body.error.toLowerCase().includes(ip.toLowerCase()), false);
  });

  test("different IPs hitting the same endpoint are independent", () => {
    const ipA = randomUUID();
    const ipB = randomUUID();
    const config = { windowMs: 60_000, max: 1 };

    assert.equal(enforceRateLimit(requestWithIp(ipA), "shared-endpoint", config), null);
    assert.ok(enforceRateLimit(requestWithIp(ipA), "shared-endpoint", config)); // A exhausted
    assert.equal(enforceRateLimit(requestWithIp(ipB), "shared-endpoint", config), null); // B unaffected
  });

  test("the same IP against two different endpoints is independent", () => {
    const ip = randomUUID();
    const config = { windowMs: 60_000, max: 1 };

    assert.equal(enforceRateLimit(requestWithIp(ip), "endpoint-a", config), null);
    assert.ok(enforceRateLimit(requestWithIp(ip), "endpoint-a", config)); // endpoint-a exhausted for this IP
    assert.equal(enforceRateLimit(requestWithIp(ip), "endpoint-b", config), null); // endpoint-b unaffected
  });

  test("falls back gracefully when no IP header is present at all", () => {
    const config = { windowMs: 60_000, max: 1 };
    const bareRequest = new Request("http://localhost/api/whatever", { method: "POST" });
    assert.equal(enforceRateLimit(bareRequest, "no-ip-endpoint", config), null);
    assert.ok(enforceRateLimit(bareRequest, "no-ip-endpoint", config));
  });

  test("only the first x-forwarded-for entry is used", () => {
    const ip = randomUUID();
    const config = { windowMs: 60_000, max: 1 };
    const req = () =>
      new Request("http://localhost/api/whatever", {
        method: "POST",
        headers: { "x-forwarded-for": `${ip}, 10.0.0.1, 10.0.0.2` },
      });

    assert.equal(enforceRateLimit(req(), "multi-hop-endpoint", config), null);
    assert.ok(enforceRateLimit(req(), "multi-hop-endpoint", config));
  });
});

describe("AUTH_RATE_LIMITS", () => {
  test("is the single configuration point — every entry has a positive window and max", () => {
    for (const [name, config] of Object.entries(AUTH_RATE_LIMITS)) {
      assert.ok(config.windowMs > 0, `${name}.windowMs must be positive`);
      assert.ok(config.max > 0, `${name}.max must be positive`);
    }
  });
});
