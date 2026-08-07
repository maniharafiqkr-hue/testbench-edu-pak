import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "student",
  "teacher",
  "question_author",
  "reviewer",
  "academic_lead",
  "admin",
]);
export const gradeLevel = pgEnum("grade_level", ["grade_9", "grade_10", "o_level", "a_level"]);
export const invitationStatus = pgEnum("invitation_status", ["pending", "accepted", "revoked", "expired"]);
export const questionType = pgEnum("question_type", ["multiple_choice", "short_answer", "extended_writing"]);
export const attemptStatus = pgEnum("attempt_status", ["in_progress", "submitted", "awaiting_review", "returned"]);
export const reviewStatus = pgEnum("review_status", ["pending", "in_review", "returned"]);
export const planStatus = pgEnum("plan_status", ["active", "completed", "archived"]);
export const repairItemKind = pgEnum("repair_item_kind", ["review", "practice", "rewrite", "retest"]);
export const boardSystemType = pgEnum("board_system_type", [
  "public_bise",
  "public_secondary_board",
  "public_university_exam_board",
  "private_exam_board",
  "public_open_distance_awarder",
  "foreign_qab",
]);
export const curriculumStatus = pgEnum("curriculum_status", ["draft", "active", "retired"]);
export const curriculumUnitType = pgEnum("curriculum_unit_type", ["chapter", "topic"]);
export const contentStatus = pgEnum("content_status", [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
]);
export const questionDifficulty = pgEnum("question_difficulty", ["easy", "moderate", "difficult"]);
export const questionFormat = pgEnum("question_format", [
  "mcq",
  "short_answer",
  "board_long",
  "comprehension",
  "essay",
]);
export const assessmentType = pgEnum("assessment_type", [
  "diagnostic",
  "chapter_test",
  "board_mock",
  "practice",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 220 }).notNull(),
    shortName: varchar("short_name", { length: 100 }).notNull(),
    region: varchar("region", { length: 120 }).notNull(),
    systemType: boardSystemType("system_type").notNull(),
    sourceUrl: text("source_url"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("boards_region_idx").on(table.region),
    index("boards_system_type_idx").on(table.systemType),
    index("boards_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

export const boardLevels = pgTable(
  "board_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    gradeLevel: gradeLevel("grade_level").notNull(),
  },
  (table) => [
    uniqueIndex("board_levels_pair_unique").on(table.boardId, table.gradeLevel),
    index("board_levels_grade_idx").on(table.gradeLevel),
  ],
);

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProviderId: varchar("auth_provider_id", { length: 160 }).unique(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    role: userRole("role").default("student").notNull(),
    gradeLevel: gradeLevel("grade_level"),
    board: varchar("board", { length: 120 }),
    boardId: uuid("board_id").references(() => boards.id, { onDelete: "restrict" }),
    schoolName: varchar("school_name", { length: 200 }),
    isSelfStudy: boolean("is_self_study").default(false).notNull(),
    profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
    lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("users_board_idx").on(table.boardId),
    foreignKey({
      name: "users_board_grade_fk",
      columns: [table.boardId, table.gradeLevel],
      foreignColumns: [boardLevels.boardId, boardLevels.gradeLevel],
    }).onDelete("restrict"),
  ],
);

