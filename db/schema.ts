import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  authProviderId: varchar("auth_provider_id", { length: 160 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  role: userRole("role").default("student").notNull(),
  gradeLevel: gradeLevel("grade_level"),
  board: varchar("board", { length: 120 }),
  schoolName: varchar("school_name", { length: 200 }),
  profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
  lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

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

export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 80 }).default("English").notNull(),
  gradeLevel: gradeLevel("grade_level").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  totalMarks: integer("total_marks").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  ...timestamps,
});

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

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
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
    index("attempts_student_idx").on(table.studentId),
    index("attempts_assessment_idx").on(table.assessmentId),
    index("attempts_status_idx").on(table.status),
  ],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => attempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
    response: text("response"),
    selectedOption: text("selected_option"),
    awardedMarks: integer("awarded_marks"),
    isAutoMarked: boolean("is_auto_marked").default(false).notNull(),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("answers_attempt_question_unique").on(table.attemptId, table.questionId),
    index("answers_attempt_idx").on(table.attemptId),
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
