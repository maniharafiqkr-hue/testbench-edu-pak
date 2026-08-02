import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  answers,
  attempts,
  attemptSkillResults,
  questionSkills,
  questions,
  repairPlanItems,
  repairPlans,
  skillProgressEvents,
  skills,
  writingReviews,
} from "@/db/schema";

export type RepairActivityContent = {
  prompt?: string;
  context?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
};

type ActivityPair = {
  practice: RepairActivityContent;
  retest: RepairActivityContent;
};

const WRITING_SKILLS = [
  {
    code: "writing-language",
    name: "Language and effect",
    description: "Choose precise vocabulary and details that create the intended effect.",
  },
  {
    code: "writing-accuracy",
    name: "Writing accuracy",
    description: "Control grammar, spelling, punctuation, and sentence boundaries.",
  },
] as const;

const ACTIVITIES: Record<string, ActivityPair> = {
  "grammar-agreement": {
    practice: {
      prompt: "Choose the sentence with correct subject–verb agreement.",
      options: [
        "The basket of mangoes were left outside.",
        "The basket of mangoes was left outside.",
        "The baskets of mangoes was left outside.",
      ],
      correctAnswer: "The basket of mangoes was left outside.",
      explanation: "The subject is ‘basket’, which is singular, so it takes ‘was’.",
    },
    retest: {
      prompt: "Which sentence keeps the subject and verb in agreement?",
      options: [
        "Each of the players have a numbered shirt.",
        "Each of the players has a numbered shirt.",
        "Each of the player have a numbered shirt.",
      ],
      correctAnswer: "Each of the players has a numbered shirt.",
      explanation: "‘Each’ is singular, so the correct verb is ‘has’.",
    },
  },
  "vocabulary-context": {
    practice: {
      context: "The instructions were concise, so everyone understood them after one reading.",
      prompt: "What does ‘concise’ most nearly mean?",
      options: ["Brief and clear", "Long and detailed", "Difficult to read", "Written by hand"],
      correctAnswer: "Brief and clear",
      explanation: "The clue ‘after one reading’ shows that the instructions were brief and clear.",
    },
    retest: {
      context: "Unlike the noisy market outside, the reading room was tranquil throughout the afternoon.",
      prompt: "What does ‘tranquil’ most nearly mean?",
      options: ["Crowded", "Peaceful", "Colourful", "Unfamiliar"],
      correctAnswer: "Peaceful",
      explanation: "The contrast with ‘noisy’ points to a peaceful place.",
    },
  },
  "punctuation-precision": {
    practice: {
      prompt: "Choose the correctly punctuated sentence.",
      options: [
        "Before the bell rang the students, packed their books.",
        "Before the bell rang, the students packed their books.",
        "Before, the bell rang the students packed their books.",
      ],
      correctAnswer: "Before the bell rang, the students packed their books.",
      explanation: "A comma separates the opening dependent clause from the main clause.",
    },
    retest: {
      prompt: "Choose the correctly punctuated sentence.",
      options: [
        "When the lights returned, we finished the experiment.",
        "When the lights, returned we finished the experiment.",
        "When the lights returned we, finished the experiment.",
      ],
      correctAnswer: "When the lights returned, we finished the experiment.",
      explanation: "The comma belongs after the complete opening clause.",
    },
  },
  "comprehension-evidence": {
    practice: {
      context: "Sana arrived early every Saturday to water the school garden. During the hottest week, she covered the soil with dry leaves so it would retain moisture.",
      prompt: "Which detail best supports the idea that Sana cared for the garden carefully?",
      options: [
        "She came on Saturdays.",
        "She covered the soil so it would retain moisture.",
        "The week was hot.",
        "The garden belonged to the school.",
      ],
      correctAnswer: "She covered the soil so it would retain moisture.",
      explanation: "This detail directly connects Sana’s action with protecting the plants.",
    },
    retest: {
      context: "When the footbridge was damaged, Bilal mapped a safer route to school and shared it with younger pupils. He then asked the council to repair the bridge before the monsoon.",
      prompt: "Which evidence best shows that Bilal acted responsibly?",
      options: [
        "The footbridge was damaged.",
        "The monsoon had not started.",
        "He shared a safer route and reported the bridge.",
        "Younger pupils walked to school.",
      ],
      correctAnswer: "He shared a safer route and reported the bridge.",
      explanation: "Both actions directly show that Bilal protected others and tried to solve the problem.",
    },
  },
  "narrative-organisation": {
    practice: {
      prompt: "Which sequence gives a short narrative the clearest shape?",
      options: [
        "Conclusion → unrelated detail → problem",
        "Problem → attempts to solve it → consequence and conclusion",
        "Description → conclusion → new character",
      ],
      correctAnswer: "Problem → attempts to solve it → consequence and conclusion",
      explanation: "A clear narrative develops the problem before showing its result.",
    },
    retest: {
      prompt: "Which opening most clearly establishes a problem that a narrative can develop?",
      options: [
        "The sky was blue and the road was long.",
        "As the last bus disappeared, I realised my brother’s medicine was still in my bag.",
        "Many people enjoy travelling by bus.",
      ],
      correctAnswer: "As the last bus disappeared, I realised my brother’s medicine was still in my bag.",
      explanation: "It introduces an immediate problem, a consequence, and a reason to act.",
    },
  },
  "writing-language": {
    practice: {
      prompt: "Which sentence uses the most precise detail?",
      options: [
        "The wind was bad.",
        "The wind pushed against the shutters until their hinges rattled.",
        "There was some wind outside.",
      ],
      correctAnswer: "The wind pushed against the shutters until their hinges rattled.",
      explanation: "The verbs and sensory detail create a clear effect without vague wording.",
    },
    retest: {
      prompt: "Which sentence creates tension through precise language?",
      options: [
        "I went into the room and felt scared.",
        "The door clicked shut behind me, and the torch beam began to fade.",
        "The room was a place in the building.",
      ],
      correctAnswer: "The door clicked shut behind me, and the torch beam began to fade.",
      explanation: "Specific sounds and actions make the danger feel immediate.",
    },
  },
  "writing-accuracy": {
    practice: {
      prompt: "Choose the sentence with consistent tense and correct punctuation.",
      options: [
        "I opened the gate, and hear footsteps behind me.",
        "I opened the gate and heard footsteps behind me.",
        "I open the gate, and heard footsteps behind me.",
      ],
      correctAnswer: "I opened the gate and heard footsteps behind me.",
      explanation: "Both actions use the past tense, and no comma is needed between the two verbs.",
    },
    retest: {
      prompt: "Choose the accurately written sentence.",
      options: [
        "She checked the lock before she leaves the house.",
        "She checked the lock before she left the house.",
        "She check the lock, before she left the house.",
      ],
      correctAnswer: "She checked the lock before she left the house.",
      explanation: "Both verbs stay in the past tense and the sentence needs no comma.",
    },
  },
};