export const curriculumVersions = pgTable(
  "curriculum_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 140 }).notNull().unique(),
    boardId: uuid("board_id").notNull().references(() => boards.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    gradeLevel: gradeLevel("grade_level").notNull(),
    versionLabel: varchar("version_label", { length: 80 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    sourceUrl: text("source_url"),
    status: curriculumStatus("status").default("draft").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("curriculum_versions_identity_unique").on(
      table.boardId,
      table.subjectId,
      table.gradeLevel,
      table.versionLabel,
    ),
    index("curriculum_versions_lookup_idx").on(table.boardId, table.gradeLevel, table.status),
    uniqueIndex("curriculum_versions_snapshot_identity_unique").on(
      table.id,
      table.boardId,
      table.subjectId,
      table.gradeLevel,
    ),
    foreignKey({
      name: "curriculum_versions_board_grade_fk",
      columns: [table.boardId, table.gradeLevel],
      foreignColumns: [boardLevels.boardId, boardLevels.gradeLevel],
    }).onDelete("restrict"),
  ],
);

export const curriculumUnits = pgTable(
  "curriculum_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumVersionId: uuid("curriculum_version_id").notNull().references(() => curriculumVersions.id, { onDelete: "cascade" }),
    parentUnitId: uuid("parent_unit_id").references((): AnyPgColumn => curriculumUnits.id, { onDelete: "cascade" }),
    type: curriculumUnitType("type").notNull(),
    code: varchar("code", { length: 120 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description"),
    position: integer("position").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("curriculum_units_code_unique").on(table.curriculumVersionId, table.code),
    unique("curriculum_units_position_unique")
      .on(table.curriculumVersionId, table.parentUnitId, table.position)
      .nullsNotDistinct(),
    index("curriculum_units_parent_idx").on(table.parentUnitId),
  ],
);

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    role: userRole("role").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    status: invitationStatus("status").default("pending").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("staff_invitations_email_idx").on(table.email),
    index("staff_invitations_status_idx").on(table.status),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: varchar("entity_id", { length: 160 }),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_events_actor_idx").on(table.actorUserId),
    index("audit_events_action_idx").on(table.action),
    index("audit_events_created_idx").on(table.createdAt),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    subject: varchar("subject", { length: 80 }).default("English").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "restrict" }),
    gradeLevel: gradeLevel("grade_level").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    totalMarks: integer("total_marks").notNull(),
    type: assessmentType("type").default("practice").notNull(),
    boardId: uuid("board_id").references(() => boards.id, { onDelete: "restrict" }),
    curriculumVersionId: uuid("curriculum_version_id").references(() => curriculumVersions.id, { onDelete: "restrict" }),
    creatorId: uuid("creator_id").references(() => users.id, { onDelete: "set null" }),
    status: contentStatus("status").default("draft").notNull(),
    instructions: text("instructions"),
    blueprint: jsonb("blueprint").$type<AssessmentBlueprint>(),
    currentVersionNumber: integer("current_version_number").default(1).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("assessments_board_idx").on(table.boardId),
    index("assessments_curriculum_idx").on(table.curriculumVersionId),
    foreignKey({
      name: "assessments_board_grade_fk",
      columns: [table.boardId, table.gradeLevel],
      foreignColumns: [boardLevels.boardId, boardLevels.gradeLevel],
    }).onDelete("restrict"),
    foreignKey({
      name: "assessments_curriculum_identity_fk",
      columns: [table.curriculumVersionId, table.boardId, table.subjectId, table.gradeLevel],
      foreignColumns: [
        curriculumVersions.id,
        curriculumVersions.boardId,
        curriculumVersions.subjectId,
        curriculumVersions.gradeLevel,
      ],
    }).onDelete("restrict"),
    check(
      "assessments_publication_state_check",
      sql`(${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL)
        AND (${table.publishedAt} IS NULL OR ${table.status} IN ('published', 'archived'))`,
    ),
  ],
);

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: varchar("section", { length: 120 }).notNull(),
    type: questionType("type").notNull(),
    prompt: text("prompt").notNull(),
    context: text("context"),
    options: jsonb("options").$type<string[]>(),
    correctAnswer: text("correct_answer"),
    marks: integer("marks").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("questions_assessment_position_unique").on(table.assessmentId, table.position),
    index("questions_assessment_idx").on(table.assessmentId),
  ],
);

export type QuestionOption = {
  id: string;
  label: string;
};

export type QuestionAnswerKey = {
  correctOptionId?: string;
  acceptedAnswers?: string[];
  guidance?: string;
};

export type QuestionMarkingScheme = {
  modelAnswer?: string;
  criteria?: Array<{
    id: string;
    label: string;
    description?: string;
    marks: number;
  }>;
};

