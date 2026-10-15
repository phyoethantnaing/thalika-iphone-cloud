import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { allowedOrigin, checkPassword, newSession, validInternal, validSession } from "../src/lib/security/session";
import { validateAudioPayload } from "../src/lib/security/audio-upload";
import { safeJoin } from "../src/lib/file-utils";
import { generateRequestSchema } from "../src/lib/validators";

test("owner session fails closed, verifies signatures and expires", () => {
  delete process.env.OWNER_PASSWORD_HASH; delete process.env.SESSION_SECRET;
  assert.equal(validSession(newSession()), false);
  const salt = "unit-test-salt";
  process.env.OWNER_PASSWORD_HASH = `${salt}:${scryptSync("test-only", salt, 64).toString("hex")}`;
  process.env.SESSION_SECRET = "unit-test-secret-not-for-production-123456";
  assert.equal(checkPassword("test-only"), true); assert.equal(checkPassword("wrong"), false);
  const session = newSession(); assert.equal(validSession(session), true);
  assert.equal(validSession(session.slice(0, -1) + "!"), false);
  assert.equal(validSession(session.replace(/^\d+/, "0")), false);
  delete process.env.OWNER_PASSWORD_HASH;
  assert.equal(validSession(session), false);
});
test("internal token and origin checks reject forged requests", () => {
  process.env.RUNTIME_TOKEN = "unit-internal-token-32-characters-minimum";
  assert.equal(validInternal("Bearer " + process.env.RUNTIME_TOKEN), true);
  assert.equal(validInternal("Bearer incorrect"), false);
  process.env.APP_ORIGIN = "https://owner.example";
  assert.equal(allowedOrigin(new Request("https://owner.example/api", { headers: { Origin: "https://attacker.example" } })), false);
  assert.equal(allowedOrigin(new Request("https://owner.example/api", { headers: { Origin: "https://owner.example" } })), true);
});
test("audio uploads validate actual byte size and format, paths cannot traverse", () => {
  const bytes = Buffer.alloc(100); bytes.write("RIFF"); bytes.write("WAVE", 8);
  const payload = { dataUrl: `data:audio/wav;base64,${bytes.toString("base64")}`, mimeType: "audio/wav", filename: "reference.wav", size: bytes.length };
  assert.equal(validateAudioPayload(payload).length, 100);
  assert.throws(() => validateAudioPayload({ ...payload, size: 1 }));
  assert.throws(() => validateAudioPayload({ ...payload, dataUrl: "data:audio/wav;base64,PHNjcmlwdD4=" }));
  for (const name of ["../secret", "a/../../secret", "..", "/tmp/private", "%2e%2e"]) assert.throws(() => safeJoin("/tmp/managed", name));
});
test("cloning requires explicit consent while voice design remains available", () => {
  const input = { script: "Hello this is a sample script.", provider: "voxcpm2", format: "wav", speed: 1, emotion: "calm", voiceProfileId: "profile_test" };
  assert.equal(generateRequestSchema.safeParse(input).success, false);
  assert.equal(generateRequestSchema.safeParse({ ...input, voiceConsent: true }).success, true);
  assert.equal(generateRequestSchema.safeParse({ ...input, voiceProfileId: undefined, voiceDescription: "calm voice" }).success, true);
});
