import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateServerEnvironment } from "./vercel-env.mjs";

const configurationErrors = validateServerEnvironment(process.env);
if (configurationErrors.length) {
  const strict = process.env.KHATA_REQUIRE_BACKEND === "1";
  console.error(strict
    ? "KHATA deployment blocked: required server configuration is missing or invalid."
    : "KHATA backend is not configured. Page assets will build; backend APIs will return HTTP 503 until configured.");
  for (const error of configurationErrors) console.error(`- ${error}`);
  console.error("Vercel → Project → Settings → Environment Variables. Save for the deployment's environment, then redeploy.");
  console.error("See shared/documentation/VERCEL-DEPLOYMENT.md. No secret values were logged.");
  if (strict) process.exit(1);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...process.env, PORT: "3000", BASE_PATH: "/", NODE_ENV: "production" };

for (const args of [
  ["run", "typecheck:libs"],
  ["--filter", "@workspace/khata-dashboard", "run", "typecheck"],
  ["--filter", "@workspace/khata-dashboard", "run", "build"],
]) {
  const result = spawnSync("pnpm", args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(path.join(root, "artifacts/khata-dashboard/dist/public/index.html"))) {
  throw new Error("KHATA frontend build did not produce index.html");
}
console.log("Vercel frontend build ready. No database migrations or seeds were run.");