export type AssessmentBlueprint = {
  sections?: Array<{
    title: string;
    marks: number;
    questionCount?: number;
    difficultyMix?: Partial<Record<"easy" | "moderate" | "difficult", number>>;
  }>;
  coverageNotes?: string;
};

export const questionItems = pgTable(
  "question_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 140 }).notNull().unique(),
    legacyQuestionId: uuid("legacy_question_id").unique().references(() => questions.id, { onDelete: "set null" }),
    responseType: questionType("response_type").notNull(),
    format: questionFormat("format").notNull(),
    difficulty: questionDifficulty("difficulty").default("moderate").notNull(),
    defaultMarks: integer("default_marks").notNull(),
    status: contentStatus("status").default("draft").notNull(),
    currentRevisionNumber: integer("current_revision_number").default(1).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("question_items_status_idx").on(table.status),
    index("question_items_difficulty_idx").on(table.difficulty),
    index("question_items_response_type_idx").on(table.responseType),
  ],
);

export const questionRevisions = pgTable(
  "question_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionItemId: uuid("question_item_id").notNull().references(() => questionItems.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    responseType: questionType("response_type").notNull(),
    format: questionFormat("format").notNull(),
    difficulty: questionDifficulty("difficulty").notNull(),
    prompt: text("prompt").notNull(),
    context: text("context"),
    options: jsonb("options").$type<QuestionOption[]>(),
    answerKey: jsonb("answer_key").$type<QuestionAnswerKey>(),
    explanation: text("explanation"),
    markingScheme: jsonb("marking_scheme").$type<QuestionMarkingScheme>(),
    marks: integer("marks").notNull(),
    status: contentStatus("status").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewNotes: text("review_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("question_revisions_number_unique").on(table.questionItemId, table.revisionNumber),
    index("question_revisions_status_idx").on(table.status),
    check(
      "question_revisions_publication_state_check",
      sql`(${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL)
        AND (${table.publishedAt} IS NULL OR ${table.status} IN ('published', 'archived'))`,
    ),
  ],
);

export const questionSkills = pgTable(
  "question_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
    weight: integer("weight").default(100).notNull(),
  },
  (table) => [uniqueIndex("question_skills_pair_unique").on(table.questionId, table.skillId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 80 }).default("editorial").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("tags_category_idx").on(table.category)],
);

// Classifications are revision-scoped so published attempts retain the exact
// skills, tags, and curriculum coverage used when they were marked.
export const questionRevisionSkills = pgTable(
  "question_revision_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionRevisionId: uuid("question_revision_id").notNull().references(() => questionRevisions.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
    weight: integer("weight").default(100).notNull(),
  },
  (table) => [
    uniqueIndex("question_revision_skills_pair_unique").on(table.questionRevisionId, table.skillId),
    index("question_revision_skills_skill_idx").on(table.skillId),
  ],
);

export const questionRevisionTags = pgTable(
  "question_revision_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionRevisionId: uuid("question_revision_id").notNull().references(() => questionRevisions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("question_revision_tags_pair_unique").on(table.questionRevisionId, table.tagId),
    index("question_revision_tags_tag_idx").on(table.tagId),
  ],
);

export const questionRevisionCurriculumVersions = pgTable(
  "question_revision_curriculum_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionRevisionId: uuid("question_revision_id").notNull().references(() => questionRevisions.id, { onDelete: "cascade" }),
    curriculumVersionId: uuid("curriculum_version_id").notNull().references(() => curriculumVersions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("question_revision_curriculum_versions_pair_unique").on(
      table.questionRevisionId,
      table.curriculumVersionId,
    ),
    index("question_revision_curriculum_versions_curriculum_idx").on(table.curriculumVersionId),
  ],
);

export const questionRevisionCurriculumUnits = pgTable(
  "question_revision_curriculum_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionRevisionId: uuid("question_revision_id").notNull().references(() => questionRevisions.id, { onDelete: "cascade" }),
    curriculumUnitId: uuid("curriculum_unit_id").notNull().references(() => curriculumUnits.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("question_revision_curriculum_units_pair_unique").on(
      table.questionRevisionId,
      table.curriculumUnitId,
    ),
    index("question_revision_curriculum_units_unit_idx").on(table.curriculumUnitId),
  ],
);

