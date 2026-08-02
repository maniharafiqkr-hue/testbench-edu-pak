import "server-only";

import { getDb } from "./index";
import { assessments, questions, questionSkills, skills } from "./schema";

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
  },
  {
    id: "a79062cc-e088-47dd-9b77-b5173d2d94e0",
    position: 2,
    section: "Vocabulary",
    type: "multiple_choice",
    prompt: "In the sentence below, what does ‘reluctant’ most nearly mean?",
    context:
      "Although Hira understood the value of the opportunity, she was reluctant to speak before the large audience.",
    options: ["Eager", "Unwilling", "Unable", "Prepared"],
    correctAnswer: "Unwilling",
    marks: 1,
    skillCode: "vocabulary-context",
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
  },
  {
    id: "1b13152e-560f-4edf-bd8b-2181db9c97d3",
    position: 4,
    section: "Comprehension",
    type: "short_answer",
    prompt:
      "Why did the community library become valuable to the neighbourhood? Support your answer with one detail from the passage.",
    context:
      "For years, the empty building at the corner of Amin Street had been ignored. A group of students persuaded local residents to turn it into a small library. Families donated books, retired teachers volunteered twice a week, and younger children finally had a quiet place to read after school. Within months, the library had become more than a room of books; it was a meeting place where neighbours shared skills and solved problems together.",
    marks: 3,
    skillCode: "comprehension-evidence",
  },
  {
    id: "ca0d4eed-afd5-4d89-9335-1b1369254e78",
    position: 5,
    section: "Narrative writing",
    type: "extended_writing",
    prompt:
      "Write a narrative of 100–125 words beginning with: ‘I knew I had only one chance to make things right.’",
    context:
      "Your narrative should include a clear problem, logical sequence, description, and conclusion. You may plan briefly on paper before writing.",
    marks: 6,
    skillCode: "narrative-organisation",
  },
];

export async function ensurePilotAssessment() {
  const db = getDb();
  const now = new Date();

  const [assessment] = await db
    .insert(assessments)
    .values({
      id: PILOT_ASSESSMENT_ID,
      slug: "fbise-grade-10-english-starting-diagnostic",
      title: "English starting diagnostic",
      subject: "English",
      gradeLevel: "grade_10",
      durationMinutes: 30,
      totalMarks: 12,
      isPublished: true,
    })
    .onConflictDoUpdate({
      target: assessments.slug,
      set: {
        title: "English starting diagnostic",
        subject: "English",
        gradeLevel: "grade_10",
        durationMinutes: 30,
        totalMarks: 12,
        isPublished: true,
        updatedAt: now,
      },
    })
    .returning({ id: assessments.id });

  const skillIds = new Map<string, string>();
  for (const skill of pilotSkills) {
    const [savedSkill] = await db
      .insert(skills)
      .values(skill)
      .onConflictDoUpdate({
        target: skills.code,
        set: {
          name: skill.name,
          description: skill.description,
          updatedAt: now,
        },
      })
      .returning({ id: skills.id, code: skills.code });
    skillIds.set(savedSkill.code, savedSkill.id);
  }

  for (const item of pilotQuestions) {
    const [savedQuestion] = await db
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
      .onConflictDoUpdate({
        target: [questions.assessmentId, questions.position],
        set: {
          section: item.section,
          type: item.type,
          prompt: item.prompt,
          context: item.context,
          options: item.options,
          correctAnswer: item.correctAnswer,
          marks: item.marks,
          updatedAt: now,
        },
      })
      .returning({ id: questions.id });

    const skillId = skillIds.get(item.skillCode);
    if (!skillId) {
      throw new Error(`Missing pilot skill: ${item.skillCode}`);
    }

    await db
      .insert(questionSkills)
      .values({ questionId: savedQuestion.id, skillId, weight: 100 })
      .onConflictDoUpdate({
        target: [questionSkills.questionId, questionSkills.skillId],
        set: { weight: 100 },
      });
  }

  return assessment.id;
}
