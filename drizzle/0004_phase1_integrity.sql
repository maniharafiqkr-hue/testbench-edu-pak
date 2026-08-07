CREATE TABLE "question_revision_curriculum_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_revision_id" uuid NOT NULL,
	"curriculum_unit_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_revision_curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_revision_id" uuid NOT NULL,
	"curriculum_version_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_revision_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_revision_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_revision_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_revision_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answers" DROP CONSTRAINT "answers_attempt_id_attempts_id_fk";
--> statement-breakpoint
ALTER TABLE "answers" DROP CONSTRAINT "answers_question_revision_id_question_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_curriculum_version_id_curriculum_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_assessment_version_id_assessment_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_board_id_boards_id_fk";
--> statement-breakpoint
DROP INDEX "answers_attempt_question_unique";
--> statement-breakpoint
DROP INDEX "curriculum_units_position_unique";
--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "question_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "assessment_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "answers" ADD COLUMN "assessment_question_id" uuid;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD COLUMN "type" "assessment_type";
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD COLUMN "board_id" uuid;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD COLUMN "subject_id" uuid;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD COLUMN "grade_level" "grade_level";
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD COLUMN "curriculum_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "subject_id" uuid;
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN "response_type" "question_type";
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN "format" "question_format";
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD COLUMN "difficulty" "question_difficulty";
--> statement-breakpoint
ALTER TABLE "question_revision_curriculum_units" ADD CONSTRAINT "question_revision_curriculum_units_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_curriculum_units" ADD CONSTRAINT "question_revision_curriculum_units_curriculum_unit_id_curriculum_units_id_fk" FOREIGN KEY ("curriculum_unit_id") REFERENCES "public"."curriculum_units"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_curriculum_versions" ADD CONSTRAINT "question_revision_curriculum_versions_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_curriculum_versions" ADD CONSTRAINT "question_revision_curriculum_versions_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_skills" ADD CONSTRAINT "question_revision_skills_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_skills" ADD CONSTRAINT "question_revision_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_tags" ADD CONSTRAINT "question_revision_tags_question_revision_id_question_revisions_id_fk" FOREIGN KEY ("question_revision_id") REFERENCES "public"."question_revisions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "question_revision_tags" ADD CONSTRAINT "question_revision_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "question_revision_curriculum_units_pair_unique" ON "question_revision_curriculum_units" USING btree ("question_revision_id","curriculum_unit_id");
--> statement-breakpoint
CREATE INDEX "question_revision_curriculum_units_unit_idx" ON "question_revision_curriculum_units" USING btree ("curriculum_unit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "question_revision_curriculum_versions_pair_unique" ON "question_revision_curriculum_versions" USING btree ("question_revision_id","curriculum_version_id");
--> statement-breakpoint
CREATE INDEX "question_revision_curriculum_versions_curriculum_idx" ON "question_revision_curriculum_versions" USING btree ("curriculum_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "question_revision_skills_pair_unique" ON "question_revision_skills" USING btree ("question_revision_id","skill_id");
--> statement-breakpoint
CREATE INDEX "question_revision_skills_skill_idx" ON "question_revision_skills" USING btree ("skill_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "question_revision_tags_pair_unique" ON "question_revision_tags" USING btree ("question_revision_id","tag_id");
--> statement-breakpoint
CREATE INDEX "question_revision_tags_tag_idx" ON "question_revision_tags" USING btree ("tag_id");
--> statement-breakpoint
UPDATE "assessments" AS a
SET "subject_id" = cv."subject_id", "updated_at" = now()
FROM "curriculum_versions" AS cv
WHERE a."curriculum_version_id" = cv."id" AND a."subject_id" IS NULL;
--> statement-breakpoint
UPDATE "assessment_versions" AS av
SET
	"type" = a."type",
	"board_id" = a."board_id",
	"subject_id" = a."subject_id",
	"grade_level" = a."grade_level",
	"curriculum_version_id" = a."curriculum_version_id",
	"updated_at" = now()
FROM "assessments" AS a
WHERE av."assessment_id" = a."id";
--> statement-breakpoint
UPDATE "question_revisions" AS qr
SET
	"response_type" = qi."response_type",
	"format" = qi."format",
	"difficulty" = qi."difficulty",
	"updated_at" = now()
FROM "question_items" AS qi
WHERE qr."question_item_id" = qi."id";
--> statement-breakpoint
INSERT INTO "question_revision_skills" ("question_revision_id", "skill_id", "weight")
SELECT qr."id", source."skill_id", source."weight"
FROM "question_item_skills" AS source
JOIN "question_items" AS qi ON qi."id" = source."question_item_id"
JOIN "question_revisions" AS qr
	ON qr."question_item_id" = qi."id" AND qr."revision_number" = qi."current_revision_number"
ON CONFLICT ("question_revision_id", "skill_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_revision_curriculum_versions" ("question_revision_id", "curriculum_version_id")
SELECT qr."id", source."curriculum_version_id"
FROM "question_curriculum_versions" AS source
JOIN "question_items" AS qi ON qi."id" = source."question_item_id"
JOIN "question_revisions" AS qr
	ON qr."question_item_id" = qi."id" AND qr."revision_number" = qi."current_revision_number"
ON CONFLICT ("question_revision_id", "curriculum_version_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_revision_curriculum_units" ("question_revision_id", "curriculum_unit_id", "is_primary")
SELECT qr."id", source."curriculum_unit_id", source."is_primary"
FROM "question_curriculum_units" AS source
JOIN "question_items" AS qi ON qi."id" = source."question_item_id"
JOIN "question_revisions" AS qr
	ON qr."question_item_id" = qi."id" AND qr."revision_number" = qi."current_revision_number"
ON CONFLICT ("question_revision_id", "curriculum_unit_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "question_revision_tags" ("question_revision_id", "tag_id")
SELECT qr."id", source."tag_id"
FROM "question_tags" AS source
JOIN "question_items" AS qi ON qi."id" = source."question_item_id"
JOIN "question_revisions" AS qr
	ON qr."question_item_id" = qi."id" AND qr."revision_number" = qi."current_revision_number"
ON CONFLICT ("question_revision_id", "tag_id") DO NOTHING;
--> statement-breakpoint
UPDATE "answers" AS answer
SET "selected_option" = option_value->>'id', "updated_at" = now()
FROM "question_revisions" AS qr
CROSS JOIN LATERAL jsonb_array_elements(qr."options") AS option_value
WHERE answer."question_revision_id" = qr."id"
	AND jsonb_typeof(qr."options") = 'array'
	AND answer."selected_option" = option_value->>'label';
--> statement-breakpoint
UPDATE "answers" AS answer
SET
	"assessment_version_id" = attempt."assessment_version_id",
	"assessment_question_id" = aq."id",
	"updated_at" = now()
FROM "attempts" AS attempt, "assessment_questions" AS aq
WHERE answer."attempt_id" = attempt."id"
	AND aq."assessment_version_id" = attempt."assessment_version_id"
	AND aq."question_revision_id" = answer."question_revision_id";
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "attempts" WHERE "assessment_version_id" IS NULL) THEN
		RAISE EXCEPTION 'Phase 1 migration could not match every attempt to an assessment version';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "answers"
		WHERE "question_revision_id" IS NULL
			OR "assessment_version_id" IS NULL
			OR "assessment_question_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Phase 1 migration could not match every answer to a versioned assessment question';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "assessment_versions"
		WHERE "type" IS NULL OR "board_id" IS NULL OR "subject_id" IS NULL
			OR "grade_level" IS NULL OR "curriculum_version_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Phase 1 migration requires curriculum identity for every assessment version';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "question_revisions"
		WHERE "response_type" IS NULL OR "format" IS NULL OR "difficulty" IS NULL
	) THEN
		RAISE EXCEPTION 'Phase 1 migration could not classify every question revision';
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "question_revision_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "assessment_version_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "assessment_question_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "attempts" ALTER COLUMN "assessment_version_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ALTER COLUMN "type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ALTER COLUMN "board_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ALTER COLUMN "subject_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ALTER COLUMN "grade_level" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ALTER COLUMN "curriculum_version_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "question_revisions" ALTER COLUMN "response_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "question_revisions" ALTER COLUMN "format" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "question_revisions" ALTER COLUMN "difficulty" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_id_version_unique" ON "assessment_questions" USING btree ("id","assessment_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_id_revision_unique" ON "assessment_questions" USING btree ("id","question_revision_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_versions_id_assessment_unique" ON "assessment_versions" USING btree ("id","assessment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_id_version_unique" ON "attempts" USING btree ("id","assessment_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_versions_snapshot_identity_unique" ON "curriculum_versions" USING btree ("id","board_id","subject_id","grade_level");
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_version_fk" FOREIGN KEY ("attempt_id","assessment_version_id") REFERENCES "public"."attempts"("id","assessment_version_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_assessment_question_version_fk" FOREIGN KEY ("assessment_question_id","assessment_version_id") REFERENCES "public"."assessment_questions"("id","assessment_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_assessment_question_revision_fk" FOREIGN KEY ("assessment_question_id","question_revision_id") REFERENCES "public"."assessment_questions"("id","question_revision_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_curriculum_identity_fk" FOREIGN KEY ("curriculum_version_id","board_id","subject_id","grade_level") REFERENCES "public"."curriculum_versions"("id","board_id","subject_id","grade_level") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_board_grade_fk" FOREIGN KEY ("board_id","grade_level") REFERENCES "public"."board_levels"("board_id","grade_level") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_curriculum_identity_fk" FOREIGN KEY ("curriculum_version_id","board_id","subject_id","grade_level") REFERENCES "public"."curriculum_versions"("id","board_id","subject_id","grade_level") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_assessment_version_consistency_fk" FOREIGN KEY ("assessment_version_id","assessment_id") REFERENCES "public"."assessment_versions"("id","assessment_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_board_grade_fk" FOREIGN KEY ("board_id","grade_level") REFERENCES "public"."board_levels"("board_id","grade_level") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_board_grade_fk" FOREIGN KEY ("board_id","grade_level") REFERENCES "public"."board_levels"("board_id","grade_level") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "answers_attempt_assessment_question_unique" ON "answers" USING btree ("attempt_id","assessment_question_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "answers_attempt_legacy_question_unique" ON "answers" USING btree ("attempt_id","question_id") WHERE "question_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "answers_assessment_question_idx" ON "answers" USING btree ("assessment_question_id");
--> statement-breakpoint
CREATE INDEX "assessment_questions_revision_idx" ON "assessment_questions" USING btree ("question_revision_id");
--> statement-breakpoint
CREATE INDEX "assessment_versions_curriculum_idx" ON "assessment_versions" USING btree ("curriculum_version_id");
--> statement-breakpoint
CREATE INDEX "assessments_board_idx" ON "assessments" USING btree ("board_id");
--> statement-breakpoint
CREATE INDEX "assessments_curriculum_idx" ON "assessments" USING btree ("curriculum_version_id");
--> statement-breakpoint
CREATE INDEX "attempts_assessment_version_idx" ON "attempts" USING btree ("assessment_version_id");
--> statement-breakpoint
CREATE INDEX "users_board_idx" ON "users" USING btree ("board_id");
--> statement-breakpoint
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_position_unique" UNIQUE NULLS NOT DISTINCT("curriculum_version_id","parent_unit_id","position");
--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_publication_state_check" CHECK (("status" <> 'published' OR "published_at" IS NOT NULL) AND ("published_at" IS NULL OR "status" IN ('published', 'archived')));
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_publication_state_check" CHECK (("status" <> 'published' OR "published_at" IS NOT NULL) AND ("published_at" IS NULL OR "status" IN ('published', 'archived')));
--> statement-breakpoint
ALTER TABLE "question_revisions" ADD CONSTRAINT "question_revisions_publication_state_check" CHECK (("status" <> 'published' OR "published_at" IS NOT NULL) AND ("published_at" IS NULL OR "status" IN ('published', 'archived')));
--> statement-breakpoint
CREATE FUNCTION "reject_published_snapshot_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF OLD."status" = 'published' THEN
		RAISE EXCEPTION 'Published snapshots are immutable';
	END IF;
	IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "question_revisions_immutable_when_published"
BEFORE UPDATE OR DELETE ON "question_revisions"
FOR EACH ROW EXECUTE FUNCTION "reject_published_snapshot_mutation"();
--> statement-breakpoint
CREATE TRIGGER "assessment_versions_immutable_when_published"
BEFORE UPDATE OR DELETE ON "assessment_versions"
FOR EACH ROW EXECUTE FUNCTION "reject_published_snapshot_mutation"();
--> statement-breakpoint
CREATE FUNCTION "reject_published_question_mapping_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
	revision_id uuid;
BEGIN
	IF TG_OP = 'DELETE' THEN revision_id := OLD."question_revision_id";
	ELSE revision_id := NEW."question_revision_id";
	END IF;
	IF EXISTS (SELECT 1 FROM "question_revisions" WHERE "id" = revision_id AND "status" = 'published') THEN
		RAISE EXCEPTION 'Published question classifications are immutable';
	END IF;
	IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "question_revision_skills_immutable_when_published"
AFTER INSERT OR UPDATE OR DELETE ON "question_revision_skills"
FOR EACH ROW EXECUTE FUNCTION "reject_published_question_mapping_mutation"();
--> statement-breakpoint
CREATE TRIGGER "question_revision_tags_immutable_when_published"
AFTER INSERT OR UPDATE OR DELETE ON "question_revision_tags"
FOR EACH ROW EXECUTE FUNCTION "reject_published_question_mapping_mutation"();
--> statement-breakpoint
CREATE TRIGGER "question_revision_curriculum_versions_immutable_when_published"
AFTER INSERT OR UPDATE OR DELETE ON "question_revision_curriculum_versions"
FOR EACH ROW EXECUTE FUNCTION "reject_published_question_mapping_mutation"();
--> statement-breakpoint
CREATE TRIGGER "question_revision_curriculum_units_immutable_when_published"
AFTER INSERT OR UPDATE OR DELETE ON "question_revision_curriculum_units"
FOR EACH ROW EXECUTE FUNCTION "reject_published_question_mapping_mutation"();
--> statement-breakpoint
CREATE FUNCTION "reject_published_assessment_question_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF (
		TG_OP IN ('UPDATE', 'DELETE')
		AND EXISTS (SELECT 1 FROM "assessment_versions" WHERE "id" = OLD."assessment_version_id" AND "status" = 'published')
	) OR (
		TG_OP IN ('INSERT', 'UPDATE')
		AND EXISTS (SELECT 1 FROM "assessment_versions" WHERE "id" = NEW."assessment_version_id" AND "status" = 'published')
	) THEN
		RAISE EXCEPTION 'Published assessment question lists are immutable';
	END IF;
	IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "assessment_questions_immutable_when_published"
AFTER INSERT OR UPDATE OR DELETE ON "assessment_questions"
FOR EACH ROW EXECUTE FUNCTION "reject_published_assessment_question_mutation"();
