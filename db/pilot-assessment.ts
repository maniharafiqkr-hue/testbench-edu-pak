import "server-only";

import { and, eq } from "drizzle-orm";
import { ensurePilotContentCatalogue } from "./content-catalog";
import { getDb } from "./index";
import {
  assessmentQuestions,
  assessments,
  assessmentVersions,
  questionItems,
  questionRevisionCurriculumUnits,
  questionRevisionCurriculumVersions,
  questionRevisions,
  questionRevisionSkills,
  questionRevisionTags,
  questions,
  questionSkills,
  skills,
  type QuestionMarkingScheme,
} from "./schema";

const PILOT_ASSESSMENT_ID = "2f839f9a-d648-4d78-9d43-dc45401c82b1";

const pilotSkills = [
  {
    id: "606475aa-9b6d-4a78-8456-4f91ecaf0c91",
    code: "grammar-agreement",
    name: "Subject–verb agreement",
    description: "Keep the subject and verb grammatically aligned.",
  },
  {
    id: "d2ca1691-9d2e-4c6d-a3dc-f47a93543aca",
    code: "vocabulary-context",
    name: "Vocabulary in context",
    description: "Infer the meaning of a word from the sentence around it.",
  },
  {
    id: "4a56a80b-08af-42fd-8951-e5d62a695789",
    code: "punctuation-precision",
    name: "Punctuation precision",
    description: "Use punctuation to make sentence structure clear.",
  },
  {
    id: "9c2a1839-42e1-4e26-8214-7e2d27523cc7",
    code: "comprehension-evidence",
    name: "Comprehension evidence",
    description: "Support an interpretation with a relevant detail from the passage.",
  },
  {
    id: "3e4c9418-4e77-46b2-93b4-fbf8e00ea4d0",
    code: "narrative-organisation",
    name: "Narrative organisation",
    description: "Develop a clear problem, sequence, and conclusion.",
  },
];

type PilotQuestion = {
  id: string;
  position: number;
  section: string;
  type: "multiple_choice" | "short_answer" | "extended_writing";
  prompt: string;
  context?: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  skillCode: string;
  unitCode: "language-foundations" | "reading-comprehension" | "extended-writing";
  format: "mcq" | "short_answer" | "comprehension" | "essay";
  difficulty: "easy" | "moderate" | "difficult";
  explanation: string;
  markingScheme: QuestionMarkingScheme;
};

const pilotQuestions: PilotQuestion[] = [
  {
    id: "9bf71348-9872-43de-b129-5ad50a6dbfe9",
    position: 1,
    section: "Grammar",
    type: "multiple_choice",
    prompt: "Choose the sentence with correct subject–verb agreement.",
    options: [
      "The list of books are on the desk.",
      "The list of books is on the desk.",
      "The lists of book is on the desk.",
      "The list of books were on the desk.",
    ],
    correctAnswer: "The list of books is on the desk.",
    marks: 1,
    skillCode: "grammar-agreement",
    unitCode: "language-foundations",
    format: "mcq",
    difficulty: "easy",
    explanation: "The head noun ‘list’ is singular, so it takes the singular verb ‘is’. The plural phrase ‘of books’ does not change the subject.",
    markingScheme: { modelAnswer: "The list of books is on the desk." },
  },
  {
    id: "a79062cc-e088-47dd-9b77-b5173d2d94e0",
    position: 2,
    section: "Vocabulary",
    type: "multiple_choice",
    prompt: "In the sentence below, what does ‘reluctant’ most nearly mean?",
    context: "Although Hira understood the value of the opportunity, she was reluctant to speak before the large audience.",
    options: ["Eager", "Unwilling", "Unable", "Prepared"],
    correctAnswer: "Unwilling",
    marks: 1,
    skillCode: "vocabulary-context",
    unitCode: "language-foundations",
    format: "mcq",
    difficulty: "easy",
    explanation: "The contrast between understanding the opportunity and hesitating to speak shows that ‘reluctant’ means unwilling.",
    markingScheme: { modelAnswer: "Unwilling" },
  },
  {
    id: "b5dcb56a-7a8d-4c8e-9946-41d4b4e13972",
    position: 3,
    section: "Punctuation",
    type: "multiple_choice",
    prompt: "Choose the correctly punctuated sentence.",
    options: [
      "After the rain stopped we continued, our journey.",
      "After the rain stopped, we continued our journey.",
      "After the rain, stopped we continued our journey.",
      "After the rain stopped we, continued our journey.",
    ],
    correctAnswer: "After the rain stopped, we continued our journey.",
    marks: 1,
    skillCode: "punctuation-precision",
    unitCode: "language-foundations",
    format: "mcq",
    difficulty: "easy",
    explanation: "The introductory dependent clause ends after ‘stopped’, so a comma separates it from the main clause.",
    markingScheme: { modelAnswer: "After the rain stopped, we continued our journey." },
  },
  {
    id: "1b13152e-560f-4edf-bd8b-2181db9c97d3",
    position: 4,
    section: "Comprehension",
    type: "short_answer",
    prompt: "Why did the community library become valuable to the neighbourhood? Support your answer with one detail from the passage.",
    context: "For years, the empty building at the corner of Amin Street had been ignored. A group of students persuaded local residents to turn it into a small library. Families donated books, retired teachers volunteered twice a week, and younger children finally had a quiet place to read after school. Within months, the library had become more than a room of books; it was a meeting place where neighbours shared skills and solved problems together.",
    marks: 3,
    skillCode: "comprehension-evidence",
    unitCode: "reading-comprehension",
    format: "comprehension",
    difficulty: "moderate",
    explanation: "A strong answer explains the library’s community value and supports that interpretation with a precise detail from the passage.",
    markingScheme: {
      modelAnswer: "The library gave the neighbourhood a useful shared space because children could read there and neighbours could share skills and solve problems together.",
      criteria: [
        { id: "idea", label: "Relevant explanation", description: "Explains why the library was valuable.", marks: 2 },
        { id: "evidence", label: "Textual evidence", description: "Uses one accurate detail from the passage.", marks: 1 },
      ],
    },
  },
  {
    id: "ca0d4eed-afd5-4d89-9335-1b1369254e78",
    position: 5,
    section: "Narrative writing",
    type: "extended_writing",
    prompt: "Write a narrative of 100–125 words beginning with: ‘I knew I had only one chance to make things right.’",
    context: "Your narrative should include a clear problem, logical sequence, description, and conclusion. You may plan briefly on paper before writing.",
    marks: 6,
    skillCode: "narrative-organisation",
    unitCode: "extended-writing",
    format: "essay",
    difficulty: "difficult",
    explanation: "The response should build a complete narrative around the opening line, with a clear problem, connected events, purposeful detail, and a convincing ending.",
    markingScheme: {
      criteria: [
        { id: "structure", label: "Narrative structure", description: "Clear problem, logical sequence, and conclusion.", marks: 2 },
        { id: "development", label: "Development and detail", description: "Relevant description and developed events.", marks: 2 },
        { id: "language", label: "Language control", description: "Effective vocabulary and varied sentences.", marks: 1 },
        { id: "accuracy", label: "Technical accuracy", description: "Grammar, spelling, and punctuation support meaning.", marks: 1 },
      ],
    },
  },
];

