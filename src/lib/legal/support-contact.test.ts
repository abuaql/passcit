import "dotenv/config";
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getPublicSupportEmail, getSupportInboxAddress } from "./support-contact";
import { supportMessageSchema } from "@/lib/validations/support";

const ORIGINAL_SUPPORT = process.env.SUPPORT_EMAIL;
const ORIGINAL_ADMIN = process.env.ADMIN_EMAIL;

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("support contact address", () => {
  beforeEach(() => {
    delete process.env.SUPPORT_EMAIL;
    delete process.env.ADMIN_EMAIL;
  });

  afterEach(() => {
    setEnv("SUPPORT_EMAIL", ORIGINAL_SUPPORT);
    setEnv("ADMIN_EMAIL", ORIGINAL_ADMIN);
  });

  test("shows nothing publicly when no support address is configured", () => {
    assert.equal(getPublicSupportEmail(), null);
    assert.equal(getSupportInboxAddress(), null);
  });

  test("never publishes ADMIN_EMAIL, but still delivers to it", () => {
    process.env.ADMIN_EMAIL = "someone@personal.example";
    assert.equal(getPublicSupportEmail(), null);
    assert.equal(getSupportInboxAddress(), "someone@personal.example");
  });

  test("prefers SUPPORT_EMAIL for both display and delivery", () => {
    process.env.SUPPORT_EMAIL = "support@passcit.example";
    process.env.ADMIN_EMAIL = "someone@personal.example";
    assert.equal(getPublicSupportEmail(), "support@passcit.example");
    assert.equal(getSupportInboxAddress(), "support@passcit.example");
  });

  test("treats a blank env var as unset rather than as an empty address", () => {
    process.env.SUPPORT_EMAIL = "   ";
    assert.equal(getPublicSupportEmail(), null);
    assert.equal(getSupportInboxAddress(), null);
  });
});

describe("supportMessageSchema", () => {
  const valid = {
    email: "learner@example.com",
    category: "Voice practice" as const,
    message: "The microphone button does nothing when I tap it during practice.",
  };

  test("accepts a message with only the required fields", () => {
    assert.equal(supportMessageSchema.safeParse(valid).success, true);
  });

  test("accepts the optional device details", () => {
    const parsed = supportMessageSchema.safeParse({
      ...valid,
      deviceInfo: "iPhone 14 Pro, iOS 18.4",
      appVersion: "1.0.0",
    });
    assert.equal(parsed.success, true);
  });

  test("rejects an invalid reply address", () => {
    assert.equal(supportMessageSchema.safeParse({ ...valid, email: "not-an-email" }).success, false);
  });

  test("rejects a message too short to act on", () => {
    assert.equal(supportMessageSchema.safeParse({ ...valid, message: "broken" }).success, false);
  });

  test("rejects a category that isn't one of the offered options", () => {
    assert.equal(supportMessageSchema.safeParse({ ...valid, category: "Refund" }).success, false);
  });
});