export const assessmentVersions = pgTable(
  "assessment_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    type: assessmentType("type").notNull(),
    boardId: uuid("board_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    gradeLevel: gradeLevel("grade_level").notNull(),
    curriculumVersionId: uuid("curriculum_version_id").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    totalMarks: integer("total_marks").notNull(),
    instructions: text("instructions"),
    blueprint: jsonb("blueprint").$type<AssessmentBlueprint>(),
    status: contentStatus("status").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("assessment_versions_number_unique").on(table.assessmentId, table.versionNumber),
    uniqueIndex("assessment_versions_id_assessment_unique").on(table.id, table.assessmentId),
    index("assessment_versions_status_idx").on(table.status),
    index("assessment_versions_curriculum_idx").on(table.curriculumVersionId),
    foreignKey({
      name: "assessment_versions_curriculum_identity_fk",
      columns: [table.curriculumVersionId, table.boardId, table.subjectId, table.gradeLevel],
      foreignColumns: [
        curriculumVersions.id,
        curriculumVersions.boardId,
        curriculumVersions.subjectId,
        curriculumVersions.gradeLevel,
      ],
    }).onDelete("restrict"),
    check(
      "assessment_versions_publication_state_check",
      sql`(${table.status} <> 'published' OR ${table.publishedAt} IS NOT NULL)
        AND (${table.publishedAt} IS NULL OR ${table.status} IN ('published', 'archived'))`,
    ),
  ],
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentVersionId: uuid("assessment_version_id").notNull().references(() => assessmentVersions.id, { onDelete: "cascade" }),
    questionRevisionId: uuid("question_revision_id").notNull().references(() => questionRevisions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    section: varchar("section", { length: 120 }).notNull(),
    marks: integer("marks").notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("assessment_questions_position_unique").on(table.assessmentVersionId, table.position),
    uniqueIndex("assessment_questions_revision_unique").on(table.assessmentVersionId, table.questionRevisionId),
    uniqueIndex("assessment_questions_id_version_unique").on(table.id, table.assessmentVersionId),
    uniqueIndex("assessment_questions_id_revision_unique").on(table.id, table.questionRevisionId),
    index("assessment_questions_revision_idx").on(table.questionRevisionId),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
    assessmentVersionId: uuid("assessment_version_id").notNull(),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    status: attemptStatus("status").default("in_progress").notNull(),
    objectiveScore: integer("objective_score"),
    finalScore: integer("final_score"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("attempts_id_version_unique").on(table.id, table.assessmentVersionId),
    index("attempts_student_idx").on(table.studentId),
    index("attempts_assessment_idx").on(table.assessmentId),
    index("attempts_assessment_version_idx").on(table.assessmentVersionId),
    index("attempts_status_idx").on(table.status),
    foreignKey({
      name: "attempts_assessment_version_consistency_fk",
      columns: [table.assessmentVersionId, table.assessmentId],
      foreignColumns: [assessmentVersions.id, assessmentVersions.assessmentId],
    }).onDelete("restrict"),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull(),
    assessmentVersionId: uuid("assessment_version_id").notNull(),
    assessmentQuestionId: uuid("assessment_question_id").notNull(),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "restrict" }),
    questionRevisionId: uuid("question_revision_id").notNull(),
    response: text("response"),
    selectedOption: text("selected_option"),
    awardedMarks: integer("awarded_marks"),
    isAutoMarked: boolean("is_auto_marked").default(false).notNull(),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("answers_attempt_assessment_question_unique").on(table.attemptId, table.assessmentQuestionId),
    uniqueIndex("answers_attempt_legacy_question_unique")
      .on(table.attemptId, table.questionId)
      .where(sql`${table.questionId} IS NOT NULL`),
    index("answers_attempt_idx").on(table.attemptId),
    index("answers_assessment_question_idx").on(table.assessmentQuestionId),
    foreignKey({
      name: "answers_attempt_version_fk",
      columns: [table.attemptId, table.assessmentVersionId],
      foreignColumns: [attempts.id, attempts.assessmentVersionId],
    }).onDelete("cascade"),
    foreignKey({
      name: "answers_assessment_question_version_fk",
      columns: [table.assessmentQuestionId, table.assessmentVersionId],
      foreignColumns: [assessmentQuestions.id, assessmentQuestions.assessmentVersionId],
    }).onDelete("restrict"),
    foreignKey({
      name: "answers_assessment_question_revision_fk",
      columns: [table.assessmentQuestionId, table.questionRevisionId],
      foreignColumns: [assessmentQuestions.id, assessmentQuestions.questionRevisionId],
    }).onDelete("restrict"),
  ],
);

