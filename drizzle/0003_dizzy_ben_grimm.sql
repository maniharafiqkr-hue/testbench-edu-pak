CREATE TYPE "public"."assessment_type" AS ENUM('diagnostic', 'chapter_test', 'board_mock', 'practice');--> statement-breakpoint
CREATE TYPE "public"."board_system_type" AS ENUM('public_bise', 'public_secondary_board', 'public_university_exam_board', 'private_exam_board', 'public_open_distance_awarder', 'foreign_qab');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."curriculum_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."curriculum_unit_type" AS ENUM('chapter', 'topic');--> statement-breakpoint
CREATE TYPE "public"."question_difficulty" AS ENUM('easy', 'moderate', 'difficult');--> statement-breakpoint
CREATE TYPE "public"."question_format" AS ENUM('mcq', 'short_answer', 'board_long', 'comprehension', 'essay');--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_version_id" uuid NOT NULL,
	"question_revision_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"section" varchar(120) NOT NULL,
	"marks" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"total_marks" integer NOT NULL,
	"instructions" text,
	"blueprint" jsonb,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid,
	"published_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_curriculum_unit_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"curriculum_unit_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"maximum_score" integer NOT NULL,
	"level" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"grade_level" "grade_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(220) NOT NULL,
	"short_name" varchar(100) NOT NULL,
	"region" varchar(120) NOT NULL,
	"system_type" "board_system_type" NOT NULL,
	"source_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "curriculum_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"parent_unit_id" uuid,
	"type" "curriculum_unit_type" NOT NULL,
	"code" varchar(120) NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(140) NOT NULL,
	"board_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"grade_level" "grade_level" NOT NULL,
	"version_label" varchar(80) NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"source_url" text,
	"status" "curriculum_status" DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"created_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_versions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "question_curriculum_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_item_id" uuid NOT NULL,
	"curriculum_unit_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_item_id" uuid NOT NULL,
	"curriculum_version_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_item_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_item_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(140) NOT NULL,
	"legacy_question_id" uuid,
	"response_type" "question_type" NOT NULL,
	"format" "question_format" NOT NULL,
	"difficulty" "question_difficulty" DEFAULT 'moderate' NOT NULL,
	"default_marks" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"current_revision_number" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_items_code_unique" UNIQUE("code"),
	CONSTRAINT "question_items_legacy_question_id_unique" UNIQUE("legacy_question_id")
);
--> statement-breakpoint
CREATE TABLE "question_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_item_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"prompt" text NOT NULL,
	"context" text,
	"options" jsonb,
	"answer_key" jsonb,
	"explanation" text,
	"marking_scheme" jsonb,
	"marks" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"review_notes" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_item_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" varchar(80) DEFAULT 'editorial' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "question_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "type" "assessment_type" DEFAULT 'practice' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "board_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "curriculum_version_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "creator_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "status" "content_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "blueprint" jsonb;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "current_version_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "assessment_version_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "board_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_self_study" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_version_id_assessment_versions_id_fk" FOREIGN KEY ("assessment_version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_curriculum_unit_results" ADD CONSTRAINT "attempt_curriculum_unit_results_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_curriculum_unit_results" ADD CONSTRAINT "attempt_curriculum_unit_results_curriculum_unit_id_curriculum_units_id_fk" FOREIGN KEY ("curriculum_unit_id") REFERENCES "public"."curriculum_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_levels" ADD CONSTRAINT "board_levels_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_parent_unit_id_curriculum_units_id_fk" FOREIGN KEY ("parent_unit_id") REFERENCES "public"."curriculum_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_curriculum_units" ADD CONSTRAINT "question_curriculum_units_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_curriculum_units" ADD CONSTRAINT "question_curriculum_units_curriculum_unit_id_curriculum_units_id_fk" FOREIGN KEY ("curriculum_unit_id") REFERENCES "public"."curriculum_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_curriculum_versions" ADD CONSTRAINT "question_curriculum_versions_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_curriculum_versions" ADD CONSTRAINT "question_curriculum_versions_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_item_skills" ADD CONSTRAINT "question_item_skills_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_item_skills" ADD CONSTRAINT "question_item_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_items" ADD CONSTRAINT "question_items_legacy_question_id_questions_id_fk" FOREIGN KEY ("legacy_question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_items" ADD CONSTRAINT "question_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_items" ADD CONSTRAINT "question_items_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_item_id_question_items_id_fk" FOREIGN KEY ("question_item_id") REFERENCES "public"."question_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_position_unique" ON "assessment_questions" USING btree ("assessment_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_revision_unique" ON "assessment_questions" USING btree ("assessment_version_id","question_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_versions_number_unique" ON "assessment_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "assessment_versions_status_idx" ON "assessment_versions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_curriculum_unit_results_pair_unique" ON "attempt_curriculum_unit_results" USING btree ("attempt_id","curriculum_unit_id");--> statement-breakpoint
