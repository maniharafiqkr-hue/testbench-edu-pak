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

test("persists and scores the pilot diagnostic", async () => {
  const actions = await readFile(new URL("../app/app/diagnostic/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /ensurePilotAssessment/);
  assert.match(actions, /ensurePilotStudent/);
  assert.match(actions, /onConflictDoUpdate/);
  assert.match(actions, /objectiveScore/);
  assert.match(actions, /writingReviews/);

  const sessionPage = await readFile(
    new URL("../app/app/diagnostic/session/page.tsx", import.meta.url),
    "utf8",
  );
  const sessionClient = await readFile(
    new URL("../app/app/diagnostic/session/DiagnosticSessionClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(sessionPage, /getPilotStudentId/);
  assert.match(sessionPage, /answerByQuestionId/);
  assert.match(sessionClient, /saveDiagnosticAnswer/);
  assert.match(sessionClient, /submitDiagnosticAttempt/);

  const results = await readFile(new URL("../app/app/results/page.tsx", import.meta.url), "utf8");
  assert.match(results, /attempt\.objectiveScore/);
  assert.match(results, /objectiveMaximum/);

  const pilotContent = await readFile(new URL("../db/pilot-assessment.ts", import.meta.url), "utf8");
  assert.match(pilotContent, /fbise-grade-10-english-starting-diagnostic/);
  assert.match(pilotContent, /comprehension-evidence/);
});
