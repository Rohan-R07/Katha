import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateServerEnvironment } from "./vercel-env.mjs";

const valid = { DATABASE_URL: "postgresql://db.example.test/khata", SESSION_SECRET: "x".repeat(32) };

test("missing configuration reports both required settings", () => {
  const errors = validateServerEnvironment({});
  assert.equal(errors.length, 2);
  assert.match(errors.join("\n"), /DATABASE_URL/);
  assert.match(errors.join("\n"), /JWT_SECRET or SESSION_SECRET/);
});

test("all PostgreSQL schemes accepted by the existing backend are allowed", () => {
  for (const scheme of ["postgres", "postgresql", "postgresql+psycopg"]) {
    assert.deepEqual(validateServerEnvironment({ ...valid, DATABASE_URL: `${scheme}://db.example.test/khata?sslmode=require` }), []);
  }
});

test("malformed or non-PostgreSQL URLs fail without echoing values", () => {
  for (const url of ["private-value-do-not-echo", "sqlite:///tmp/db", "https://db.example.test", "postgresql:///khata"]) {
    const errors = validateServerEnvironment({ ...valid, DATABASE_URL: url });
    assert.equal(errors.length, 1);
    assert.match(errors[0], /DATABASE_URL/);
    assert.ok(!errors[0].includes(url));
  }
});

test("JWT_SECRET precedence matches the backend and cannot mask a short JWT key", () => {
  assert.deepEqual(validateServerEnvironment({ ...valid, SESSION_SECRET: "", JWT_SECRET: "y".repeat(32) }), []);
  assert.equal(validateServerEnvironment({ ...valid, JWT_SECRET: "short" }).length, 1);
  assert.deepEqual(validateServerEnvironment({ ...valid, JWT_SECRET: "" }), []);
});

test("missing and short signing keys are rejected without echoing values", () => {
  for (const secret of ["", "private-short-key"]) {
    const errors = validateServerEnvironment({ ...valid, SESSION_SECRET: secret });
    assert.equal(errors.length, 1);
    if (secret) assert.ok(!errors[0].includes(secret));
  }
});

test("strict deployment mode stops before compilation when configuration is absent", () => {
  const script = fileURLToPath(new URL("./build-vercel.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script], { env: { KHATA_REQUIRE_BACKEND: "1" }, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /KHATA deployment blocked/);
  assert.match(result.stderr, /DATABASE_URL is missing/);
  assert.match(result.stderr, /Environment Variables/);
  assert.doesNotMatch(result.stdout, /typecheck|vite v/);
});
