import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("uses standard Next.js with the Neon driver", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.dependencies["@neondatabase/serverless"], "1.1.0");
  assert.equal(packageJson.devDependencies.vinext, undefined);
  assert.equal(packageJson.devDependencies.wrangler, undefined);
  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  await assert.rejects(access(new URL("../worker/index.ts", import.meta.url)));
});

test("keeps every prototype route", async () => {
  const routes = [
    "../app/page.tsx",
    "../app/app/home/page.tsx",
    "../app/app/diagnostic/page.tsx",
    "../app/app/diagnostic/session/page.tsx",
    "../app/app/results/page.tsx",
    "../app/app/plan/page.tsx",
    "../app/staff/page.tsx",
  ];
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /TestBench/);
});

test("defines the PostgreSQL learning loop", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const table of ["users", "assessments", "questions", "attempts", "answers", "writing_reviews", "attempt_skill_results", "repair_plans", "repair_plan_items"]) {
    assert.match(schema, new RegExp(`\\"${table}\\"`));
  }
  const database = await readFile(new URL("../db/index.ts", import.meta.url), "utf8");
  assert.match(database, /drizzle-orm\/neon-http/);
  assert.match(database, /DATABASE_URL/);
});