const GENERIC_ACTIVITY: ActivityPair = {
  practice: {
    prompt: "Which study action uses feedback most effectively?",
    options: ["Read the score only", "Correct the specific error and explain the change", "Repeat the same answer"],
    correctAnswer: "Correct the specific error and explain the change",
    explanation: "A correction plus an explanation turns feedback into a reusable skill.",
  },
  retest: {
    prompt: "How should you prove that a repaired skill lasts?",
    options: ["Retry the identical question immediately", "Answer a fresh question after a delay", "Read the feedback again"],
    correctAnswer: "Answer a fresh question after a delay",
    explanation: "A delayed fresh question checks retained skill rather than memory of the answer.",
  },
};

export function skillLevel(score: number, maximumScore: number) {
  const percentage = maximumScore > 0 ? score / maximumScore : 0;
  if (percentage >= 0.8) return "secure";
  if (percentage >= 0.5) return "developing";
  return "priority";
}

export async function completeAttemptLearningLoop(attemptId: string) {
  const db = getDb();
  const [attempt] = await db
    .select({ id: attempts.id, status: attempts.status, studentId: attempts.studentId })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.status !== "returned") {
    throw new Error("A repair plan can only be generated after teacher marking is returned.");
  }

  const now = new Date();
  const writingSkillIds = new Map<string, string>();
  for (const skill of WRITING_SKILLS) {
    const [saved] = await db
      .insert(skills)
      .values(skill)
      .onConflictDoUpdate({
        target: skills.code,
        set: { name: skill.name, description: skill.description, updatedAt: now },
      })
      .returning({ code: skills.code, id: skills.id });
    writingSkillIds.set(saved.code, saved.id);
  }

  const rows = await db
    .select({
      answerId: answers.id,
      awardedMarks: answers.awardedMarks,
      marks: questions.marks,
      priorityImprovement: writingReviews.priorityImprovement,
      questionType: questions.type,
      response: answers.response,
      rewriteInstruction: writingReviews.rewriteInstruction,
      rubric: writingReviews.rubric,
      section: questions.section,
      skillCode: skills.code,
      skillId: skills.id,
      skillName: skills.name,
      strength: writingReviews.strength,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .leftJoin(questionSkills, eq(questionSkills.questionId, questions.id))
    .leftJoin(skills, eq(skills.id, questionSkills.skillId))
    .leftJoin(writingReviews, eq(writingReviews.answerId, answers.id))
    .where(eq(answers.attemptId, attemptId))
    .orderBy(asc(questions.position));

  type Result = { skillId: string; code: string; name: string; score: number; maximumScore: number };
  const calculated = new Map<string, Result>();
  const addResult = (skillId: string, code: string, name: string, score: number, maximumScore: number) => {
    const current = calculated.get(skillId);
    calculated.set(skillId, {
      skillId,
      code,
      name,
      score: (current?.score ?? 0) + score,
      maximumScore: (current?.maximumScore ?? 0) + maximumScore,
    });
  };

  for (const row of rows) {
    if (row.questionType === "extended_writing") {
      const rubric = row.rubric ?? {};
      if (row.skillId && row.skillCode && row.skillName) {
        addResult(row.skillId, row.skillCode, row.skillName, rubric.task_and_structure ?? 0, 2);
      }
      const languageId = writingSkillIds.get("writing-language");
      const accuracyId = writingSkillIds.get("writing-accuracy");
      if (languageId) addResult(languageId, "writing-language", "Language and effect", rubric.language_and_effect ?? 0, 2);
      if (accuracyId) addResult(accuracyId, "writing-accuracy", "Writing accuracy", rubric.accuracy_and_mechanics ?? 0, 2);
    } else if (row.skillId && row.skillCode && row.skillName) {
      addResult(row.skillId, row.skillCode, row.skillName, row.awardedMarks ?? 0, row.marks);
    }
  }

  const results = [...calculated.values()];
  for (const result of results) {
    const level = skillLevel(result.score, result.maximumScore);
    await db
      .insert(attemptSkillResults)
      .values({
        attemptId,
        skillId: result.skillId,
        score: result.score,
        maximumScore: result.maximumScore,
        level,
      })
      .onConflictDoUpdate({
        target: [attemptSkillResults.attemptId, attemptSkillResults.skillId],
        set: { score: result.score, maximumScore: result.maximumScore, level, updatedAt: now },
      });

    await db
      .insert(skillProgressEvents)
      .values({
        studentId: attempt.studentId,
        skillId: result.skillId,
        referenceKey: `diagnostic:${attemptId}:${result.skillId}`,
        source: "diagnostic",
        score: result.score,
        maximumScore: result.maximumScore,
        level,
      })
      .onConflictDoUpdate({
        target: skillProgressEvents.referenceKey,
        set: { score: result.score, maximumScore: result.maximumScore, level, updatedAt: now },
      });
  }

  const [plan] = await db
    .insert(repairPlans)
    .values({ studentId: attempt.studentId, sourceAttemptId: attemptId, status: "active" })
    .onConflictDoUpdate({
      target: repairPlans.sourceAttemptId,
      set: { status: "active", updatedAt: now },
    })
    .returning({ id: repairPlans.id });

  const priorities = [...results].sort((left, right) =>
    left.score / left.maximumScore - right.score / right.maximumScore,
  );
  const primary = priorities[0];
  const practiceSkill = priorities.find((item) => ACTIVITIES[item.code]) ?? primary;
  const retestSkill = practiceSkill;
  const writingRow = rows.find((row) => row.questionType === "extended_writing" && row.rewriteInstruction)
    ?? rows.find((row) => row.rewriteInstruction);
  const rewriteSkill = priorities.find((item) => item.code === "narrative-organisation") ?? primary;

  if (!primary || !practiceSkill || !retestSkill || !writingRow) {
    throw new Error("The returned attempt does not contain enough evidence to build a repair plan.");
  }

  const practice = (ACTIVITIES[practiceSkill.code] ?? GENERIC_ACTIVITY).practice;
  const retest = (ACTIVITIES[retestSkill.code] ?? GENERIC_ACTIVITY).retest;
  const retestUnlock = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const items = [
    {
      planId: plan.id,
      skillId: primary.skillId,
      sourceAnswerId: writingRow.answerId,
      position: 1,
      kind: "review" as const,
      title: `Review your ${primary.name.toLowerCase()} evidence`,
      instructions: "Read the marks and teacher feedback, then identify the one change you will carry into the next task.",
      content: { explanation: writingRow.priorityImprovement ?? "Review the lost marks before continuing." },
      estimatedMinutes: 6,
      maximumMarks: 1,
    },
    {
      planId: plan.id,
      skillId: practiceSkill.skillId,
      position: 2,
      kind: "practice" as const,
      title: `Repair ${practiceSkill.name.toLowerCase()}`,
      instructions: "Apply the feedback to a short targeted question. A correct answer unlocks the rewrite.",
      content: practice,
      estimatedMinutes: 8,
      maximumMarks: 1,
    },
    {
      planId: plan.id,
      skillId: rewriteSkill.skillId,
      sourceAnswerId: writingRow.answerId,
      position: 3,
      kind: "rewrite" as const,
      title: `Rewrite your ${writingRow.section.toLowerCase()} response`,
      instructions: writingRow.rewriteInstruction ?? "Rewrite the response using your teacher’s feedback.",
      content: { explanation: writingRow.priorityImprovement ?? undefined },
      estimatedMinutes: 18,
      maximumMarks: 1,
    },
    {
      planId: plan.id,
      skillId: retestSkill.skillId,
      position: 4,
      kind: "retest" as const,
      title: `Fresh retest: ${retestSkill.name}`,
      instructions: "Answer a different question after the delay to prove that the repaired skill lasts.",
      content: retest,
      estimatedMinutes: 10,
      maximumMarks: 1,
      unlocksAt: retestUnlock,
    },
  ];

  for (const item of items) {
    await db
      .insert(repairPlanItems)
      .values(item)
      .onConflictDoNothing({ target: [repairPlanItems.planId, repairPlanItems.position] });
  }

  return plan.id;
}