export const attemptCurriculumUnitResults = pgTable(
  "attempt_curriculum_unit_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    curriculumUnitId: uuid("curriculum_unit_id").notNull().references(() => curriculumUnits.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    maximumScore: integer("maximum_score").notNull(),
    level: varchar("level", { length: 40 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("attempt_curriculum_unit_results_pair_unique").on(table.attemptId, table.curriculumUnitId),
    index("attempt_curriculum_unit_results_attempt_idx").on(table.attemptId),
  ],
);

export const writingReviews = pgTable(
  "writing_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    answerId: uuid("answer_id").notNull().references(() => answers.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    status: reviewStatus("status").default("pending").notNull(),
    strength: text("strength"),
    priorityImprovement: text("priority_improvement"),
    rewriteInstruction: text("rewrite_instruction"),
    rubric: jsonb("rubric").$type<Record<string, number>>(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("writing_reviews_answer_unique").on(table.answerId),
    index("writing_reviews_status_idx").on(table.status),
  ],
);

export const attemptSkillResults = pgTable(
  "attempt_skill_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    maximumScore: integer("maximum_score").notNull(),
    level: varchar("level", { length: 40 }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("attempt_skill_results_pair_unique").on(table.attemptId, table.skillId)],
);

export const repairPlans = pgTable(
  "repair_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceAttemptId: uuid("source_attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    status: planStatus("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repair_plans_attempt_unique").on(table.sourceAttemptId),
    index("repair_plans_student_idx").on(table.studentId),
  ],
);

export const repairPlanItems = pgTable(
  "repair_plan_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id").notNull().references(() => repairPlans.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").references(() => skills.id, { onDelete: "set null" }),
    sourceAnswerId: uuid("source_answer_id").references(() => answers.id, { onDelete: "set null" }),
    position: integer("position").notNull(),
    kind: repairItemKind("kind").default("review").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    instructions: text("instructions").notNull(),
    content: jsonb("content").$type<{
      prompt?: string;
      context?: string;
      options?: string[];
      correctAnswer?: string;
      explanation?: string;
    }>(),
    response: text("response"),
    selectedOption: text("selected_option"),
    awardedMarks: integer("awarded_marks"),
    maximumMarks: integer("maximum_marks").default(1).notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    unlocksAt: timestamp("unlocks_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("repair_plan_items_position_unique").on(table.planId, table.position)],
);

export const repairItemReviews = pgTable(
  "repair_item_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemId: uuid("item_id").notNull().references(() => repairPlanItems.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    status: reviewStatus("status").default("pending").notNull(),
    achieved: boolean("achieved"),
    feedback: text("feedback"),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("repair_item_reviews_item_unique").on(table.itemId),
    index("repair_item_reviews_status_idx").on(table.status),
  ],
);

export const skillProgressEvents = pgTable(
  "skill_progress_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
    referenceKey: varchar("reference_key", { length: 180 }).notNull(),
    source: varchar("source", { length: 60 }).notNull(),
    score: integer("score").notNull(),
    maximumScore: integer("maximum_score").notNull(),
    level: varchar("level", { length: 40 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("skill_progress_events_reference_unique").on(table.referenceKey),
    index("skill_progress_events_student_idx").on(table.studentId),
    index("skill_progress_events_skill_idx").on(table.skillId),
  ],
);