CREATE INDEX "attempt_curriculum_unit_results_attempt_idx" ON "attempt_curriculum_unit_results" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "board_levels_pair_unique" ON "board_levels" USING btree ("board_id","grade_level");--> statement-breakpoint
CREATE INDEX "board_levels_grade_idx" ON "board_levels" USING btree ("grade_level");--> statement-breakpoint
CREATE INDEX "boards_region_idx" ON "boards" USING btree ("region");--> statement-breakpoint
CREATE INDEX "boards_system_type_idx" ON "boards" USING btree ("system_type");--> statement-breakpoint
CREATE INDEX "boards_active_sort_idx" ON "boards" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_units_code_unique" ON "curriculum_units" USING btree ("curriculum_version_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_units_position_unique" ON "curriculum_units" USING btree ("curriculum_version_id","parent_unit_id","position");--> statement-breakpoint
CREATE INDEX "curriculum_units_parent_idx" ON "curriculum_units" USING btree ("parent_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_versions_identity_unique" ON "curriculum_versions" USING btree ("board_id","subject_id","grade_level","version_label");--> statement-breakpoint
CREATE INDEX "curriculum_versions_lookup_idx" ON "curriculum_versions" USING btree ("board_id","grade_level","status");--> statement-breakpoint
CREATE UNIQUE INDEX "question_curriculum_units_pair_unique" ON "question_curriculum_units" USING btree ("question_item_id","curriculum_unit_id");--> statement-breakpoint
CREATE INDEX "question_curriculum_units_unit_idx" ON "question_curriculum_units" USING btree ("curriculum_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_curriculum_versions_pair_unique" ON "question_curriculum_versions" USING btree ("question_item_id","curriculum_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_item_skills_pair_unique" ON "question_item_skills" USING btree ("question_item_id","skill_id");--> statement-breakpoint
CREATE INDEX "question_items_status_idx" ON "question_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "question_items_difficulty_idx" ON "question_items" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "question_items_response_type_idx" ON "question_items" USING btree ("response_type");--> statement-breakpoint
CREATE UNIQUE INDEX "question_revisions_number_unique" ON "question_revisions" USING btree ("question_item_id","revision_number");--> statement-breakpoint
CREATE INDEX "question_revisions_status_idx" ON "question_revisions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "question_tags_pair_unique" ON "question_tags" USING btree ("question_item_id","tag_id");--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category");--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_version_id_assessment_versions_id_fk" FOREIGN KEY ("assessment_version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "boards" ("code", "name", "short_name", "region", "system_type", "source_url", "sort_order") VALUES
	('pk_fbise', 'Federal Board of Intermediate and Secondary Education', 'FBISE', 'Federal / nationwide', 'public_bise', 'https://www.fbise.edu.pk/introduction.php', 10),
	('pk_pb_bise_bahawalpur', 'Board of Intermediate and Secondary Education Bahawalpur', 'BISE Bahawalpur', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 20),
	('pk_pb_bise_dg_khan', 'Board of Intermediate and Secondary Education Dera Ghazi Khan', 'BISE Dera Ghazi Khan', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 30),
	('pk_pb_bise_faisalabad', 'Board of Intermediate and Secondary Education Faisalabad', 'BISE Faisalabad', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 40),
	('pk_pb_bise_gujranwala', 'Board of Intermediate and Secondary Education Gujranwala', 'BISE Gujranwala', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 50),
	('pk_pb_bise_lahore', 'Board of Intermediate and Secondary Education Lahore', 'BISE Lahore', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 60),
	('pk_pb_bise_multan', 'Board of Intermediate and Secondary Education Multan', 'BISE Multan', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 70),
	('pk_pb_bise_rawalpindi', 'Board of Intermediate and Secondary Education Rawalpindi', 'BISE Rawalpindi', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 80),
	('pk_pb_bise_sahiwal', 'Board of Intermediate and Secondary Education Sahiwal', 'BISE Sahiwal', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 90),
	('pk_pb_bise_sargodha', 'Board of Intermediate and Secondary Education Sargodha', 'BISE Sargodha', 'Punjab', 'public_bise', 'https://hed.punjab.gov.pk/boards', 100),
	('pk_kp_bise_abbottabad', 'Board of Intermediate and Secondary Education Abbottabad', 'BISE Abbottabad', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 110),
	('pk_kp_bise_bannu', 'Board of Intermediate and Secondary Education Bannu', 'BISE Bannu', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 120),
	('pk_kp_bise_di_khan', 'Board of Intermediate and Secondary Education Dera Ismail Khan', 'BISE Dera Ismail Khan', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 130),
	('pk_kp_bise_kohat', 'Board of Intermediate and Secondary Education Kohat', 'BISE Kohat', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 140),
	('pk_kp_bise_malakand', 'Board of Intermediate and Secondary Education Malakand', 'BISE Malakand', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 150),
	('pk_kp_bise_mardan', 'Board of Intermediate and Secondary Education Mardan', 'BISE Mardan', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 160),
	('pk_kp_bise_peshawar', 'Board of Intermediate and Secondary Education Peshawar', 'BISE Peshawar', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 170),
	('pk_kp_bise_swat', 'Board of Intermediate and Secondary Education Swat', 'BISE Swat', 'Khyber Pakhtunkhwa', 'public_bise', 'https://ibcc.edu.pk/ibcc-forum-members/', 180),
	('pk_sd_bsek_karachi', 'Board of Secondary Education Karachi', 'BSEK Karachi', 'Sindh', 'public_secondary_board', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 190),
	('pk_sd_bise_hyderabad', 'Board of Intermediate and Secondary Education Hyderabad', 'BISE Hyderabad', 'Sindh', 'public_bise', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 200),
	('pk_sd_bise_sukkur', 'Board of Intermediate and Secondary Education Sukkur', 'BISE Sukkur', 'Sindh', 'public_bise', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 210),
	('pk_sd_bise_larkana', 'Board of Intermediate and Secondary Education Larkana', 'BISE Larkana', 'Sindh', 'public_bise', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 220),
	('pk_sd_bise_mirpurkhas', 'Board of Intermediate and Secondary Education Mirpurkhas', 'BISE Mirpurkhas', 'Sindh', 'public_bise', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 230),
	('pk_sd_bise_shaheed_benazirabad', 'Board of Intermediate and Secondary Education Shaheed Benazirabad', 'BISE Shaheed Benazirabad', 'Sindh', 'public_bise', 'https://universitiesboards.sindh.gov.pk/universitiesinstitutes', 240),
	('pk_ba_bbise_quetta', 'Balochistan Board of Intermediate and Secondary Education Quetta', 'BBISE Quetta', 'Balochistan', 'public_bise', 'https://bbiseqta.edu.pk/Home/About', 250),
	('pk_ajk_bise_mirpur', 'AJK Board of Intermediate and Secondary Education Mirpur', 'AJK BISE Mirpur', 'Azad Jammu and Kashmir', 'public_bise', 'https://ajkbise.net/SchemeofStudies.php', 260),
	('pk_gb_kiu_external', 'Karakoram International University External Examinations', 'KIU Examination Board', 'Gilgit-Baltistan', 'public_university_exam_board', 'https://examinations.kiu.edu.pk/', 270),
	('pk_aku_eb', 'Aga Khan University Examination Board', 'AKU-EB', 'Pakistan (private)', 'private_exam_board', 'https://examinationboard.aku.edu/about-us/Pages/home.aspx', 280),
	('pk_sd_zueb', 'Ziauddin University Examination Board', 'ZUEB', 'Pakistan (private)', 'private_exam_board', 'https://zueb.edu.pk/', 290),
	('pk_aiou', 'Allama Iqbal Open University Secondary School Certificate', 'AIOU SSC', 'Pakistan (distance learning)', 'public_open_distance_awarder', 'https://www.aiou.edu.pk/secondary-school-certificate-matric', 300),
	('intl_cambridge', 'Cambridge International Education', 'Cambridge International', 'International qualifications', 'foreign_qab', 'https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/', 310),
	('intl_city_guilds', 'City & Guilds of London Institute', 'City & Guilds', 'International qualifications', 'foreign_qab', 'https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/', 320),
	('intl_lrn', 'Learning Resource Network', 'LRN', 'International qualifications', 'foreign_qab', 'https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/', 330),
	('intl_oxford_aqa', 'Oxford International AQA Examinations', 'OxfordAQA', 'International qualifications', 'foreign_qab', 'https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/', 340),
	('intl_pearson_edexcel', 'Pearson Education Limited', 'Pearson Edexcel', 'International qualifications', 'foreign_qab', 'https://ibcc.edu.pk/registered-qabs-foreign-examination-boards/', 350)
ON CONFLICT ("code") DO UPDATE SET
	"name" = excluded."name",
	"short_name" = excluded."short_name",
	"region" = excluded."region",
	"system_type" = excluded."system_type",
	"source_url" = excluded."source_url",
	"is_active" = true,
	"sort_order" = excluded."sort_order",
	"updated_at" = now();
--> statement-breakpoint
WITH supported_levels("board_code", "grade_level") AS (
	VALUES
		('pk_fbise', 'grade_9'::"grade_level"),
		('pk_fbise', 'grade_10'::"grade_level"),
		('pk_pb_bise_bahawalpur', 'grade_9'::"grade_level"),
		('pk_pb_bise_bahawalpur', 'grade_10'::"grade_level"),
		('pk_pb_bise_dg_khan', 'grade_9'::"grade_level"),
		('pk_pb_bise_dg_khan', 'grade_10'::"grade_level"),
		('pk_pb_bise_faisalabad', 'grade_9'::"grade_level"),
		('pk_pb_bise_faisalabad', 'grade_10'::"grade_level"),
		('pk_pb_bise_gujranwala', 'grade_9'::"grade_level"),
		('pk_pb_bise_gujranwala', 'grade_10'::"grade_level"),
		('pk_pb_bise_lahore', 'grade_9'::"grade_level"),
		('pk_pb_bise_lahore', 'grade_10'::"grade_level"),
		('pk_pb_bise_multan', 'grade_9'::"grade_level"),
		('pk_pb_bise_multan', 'grade_10'::"grade_level"),
		('pk_pb_bise_rawalpindi', 'grade_9'::"grade_level"),
		('pk_pb_bise_rawalpindi', 'grade_10'::"grade_level"),
		('pk_pb_bise_sahiwal', 'grade_9'::"grade_level"),
		('pk_pb_bise_sahiwal', 'grade_10'::"grade_level"),
		('pk_pb_bise_sargodha', 'grade_9'::"grade_level"),
		('pk_pb_bise_sargodha', 'grade_10'::"grade_level"),
		('pk_kp_bise_abbottabad', 'grade_9'::"grade_level"),
		('pk_kp_bise_abbottabad', 'grade_10'::"grade_level"),
		('pk_kp_bise_bannu', 'grade_9'::"grade_level"),
		('pk_kp_bise_bannu', 'grade_10'::"grade_level"),
		('pk_kp_bise_di_khan', 'grade_9'::"grade_level"),
		('pk_kp_bise_di_khan', 'grade_10'::"grade_level"),
		('pk_kp_bise_kohat', 'grade_9'::"grade_level"),
		('pk_kp_bise_kohat', 'grade_10'::"grade_level"),
		('pk_kp_bise_malakand', 'grade_9'::"grade_level"),
		('pk_kp_bise_malakand', 'grade_10'::"grade_level"),
		('pk_kp_bise_mardan', 'grade_9'::"grade_level"),
		('pk_kp_bise_mardan', 'grade_10'::"grade_level"),
		('pk_kp_bise_peshawar', 'grade_9'::"grade_level"),
		('pk_kp_bise_peshawar', 'grade_10'::"grade_level"),
		('pk_kp_bise_swat', 'grade_9'::"grade_level"),
		('pk_kp_bise_swat', 'grade_10'::"grade_level"),
		('pk_sd_bsek_karachi', 'grade_9'::"grade_level"),
		('pk_sd_bsek_karachi', 'grade_10'::"grade_level"),
		('pk_sd_bise_hyderabad', 'grade_9'::"grade_level"),
		('pk_sd_bise_hyderabad', 'grade_10'::"grade_level"),
		('pk_sd_bise_sukkur', 'grade_9'::"grade_level"),
		('pk_sd_bise_sukkur', 'grade_10'::"grade_level"),
		('pk_sd_bise_larkana', 'grade_9'::"grade_level"),
		('pk_sd_bise_larkana', 'grade_10'::"grade_level"),
		('pk_sd_bise_mirpurkhas', 'grade_9'::"grade_level"),
		('pk_sd_bise_mirpurkhas', 'grade_10'::"grade_level"),
		('pk_sd_bise_shaheed_benazirabad', 'grade_9'::"grade_level"),
		('pk_sd_bise_shaheed_benazirabad', 'grade_10'::"grade_level"),
		('pk_ba_bbise_quetta', 'grade_9'::"grade_level"),
		('pk_ba_bbise_quetta', 'grade_10'::"grade_level"),
		('pk_ajk_bise_mirpur', 'grade_9'::"grade_level"),
		('pk_ajk_bise_mirpur', 'grade_10'::"grade_level"),
		('pk_gb_kiu_external', 'grade_9'::"grade_level"),
		('pk_gb_kiu_external', 'grade_10'::"grade_level"),
		('pk_aku_eb', 'grade_9'::"grade_level"),
		('pk_aku_eb', 'grade_10'::"grade_level"),
		('pk_sd_zueb', 'grade_9'::"grade_level"),
		('pk_sd_zueb', 'grade_10'::"grade_level"),
		('pk_aiou', 'grade_9'::"grade_level"),
		('pk_aiou', 'grade_10'::"grade_level"),
		('intl_cambridge', 'o_level'::"grade_level"),
		('intl_cambridge', 'a_level'::"grade_level"),
		('intl_city_guilds', 'o_level'::"grade_level"),
		('intl_city_guilds', 'a_level'::"grade_level"),
		('intl_lrn', 'o_level'::"grade_level"),
		('intl_lrn', 'a_level'::"grade_level"),
		('intl_oxford_aqa', 'o_level'::"grade_level"),
		('intl_oxford_aqa', 'a_level'::"grade_level"),
		('intl_pearson_edexcel', 'o_level'::"grade_level"),
		('intl_pearson_edexcel', 'a_level'::"grade_level")
)
INSERT INTO "board_levels" ("board_id", "grade_level")
SELECT b."id", supported_levels."grade_level"
FROM supported_levels
JOIN "boards" AS b ON b."code" = supported_levels."board_code"
ON CONFLICT ("board_id", "grade_level") DO NOTHING;
--> statement-breakpoint
INSERT INTO "subjects" ("code", "name") VALUES ('english', 'English')
ON CONFLICT ("code") DO UPDATE SET "name" = excluded."name", "is_active" = true, "updated_at" = now();
--> statement-breakpoint
UPDATE "users" AS u
SET "board_id" = b."id"
FROM "boards" AS b
WHERE u."board_id" IS NULL
	AND u."board" IS NOT NULL
	AND lower(trim(u."board")) IN (lower(b."code"), lower(b."short_name"), lower(b."name"));
--> statement-breakpoint
WITH aliases("legacy_name", "board_code") AS (
	VALUES
		('BISE Karachi', 'pk_sd_bsek_karachi'),
		('Cambridge O Level', 'intl_cambridge'),
		('Cambridge A Level', 'intl_cambridge')
)
UPDATE "users" AS u
SET "board_id" = b."id"
FROM aliases AS a
JOIN "boards" AS b ON b."code" = a."board_code"
WHERE u."board_id" IS NULL AND lower(trim(u."board")) = lower(a."legacy_name");
--> statement-breakpoint
INSERT INTO "curriculum_versions" (
	"code", "board_id", "subject_id", "grade_level", "version_label", "title", "description", "status"
)
SELECT
	'pk-fbise-grade-10-english-pilot-v1', b."id", s."id", 'grade_10', 'pilot-v1',
	'FBISE Grade 10 English pilot alignment',
	'Compatibility alignment for the original TestBench Grade 10 English diagnostic.',
	'active'
FROM "boards" AS b
CROSS JOIN "subjects" AS s
WHERE b."code" = 'pk_fbise' AND s."code" = 'english'
ON CONFLICT ("code") DO UPDATE SET
	"board_id" = excluded."board_id",
	"subject_id" = excluded."subject_id",
	"grade_level" = excluded."grade_level",
	"version_label" = excluded."version_label",
	"title" = excluded."title",
	"description" = excluded."description",
	"status" = excluded."status",
	"updated_at" = now();
--> statement-breakpoint
INSERT INTO "curriculum_units" ("curriculum_version_id", "type", "code", "title", "position")
SELECT cv."id", 'chapter', unit."code", unit."title", unit."position"
FROM "curriculum_versions" AS cv
CROSS JOIN (VALUES
	('language-foundations', 'Language foundations', 1),
	('reading-comprehension', 'Reading comprehension', 2),
	('extended-writing', 'Extended writing', 3)
) AS unit("code", "title", "position")
WHERE cv."code" = 'pk-fbise-grade-10-english-pilot-v1'
ON CONFLICT ("curriculum_version_id", "code") DO UPDATE SET
	"title" = excluded."title",
	"position" = excluded."position",
	"is_active" = true,
	"updated_at" = now();
--> statement-breakpoint
INSERT INTO "tags" ("code", "name", "category") VALUES
	('starting-diagnostic', 'Starting diagnostic', 'assessment'),
	('pilot-v1', 'Pilot v1', 'release')
ON CONFLICT ("code") DO UPDATE SET
	"name" = excluded."name",
	"category" = excluded."category",
	"is_active" = true,
	"updated_at" = now();
--> statement-breakpoint
UPDATE "assessments"
SET
	"status" = CASE WHEN "is_published" THEN 'published'::"content_status" ELSE 'draft'::"content_status" END,
	"published_at" = CASE WHEN "is_published" THEN COALESCE("published_at", "created_at") ELSE NULL END,
	"type" = CASE
		WHEN "slug" = 'fbise-grade-10-english-starting-diagnostic' THEN 'diagnostic'::"assessment_type"
		ELSE 'practice'::"assessment_type"
	END,
	"current_version_number" = 1,
	"updated_at" = now();
--> statement-breakpoint
UPDATE "assessments" AS a
SET "board_id" = b."id", "curriculum_version_id" = cv."id", "updated_at" = now()
FROM "boards" AS b
CROSS JOIN "curriculum_versions" AS cv
WHERE a."slug" = 'fbise-grade-10-english-starting-diagnostic'
	AND b."code" = 'pk_fbise'
	AND cv."code" = 'pk-fbise-grade-10-english-pilot-v1';
--> statement-breakpoint
INSERT INTO "assessment_versions" (
	"assessment_id", "version_number", "title", "duration_minutes", "total_marks", "instructions", "blueprint",
	"status", "published_at", "created_at", "updated_at"
)
SELECT
	a."id", 1, a."title", a."duration_minutes", a."total_marks", a."instructions", a."blueprint",
	a."status", a."published_at", a."created_at", a."updated_at"
FROM "assessments" AS a
ON CONFLICT ("assessment_id", "version_number") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_items" (
	"id", "code", "legacy_question_id", "response_type", "format", "difficulty", "default_marks", "status",
	"current_revision_number", "created_at", "updated_at"
)
SELECT
	q."id",
	CASE
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 1 THEN 'pilot-1-grammar-agreement'
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 2 THEN 'pilot-2-vocabulary-context'
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 3 THEN 'pilot-3-punctuation-precision'
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 4 THEN 'pilot-4-comprehension-evidence'
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 5 THEN 'pilot-5-narrative-organisation'
		ELSE 'legacy-' || q."id"::text
	END,
	q."id",
	q."type",
	CASE
		WHEN q."type" = 'multiple_choice' THEN 'mcq'::"question_format"
		WHEN q."type" = 'short_answer' AND lower(q."section") LIKE '%comprehension%' THEN 'comprehension'::"question_format"
		WHEN q."type" = 'short_answer' THEN 'short_answer'::"question_format"
		ELSE 'essay'::"question_format"
	END,
	CASE
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" <= 3 THEN 'easy'::"question_difficulty"
		WHEN a."slug" = 'fbise-grade-10-english-starting-diagnostic' AND q."position" = 5 THEN 'difficult'::"question_difficulty"
		ELSE 'moderate'::"question_difficulty"
	END,
	q."marks",
	CASE WHEN a."is_published" THEN 'published'::"content_status" ELSE 'draft'::"content_status" END,
	1,
	q."created_at",
	q."updated_at"
FROM "questions" AS q
JOIN "assessments" AS a ON a."id" = q."assessment_id"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_revisions" (
	"question_item_id", "revision_number", "prompt", "context", "options", "answer_key", "explanation", "marking_scheme",
	"marks", "status", "published_at", "created_at", "updated_at"
)
SELECT
	qi."id",
	1,
	q."prompt",
	q."context",
	CASE
		WHEN q."options" IS NULL OR jsonb_typeof(q."options") <> 'array' THEN q."options"
		ELSE (
			SELECT jsonb_agg(
				jsonb_build_object('id', 'option-' || chr(96 + option_value."ordinality"::integer), 'label', option_value."label")
				ORDER BY option_value."ordinality"
			)
			FROM jsonb_array_elements_text(q."options") WITH ORDINALITY AS option_value("label", "ordinality")
		)
	END,
	CASE
		WHEN q."type" = 'multiple_choice'
			AND q."correct_answer" IS NOT NULL
			AND jsonb_typeof(q."options") = 'array' THEN COALESCE(
			(
				SELECT jsonb_build_object('correctOptionId', 'option-' || chr(96 + option_value."ordinality"::integer))
				FROM jsonb_array_elements_text(q."options") WITH ORDINALITY AS option_value("label", "ordinality")
				WHERE option_value."label" = q."correct_answer"
				LIMIT 1
			),
			jsonb_build_object('acceptedAnswers', jsonb_build_array(q."correct_answer"))
		)
		WHEN q."correct_answer" IS NOT NULL THEN jsonb_build_object('acceptedAnswers', jsonb_build_array(q."correct_answer"))
		ELSE jsonb_build_object('guidance', 'Teacher marking required.')
	END,
	CASE WHEN q."type" = 'multiple_choice' THEN 'Answer key retained from the original assessment.' ELSE NULL END,
	CASE WHEN q."correct_answer" IS NOT NULL THEN jsonb_build_object('modelAnswer', q."correct_answer") ELSE NULL END,
	q."marks",
	qi."status",
	CASE WHEN qi."status" = 'published' THEN q."created_at" ELSE NULL END,
	q."created_at",
	q."updated_at"
