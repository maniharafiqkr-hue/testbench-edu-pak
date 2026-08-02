CREATE TYPE "public"."repair_item_kind" AS ENUM('review', 'practice', 'rewrite', 'retest');--> statement-breakpoint
CREATE TABLE "repair_item_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"achieved" boolean,
	"feedback" text,
	"returned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_progress_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"reference_key" varchar(180) NOT NULL,
	"source" varchar(60) NOT NULL,
	"score" integer NOT NULL,
	"maximum_score" integer NOT NULL,
	"level" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "source_answer_id" uuid;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "kind" "repair_item_kind" DEFAULT 'review' NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "response" text;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "selected_option" text;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "awarded_marks" integer;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "maximum_marks" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repair_item_reviews" ADD CONSTRAINT "repair_item_reviews_item_id_repair_plan_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."repair_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_item_reviews" ADD CONSTRAINT "repair_item_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress_events" ADD CONSTRAINT "skill_progress_events_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress_events" ADD CONSTRAINT "skill_progress_events_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "repair_item_reviews_item_unique" ON "repair_item_reviews" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "repair_item_reviews_status_idx" ON "repair_item_reviews" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_progress_events_reference_unique" ON "skill_progress_events" USING btree ("reference_key");--> statement-breakpoint
CREATE INDEX "skill_progress_events_student_idx" ON "skill_progress_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "skill_progress_events_skill_idx" ON "skill_progress_events" USING btree ("skill_id");--> statement-breakpoint
ALTER TABLE "repair_plan_items" ADD CONSTRAINT "repair_plan_items_source_answer_id_answers_id_fk" FOREIGN KEY ("source_answer_id") REFERENCES "public"."answers"("id") ON DELETE set null ON UPDATE no action;