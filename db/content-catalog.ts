import "server-only";

import { educationBoardCatalogue } from "@/lib/education-boards";
import { getDb } from "./index";
import {
  boardLevels,
  boards,
  curriculumUnits,
  curriculumVersions,
  subjects,
  tags,
} from "./schema";

export const PILOT_BOARD_CODE = "pk_fbise";
export const ENGLISH_SUBJECT_CODE = "english";
export const PILOT_CURRICULUM_CODE = "pk-fbise-grade-10-english-pilot-v1";

const pilotUnits = [
  { code: "language-foundations", title: "Language foundations", position: 1 },
  { code: "reading-comprehension", title: "Reading comprehension", position: 2 },
  { code: "extended-writing", title: "Extended writing", position: 3 },
] as const;

const pilotTags = [
  { code: "starting-diagnostic", name: "Starting diagnostic", category: "assessment" },
  { code: "pilot-v1", name: "Pilot v1", category: "release" },
] as const;

export async function ensurePilotContentCatalogue() {
  const db = getDb();
  const now = new Date();
  const boardDefinition = educationBoardCatalogue.find((board) => board.code === PILOT_BOARD_CODE);
  if (!boardDefinition) throw new Error("The pilot board is missing from the education-board catalogue.");

  const [board] = await db
    .insert(boards)
    .values({
      code: boardDefinition.code,
      name: boardDefinition.name,
      shortName: boardDefinition.shortName,
      region: boardDefinition.region,
      systemType: boardDefinition.systemType,
      sourceUrl: boardDefinition.sourceUrl,
      sortOrder: boardDefinition.sortOrder,
    })
    .onConflictDoUpdate({
      target: boards.code,
      set: {
        isActive: true,
        name: boardDefinition.name,
        region: boardDefinition.region,
        shortName: boardDefinition.shortName,
        sourceUrl: boardDefinition.sourceUrl,
        sortOrder: boardDefinition.sortOrder,
        systemType: boardDefinition.systemType,
        updatedAt: now,
      },
    })
    .returning({ id: boards.id });

  for (const level of boardDefinition.gradeLevels) {
    await db
      .insert(boardLevels)
      .values({ boardId: board.id, gradeLevel: level })
      .onConflictDoNothing({ target: [boardLevels.boardId, boardLevels.gradeLevel] });
  }

  const [subject] = await db
    .insert(subjects)
    .values({ code: ENGLISH_SUBJECT_CODE, name: "English" })
    .onConflictDoUpdate({
      target: subjects.code,
      set: { isActive: true, name: "English", updatedAt: now },
    })
    .returning({ id: subjects.id });

  const [curriculum] = await db
    .insert(curriculumVersions)
    .values({
      boardId: board.id,
      code: PILOT_CURRICULUM_CODE,
      description: "Compatibility alignment for the original TestBench Grade 10 English diagnostic.",
      gradeLevel: "grade_10",
      status: "active",
      subjectId: subject.id,
      title: "FBISE Grade 10 English pilot alignment",
      versionLabel: "pilot-v1",
    })
    .onConflictDoUpdate({
      target: curriculumVersions.code,
      set: {
        boardId: board.id,
        description: "Compatibility alignment for the original TestBench Grade 10 English diagnostic.",
        gradeLevel: "grade_10",
        status: "active",
        subjectId: subject.id,
        title: "FBISE Grade 10 English pilot alignment",
        updatedAt: now,
        versionLabel: "pilot-v1",
      },
    })
    .returning({ id: curriculumVersions.id });

  const unitIds = new Map<string, string>();
  for (const unit of pilotUnits) {
    const [savedUnit] = await db
      .insert(curriculumUnits)
      .values({
        code: unit.code,
        curriculumVersionId: curriculum.id,
        position: unit.position,
        title: unit.title,
        type: "chapter",
      })
      .onConflictDoUpdate({
        target: [curriculumUnits.curriculumVersionId, curriculumUnits.code],
        set: { isActive: true, position: unit.position, title: unit.title, updatedAt: now },
      })
      .returning({ code: curriculumUnits.code, id: curriculumUnits.id });
    unitIds.set(savedUnit.code, savedUnit.id);
  }

  const tagIds = new Map<string, string>();
  for (const tag of pilotTags) {
    const [savedTag] = await db
      .insert(tags)
      .values(tag)
      .onConflictDoUpdate({
        target: tags.code,
        set: { category: tag.category, isActive: true, name: tag.name, updatedAt: now },
      })
      .returning({ code: tags.code, id: tags.id });
    tagIds.set(savedTag.code, savedTag.id);
  }

  return {
    boardId: board.id,
    curriculumVersionId: curriculum.id,
    subjectId: subject.id,
    tagIds,
    unitIds,
  };
}