FROM "questions" AS q
JOIN "question_items" AS qi ON qi."legacy_question_id" = q."id"
ON CONFLICT ("question_item_id", "revision_number") DO NOTHING;
--> statement-breakpoint
UPDATE "question_revisions" AS qr
SET
	"explanation" = seed."explanation",
	"answer_key" = seed."answer_key",
	"marking_scheme" = seed."marking_scheme",
	"updated_at" = now()
FROM "question_items" AS qi
JOIN (
	VALUES
		(
			'pilot-1-grammar-agreement',
			'The head noun “list” is singular, so it takes the singular verb “is”. The plural phrase “of books” does not change the subject.',
			'{"correctOptionId":"option-b"}'::jsonb,
			'{"modelAnswer":"The list of books is on the desk."}'::jsonb
		),
		(
			'pilot-2-vocabulary-context',
			'The contrast between understanding the opportunity and hesitating to speak shows that “reluctant” means unwilling.',
			'{"correctOptionId":"option-b"}'::jsonb,
			'{"modelAnswer":"Unwilling"}'::jsonb
		),
		(
			'pilot-3-punctuation-precision',
			'The introductory dependent clause ends after “stopped”, so a comma separates it from the main clause.',
			'{"correctOptionId":"option-b"}'::jsonb,
			'{"modelAnswer":"After the rain stopped, we continued our journey."}'::jsonb
		),
		(
			'pilot-4-comprehension-evidence',
			'A strong answer explains the library’s community value and supports that interpretation with a precise detail from the passage.',
			'{"guidance":"Explain why the library was valuable and support the explanation with one accurate detail from the passage."}'::jsonb,
			'{"modelAnswer":"The library gave the neighbourhood a useful shared space because children could read there and neighbours could share skills and solve problems together.","criteria":[{"id":"idea","label":"Relevant explanation","description":"Explains why the library was valuable.","marks":2},{"id":"evidence","label":"Textual evidence","description":"Uses one accurate detail from the passage.","marks":1}]}'::jsonb
		),
		(
			'pilot-5-narrative-organisation',
			'The response should build a complete narrative around the opening line, with a clear problem, connected events, purposeful detail, and a convincing ending.',
			'{"guidance":"Apply the narrative-writing marking scheme to the complete response."}'::jsonb,
			'{"criteria":[{"id":"structure","label":"Narrative structure","description":"Clear problem, logical sequence, and conclusion.","marks":2},{"id":"development","label":"Development and detail","description":"Relevant description and developed events.","marks":2},{"id":"language","label":"Language control","description":"Effective vocabulary and varied sentences.","marks":1},{"id":"accuracy","label":"Technical accuracy","description":"Grammar, spelling, and punctuation support meaning.","marks":1}]}'::jsonb
		)
) AS seed("code", "explanation", "answer_key", "marking_scheme") ON seed."code" = qi."code"
WHERE qr."question_item_id" = qi."id" AND qr."revision_number" = 1;
--> statement-breakpoint
INSERT INTO "question_item_skills" ("question_item_id", "skill_id", "weight")
SELECT qi."id", qs."skill_id", qs."weight"
FROM "question_skills" AS qs
JOIN "question_items" AS qi ON qi."legacy_question_id" = qs."question_id"
ON CONFLICT ("question_item_id", "skill_id") DO UPDATE SET "weight" = excluded."weight";
--> statement-breakpoint
INSERT INTO "question_curriculum_versions" ("question_item_id", "curriculum_version_id")
SELECT qi."id", cv."id"
FROM "question_items" AS qi
JOIN "questions" AS q ON q."id" = qi."legacy_question_id"
JOIN "assessments" AS a ON a."id" = q."assessment_id"
CROSS JOIN "curriculum_versions" AS cv
WHERE a."slug" = 'fbise-grade-10-english-starting-diagnostic'
	AND cv."code" = 'pk-fbise-grade-10-english-pilot-v1'
