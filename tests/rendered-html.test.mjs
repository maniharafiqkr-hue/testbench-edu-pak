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
    "../app/app/plan/[itemId]/page.tsx",
    "../app/app/progress/page.tsx",
    "../app/staff/page.tsx",
    "../app/staff/login/page.tsx",
    "../app/staff/reviews/[reviewId]/page.tsx",
    "../app/staff/rewrites/[reviewId]/page.tsx",
  ];
  await Promise.all(routes.map((route) => access(new URL(route, import.meta.url))));
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /TestBench/);
});

test("defines the PostgreSQL learning loop", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const table of ["users", "assessments", "questions", "attempts", "answers", "writing_reviews", "attempt_skill_results", "repair_plans", "repair_plan_items", "repair_item_reviews", "skill_progress_events"]) {
    assert.match(schema, new RegExp(`\\"${table}\\"`));
  }
  const database = await readFile(new URL("../db/index.ts", import.meta.url), "utf8");
  assert.match(database, /drizzle-orm\/neon-http/);
  assert.match(database, /DATABASE_URL/);
});

test("persists and scores an authenticated student diagnostic", async () => {
  const actions = await readFile(new URL("../app/app/diagnostic/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /ensurePilotAssessment/);
  assert.match(actions, /requireStudentUser/);
  assert.match(actions, /eq\(attempts\.studentId, studentId\)/);
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
  assert.match(sessionPage, /requireStudentUser/);
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

test("protects and completes the role-based teacher writing-review loop", async () => {
  const teacherSession = await readFile(new URL("../lib/teacher-session.ts", import.meta.url), "utf8");
  assert.match(teacherSession, /TEACHER_ACCESS_CODE/);
  assert.match(teacherSession, /httpOnly: true/);
  assert.match(teacherSession, /sameSite: "strict"/);

  const staffPage = await readFile(new URL("../app/staff/page.tsx", import.meta.url), "utf8");
  assert.match(staffPage, /requireStaffAccess\(REVIEW_ROLES\)/);
  assert.match(staffPage, /writingReviews/);

  const staffActions = await readFile(new URL("../app/staff/actions.ts", import.meta.url), "utf8");
  assert.match(staffActions, /returnWritingReview/);
  assert.match(staffActions, /finalScore/);
  assert.match(staffActions, /status: "returned"/);

  const results = await readFile(new URL("../app/app/results/page.tsx", import.meta.url), "utf8");
  assert.match(results, /Teacher feedback/);
  assert.match(results, /attempt\.finalScore/);
  assert.match(results, /writingReviews/);
});

test("implements named accounts, invitations, and audit history", async () => {
  const accounts = await readFile(new URL("../lib/accounts.ts", import.meta.url), "utf8");
  assert.match(accounts, /getCurrentAppUser/);
  assert.match(accounts, /claimPilotLearningData/);
  assert.match(accounts, /STAFF_MANAGER_ROLES/);

  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const fieldOrTable of ["auth_provider_id", "profile_completed_at", "staff_invitations", "audit_events"]) {
    assert.match(schema, new RegExp(`\\"${fieldOrTable}\\"`));
  }

  const inviteActions = await readFile(new URL("../app/invite/[token]/actions.ts", import.meta.url), "utf8");
  assert.match(inviteActions, /createHash\("sha256"\)/);
  assert.match(inviteActions, /requireAuthenticatedUser/);
  assert.match(inviteActions, /staff_invitation\.accepted/);

  const staffUserActions = await readFile(new URL("../app/staff/users/actions.ts", import.meta.url), "utf8");
  assert.match(staffUserActions, /randomBytes\(32\)/);
  assert.match(staffUserActions, /requireStaffManager/);
  assert.match(staffUserActions, /staff_role\.updated/);

  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /request\.headers\.has\("next-action"\)/);
  assert.match(proxy, /NextResponse\.next\(\)/);

  const accountMenu = await readFile(new URL("../app/components/AppUserMenu.tsx", import.meta.url), "utf8");
  const staffPage = await readFile(new URL("../app/staff/page.tsx", import.meta.url), "utf8");
  const studentShell = await readFile(new URL("../app/components/StudentShell.tsx", import.meta.url), "utf8");
  assert.match(accountMenu, /user\.displayName/);
  assert.match(accountMenu, /user\.email/);
  assert.match(accountMenu, /href="\/account\/settings"/);
  assert.match(accountMenu, /href="\/auth\/sign-out"/);
  assert.match(staffPage, /<AppUserMenu user=\{staff\.user\}/);
  assert.doesNotMatch(staffPage, /<UserButton/);
  assert.match(studentShell, /<AppUserMenu user=\{user\}/);
});

test("defines the versioned English assessment foundation for every supported board", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const table of [
    "boards",
    "board_levels",
    "subjects",
    "curriculum_versions",
    "curriculum_units",
    "question_items",
    "question_revisions",
    "question_revision_tags",
    "question_revision_skills",
    "question_revision_curriculum_versions",
    "question_revision_curriculum_units",
    "assessment_versions",
    "assessment_questions",
    "attempt_curriculum_unit_results",
  ]) {
    assert.match(schema, new RegExp(`\\"${table}\\"`));
  }
  assert.match(schema, /question_difficulty/);
  assert.match(schema, /question_format/);
  assert.match(schema, /marking_scheme/);
  assert.match(schema, /assessment_version_id/);
  assert.match(schema, /assessment_question_id/);
  assert.match(schema, /question_revision_id/);
  assert.match(schema, /answers_attempt_version_fk/);
  assert.match(schema, /answers_assessment_question_version_fk/);
  assert.match(schema, /attempts_assessment_version_consistency_fk/);
  assert.doesNotMatch(schema, /export const questionItemSkills/);

  const catalogue = await readFile(new URL("../lib/education-boards.ts", import.meta.url), "utf8");
  assert.equal(catalogue.match(/^\s+code: \"/gm)?.length, 35);
  assert.match(catalogue, /pk_fbise/);
  assert.match(catalogue, /pk_pb_bise_lahore/);
  assert.match(catalogue, /pk_sd_bsek_karachi/);
  assert.match(catalogue, /intl_cambridge/);
  assert.match(catalogue, /intl_pearson_edexcel/);

  const profileForm = await readFile(new URL("../app/components/StudentProfileForm.tsx", import.meta.url), "utf8");
  const profileAction = await readFile(new URL("../app/onboarding/actions.ts", import.meta.url), "utf8");
  assert.match(profileForm, /educationBoardGroups/);
  assert.match(profileForm, /isSelfStudy/);
  assert.match(profileAction, /boardId: savedBoard\.id/);
  assert.match(profileAction, /selectedBoard\.gradeLevels\.includes/);

  const diagnosticActions = await readFile(new URL("../app/app/diagnostic/actions.ts", import.meta.url), "utf8");
  assert.match(diagnosticActions, /assessmentVersionId: assessmentVersion\.id/);
  assert.match(diagnosticActions, /assessmentQuestionId: question\.id/);
  assert.match(diagnosticActions, /questionRevisionId: question\.questionRevisionId/);

  const resultsPage = await readFile(new URL("../app/app/results/page.tsx", import.meta.url), "utf8");
  const repairActivity = await readFile(new URL("../app/app/plan/[itemId]/page.tsx", import.meta.url), "utf8");
  assert.match(resultsPage, /\.from\(assessmentQuestions\)/);
  assert.match(resultsPage, /assessmentVersions\.title/);
  assert.match(resultsPage, /answers\.assessmentQuestionId/);
  assert.doesNotMatch(resultsPage, /answers\.questionId/);
  assert.match(repairActivity, /eq\(assessmentQuestions\.id, answers\.assessmentQuestionId\)/);
  assert.match(repairActivity, /questionRevisions\.prompt/);
  assert.doesNotMatch(repairActivity, /answers\.questionId/);

  const foundationMigration = await readFile(new URL("../drizzle/0003_dizzy_ben_grimm.sql", import.meta.url), "utf8");
  const integrityMigration = await readFile(new URL("../drizzle/0004_phase1_integrity.sql", import.meta.url), "utf8");
  const cleanupMigration = await readFile(new URL("../drizzle/0005_phase1_cleanup.sql", import.meta.url), "utf8");
  assert.match(foundationMigration, /INSERT INTO \"boards\"/);
  assert.match(foundationMigration, /INSERT INTO \"question_revisions\"/);
  assert.match(foundationMigration, /UPDATE \"attempts\" AS attempt/);
  assert.match(foundationMigration, /UPDATE \"answers\" AS answer/);
  assert.match(foundationMigration, /jsonb_typeof\(q\.\"options\"\) = 'array'/);

  const catalogueCodes = [...catalogue.matchAll(/^\s+code: "([^"]+)"/gm)].map((match) => match[1]);
  const boardSeed = foundationMigration.match(/INSERT INTO "boards"[\s\S]*?ON CONFLICT \("code"\)/)?.[0] ?? "";
  const seededBoards = [...boardSeed.matchAll(/^\s*\('([^']+)',.*?, (\d+)\),?$/gm)]
    .map((match) => ({ code: match[1], sortOrder: Number(match[2]) }));
  assert.deepEqual(seededBoards.map((board) => board.code), catalogueCodes);
  assert.deepEqual(seededBoards.map((board) => board.sortOrder), catalogueCodes.map((_, index) => (index + 1) * 10));
  assert.match(catalogue, /sortOrder: \(index \+ 1\) \* 10/);

  const levelSeed = foundationMigration.match(/WITH supported_levels[\s\S]*?ON CONFLICT \("board_id", "grade_level"\) DO NOTHING;/)?.[0] ?? "";
  const seededPairs = [...levelSeed.matchAll(/\('([^']+)', '(grade_9|grade_10|o_level|a_level)'::"grade_level"\)/g)]
    .map((match) => `${match[1]}:${match[2]}`);
  const expectedPairs = catalogueCodes.flatMap((code) =>
    (code.startsWith("intl_") ? ["o_level", "a_level"] : ["grade_9", "grade_10"])
      .map((level) => `${code}:${level}`),
  );
  assert.deepEqual(seededPairs, expectedPairs);
  assert.doesNotMatch(levelSeed, /system_type/);

  for (const invariant of [
    "answers_attempt_version_fk",
    "answers_assessment_question_version_fk",
    "answers_assessment_question_revision_fk",
    "attempts_assessment_version_consistency_fk",
    "curriculum_units_position_unique",
    "assessments_publication_state_check",
    "assessment_versions_immutable_when_published",
    "question_revisions_immutable_when_published",
    "question_revision_skills_immutable_when_published",
    "assessment_questions_immutable_when_published",
  ]) {
    assert.match(integrityMigration, new RegExp(invariant));
  }
  assert.match(integrityMigration, /ADD COLUMN "assessment_version_id" uuid;[\s\S]*UPDATE "answers" AS answer[\s\S]*ALTER COLUMN "assessment_version_id" SET NOT NULL/);
  assert.match(cleanupMigration, /DROP TABLE "question_item_skills"/);
  assert.match(cleanupMigration, /DROP COLUMN "is_published"/);
});

test("generates and completes a personalised repair loop", async () => {
  const loop = await readFile(new URL("../lib/learning-loop.ts", import.meta.url), "utf8");
  assert.match(loop, /completeAttemptLearningLoop/);
  assert.match(loop, /attemptSkillResults/);
  assert.match(loop, /priorityImprovement/);
  assert.match(loop, /kind: "rewrite"/);
  assert.match(loop, /kind: "retest"/);
  assert.match(loop, /const retestSkill = practiceSkill/);
  assert.match(loop, /24 \* 60 \* 60 \* 1000/);

  const plan = await readFile(new URL("../app/app/plan/page.tsx", import.meta.url), "utf8");
  const planActions = await readFile(new URL("../app/app/plan/actions.ts", import.meta.url), "utf8");
  const activity = await readFile(new URL("../app/app/plan/[itemId]/page.tsx", import.meta.url), "utf8");
  assert.match(plan, /repairPlanItems/);
  assert.match(plan, /percentage/);
  assert.match(planActions, /submitKnowledgeActivity/);
  assert.match(planActions, /submitRewriteActivity/);
  assert.match(activity, /VERSION 1/);
  assert.match(activity, /FRESH RETEST/);

  const staffActions = await readFile(new URL("../app/staff/actions.ts", import.meta.url), "utf8");
  const rewriteReview = await readFile(new URL("../app/staff/rewrites/[reviewId]/page.tsx", import.meta.url), "utf8");
  assert.match(staffActions, /returnRewriteReview/);
  assert.match(staffActions, /teacher_confirmed_rewrite/);
  assert.match(rewriteReview, /VERSION 2/);

  const progress = await readFile(new URL("../app/app/progress/page.tsx", import.meta.url), "utf8");
  assert.match(progress, /skillProgressEvents/);
  assert.match(progress, /MASTERY HISTORY/);
});

test("keeps post-submit consumers on immutable assessment snapshots", async () => {
  const consumers = [
    "../app/app/results/page.tsx",
    "../app/app/plan/[itemId]/page.tsx",
    "../app/staff/page.tsx",
    "../app/staff/actions.ts",
    "../app/staff/reviews/[reviewId]/page.tsx",
    "../app/staff/rewrites/[reviewId]/page.tsx",
    "../lib/learning-loop.ts",
  ];

  for (const consumer of consumers) {
    const source = await readFile(new URL(consumer, import.meta.url), "utf8");
    assert.match(source, /assessmentQuestions/, `${consumer} must use assessment-question snapshots`);
    assert.match(source, /questionRevisions/, `${consumer} must use question-revision snapshots`);
    assert.doesNotMatch(source, /answers\.questionId/, `${consumer} must not read the legacy answer bridge`);
    assert.doesNotMatch(source, /\bquestionSkills\b/, `${consumer} must not use legacy skill mappings`);
    assert.doesNotMatch(
      source,
      /assessmentTitle:\s*assessments\.title/,
      `${consumer} must not display mutable assessment metadata`,
    );
  }
});