export async function ensurePilotAssessment() {
  const db = getDb();
  const now = new Date();
  const catalogue = await ensurePilotContentCatalogue();

  const [assessment] = await db
    .insert(assessments)
    .values({
      id: PILOT_ASSESSMENT_ID,
      slug: "fbise-grade-10-english-starting-diagnostic",
      title: "English starting diagnostic",
      subject: "English",
      subjectId: catalogue.subjectId,
      gradeLevel: "grade_10",
      durationMinutes: 30,
      totalMarks: 12,
      boardId: catalogue.boardId,
      curriculumVersionId: catalogue.curriculumVersionId,
      currentVersionNumber: 1,
      status: "draft",
      type: "diagnostic",
    })
    .onConflictDoUpdate({
      target: assessments.slug,
      set: {
        boardId: catalogue.boardId,
        curriculumVersionId: catalogue.curriculumVersionId,
        currentVersionNumber: 1,
        durationMinutes: 30,
        gradeLevel: "grade_10",
        subject: "English",
        subjectId: catalogue.subjectId,
        title: "English starting diagnostic",
        totalMarks: 12,
        type: "diagnostic",
        updatedAt: now,
      },
    })
    .returning({ id: assessments.id });

  await db
    .insert(assessmentVersions)
    .values({
      assessmentId: assessment.id,
      boardId: catalogue.boardId,
      curriculumVersionId: catalogue.curriculumVersionId,
      durationMinutes: 30,
      gradeLevel: "grade_10",
      status: "draft",
      subjectId: catalogue.subjectId,
      title: "English starting diagnostic",
      totalMarks: 12,
      type: "diagnostic",
      versionNumber: 1,
    })
    .onConflictDoNothing({ target: [assessmentVersions.assessmentId, assessmentVersions.versionNumber] });
  const [assessmentVersion] = await db
    .select({ id: assessmentVersions.id })
    .from(assessmentVersions)
    .where(and(eq(assessmentVersions.assessmentId, assessment.id), eq(assessmentVersions.versionNumber, 1)))
    .limit(1);
  if (!assessmentVersion) throw new Error("The pilot assessment version could not be created.");

  const skillIds = new Map<string, string>();
  for (const skill of pilotSkills) {
    const [savedSkill] = await db
      .insert(skills)
      .values(skill)
      .onConflictDoUpdate({
        target: skills.code,
        set: { name: skill.name, description: skill.description, updatedAt: now },
      })
      .returning({ id: skills.id, code: skills.code });
    skillIds.set(savedSkill.code, savedSkill.id);
  }

  for (const item of pilotQuestions) {
    await db
      .insert(questions)
      .values({
        id: item.id,
        assessmentId: assessment.id,
        position: item.position,
        section: item.section,
        type: item.type,
        prompt: item.prompt,
        context: item.context,
        options: item.options,
        correctAnswer: item.correctAnswer,
        marks: item.marks,
      })
      .onConflictDoNothing({ target: [questions.assessmentId, questions.position] });
    const [savedQuestion] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.assessmentId, assessment.id), eq(questions.position, item.position)))
      .limit(1);
    if (!savedQuestion) throw new Error(`Missing pilot question at position ${item.position}.`);

    const skillId = skillIds.get(item.skillCode);
    if (!skillId) throw new Error(`Missing pilot skill: ${item.skillCode}`);

    await db
      .insert(questionSkills)
      .values({ questionId: savedQuestion.id, skillId, weight: 100 })
      .onConflictDoUpdate({
        target: [questionSkills.questionId, questionSkills.skillId],
        set: { weight: 100 },
      });

    const canonicalOptions = item.options?.map((label, index) => ({
      id: `option-${String.fromCharCode(97 + index)}`,
      label,
    }));
    const correctOptionId = canonicalOptions?.find((option) => option.label === item.correctAnswer)?.id;
    const questionCode = `pilot-${item.position}-${item.skillCode}`;
    const [questionItem] = await db
      .insert(questionItems)
      .values({
        code: questionCode,
        currentRevisionNumber: 1,
        defaultMarks: item.marks,
        difficulty: item.difficulty,
        format: item.format,
        id: savedQuestion.id,
        legacyQuestionId: savedQuestion.id,
        responseType: item.type,
        status: "published",
      })
      .onConflictDoUpdate({
        target: questionItems.code,
        set: {
          defaultMarks: item.marks,
          difficulty: item.difficulty,
          format: item.format,
          legacyQuestionId: savedQuestion.id,
          responseType: item.type,
          status: "published",
          updatedAt: now,
        },
      })
      .returning({ id: questionItems.id });

    await db
      .insert(questionRevisions)
      .values({
        answerKey: correctOptionId ? { correctOptionId } : { guidance: item.explanation },
        context: item.context,
        difficulty: item.difficulty,
        explanation: item.explanation,
        format: item.format,
        markingScheme: item.markingScheme,
        marks: item.marks,
        options: canonicalOptions,
        prompt: item.prompt,
        questionItemId: questionItem.id,
        responseType: item.type,
        revisionNumber: 1,
        status: "draft",
      })
      .onConflictDoNothing({ target: [questionRevisions.questionItemId, questionRevisions.revisionNumber] });
    const [revision] = await db
      .select({ id: questionRevisions.id })
      .from(questionRevisions)
      .where(and(eq(questionRevisions.questionItemId, questionItem.id), eq(questionRevisions.revisionNumber, 1)))
      .limit(1);
    if (!revision) throw new Error(`Missing pilot question revision: ${questionCode}`);

    await db
      .insert(questionRevisionSkills)
      .values({ questionRevisionId: revision.id, skillId, weight: 100 })
      .onConflictDoNothing({
        target: [questionRevisionSkills.questionRevisionId, questionRevisionSkills.skillId],
      });
    await db
      .insert(questionRevisionCurriculumVersions)
      .values({ questionRevisionId: revision.id, curriculumVersionId: catalogue.curriculumVersionId })
      .onConflictDoNothing({
        target: [
          questionRevisionCurriculumVersions.questionRevisionId,
          questionRevisionCurriculumVersions.curriculumVersionId,
        ],
      });

    const curriculumUnitId = catalogue.unitIds.get(item.unitCode);
    if (!curriculumUnitId) throw new Error(`Missing pilot curriculum unit: ${item.unitCode}`);
    await db
      .insert(questionRevisionCurriculumUnits)
      .values({ curriculumUnitId, isPrimary: true, questionRevisionId: revision.id })
      .onConflictDoNothing({
        target: [
          questionRevisionCurriculumUnits.questionRevisionId,
          questionRevisionCurriculumUnits.curriculumUnitId,
        ],
      });

    for (const tagId of catalogue.tagIds.values()) {
      await db
        .insert(questionRevisionTags)
        .values({ questionRevisionId: revision.id, tagId })
        .onConflictDoNothing({
          target: [questionRevisionTags.questionRevisionId, questionRevisionTags.tagId],
        });
    }

    await db
      .insert(assessmentQuestions)
      .values({
        assessmentVersionId: assessmentVersion.id,
        marks: item.marks,
        position: item.position,
        questionRevisionId: revision.id,
        section: item.section,
      })
      .onConflictDoNothing({
        target: [assessmentQuestions.assessmentVersionId, assessmentQuestions.position],
      });

    await db
      .update(questionRevisions)
      .set({ publishedAt: now, status: "published", updatedAt: now })
      .where(and(eq(questionRevisions.id, revision.id), eq(questionRevisions.status, "draft")));
  }

  await db
    .update(assessmentVersions)
    .set({ publishedAt: now, status: "published", updatedAt: now })
    .where(and(eq(assessmentVersions.id, assessmentVersion.id), eq(assessmentVersions.status, "draft")));
  await db
    .update(assessments)
    .set({ publishedAt: now, status: "published", updatedAt: now })
    .where(eq(assessments.id, assessment.id));

  return assessment.id;
}