ON CONFLICT ("question_item_id", "curriculum_version_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_curriculum_units" ("question_item_id", "curriculum_unit_id", "is_primary")
SELECT qi."id", cu."id", true
FROM "question_items" AS qi
JOIN "questions" AS q ON q."id" = qi."legacy_question_id"
JOIN "assessments" AS a ON a."id" = q."assessment_id"
JOIN "curriculum_versions" AS cv ON cv."code" = 'pk-fbise-grade-10-english-pilot-v1'
JOIN "curriculum_units" AS cu
	ON cu."curriculum_version_id" = cv."id"
	AND cu."code" = CASE
		WHEN q."position" <= 3 THEN 'language-foundations'
		WHEN q."position" = 4 THEN 'reading-comprehension'
		ELSE 'extended-writing'
	END
WHERE a."slug" = 'fbise-grade-10-english-starting-diagnostic'
ON CONFLICT ("question_item_id", "curriculum_unit_id") DO UPDATE SET "is_primary" = true;
--> statement-breakpoint
INSERT INTO "question_tags" ("question_item_id", "tag_id")
SELECT qi."id", t."id"
FROM "question_items" AS qi
JOIN "questions" AS q ON q."id" = qi."legacy_question_id"
JOIN "assessments" AS a ON a."id" = q."assessment_id"
CROSS JOIN "tags" AS t
WHERE a."slug" = 'fbise-grade-10-english-starting-diagnostic'
	AND t."code" IN ('starting-diagnostic', 'pilot-v1')
ON CONFLICT ("question_item_id", "tag_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "assessment_questions" (
	"assessment_version_id", "question_revision_id", "position", "section", "marks", "created_at", "updated_at"
)
SELECT av."id", qr."id", q."position", q."section", q."marks", q."created_at", q."updated_at"
FROM "questions" AS q
JOIN "assessment_versions" AS av ON av."assessment_id" = q."assessment_id" AND av."version_number" = 1
JOIN "question_items" AS qi ON qi."legacy_question_id" = q."id"
JOIN "question_revisions" AS qr ON qr."question_item_id" = qi."id" AND qr."revision_number" = 1
ON CONFLICT ("assessment_version_id", "position") DO NOTHING;
--> statement-breakpoint
UPDATE "attempts" AS attempt
SET "assessment_version_id" = av."id", "updated_at" = now()
FROM "assessment_versions" AS av
WHERE attempt."assessment_version_id" IS NULL
	AND av."assessment_id" = attempt."assessment_id"
	AND av."version_number" = 1;
--> statement-breakpoint
UPDATE "answers" AS answer
SET "question_revision_id" = qr."id", "updated_at" = now()
FROM "question_items" AS qi
JOIN "question_revisions" AS qr ON qr."question_item_id" = qi."id" AND qr."revision_number" = 1
WHERE answer."question_revision_id" IS NULL AND qi."legacy_question_id" = answer."question_id";
