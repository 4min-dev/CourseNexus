CREATE TABLE "program_instructions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"program_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"moderated_by" varchar,
	"moderated_at" timestamp,
	"moderation_comment" text,
	"admin_comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP INDEX "idx_courses_level";
ALTER TABLE "courses" ALTER COLUMN "level" SET DATA TYPE text[] USING level::text[];
ALTER TABLE "course_requests" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "hidden_in_shop" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "hidden_in_library" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "paid_from_balance" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "paid_from_referral_balance" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "viewed_in_library" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "admin_comment" text;--> statement-breakpoint
ALTER TABLE "vip_packages" ADD COLUMN "viewed_in_library" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "program_instructions" ADD CONSTRAINT "program_instructions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_reviews" ADD CONSTRAINT "program_reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_program_instructions_program" ON "program_instructions" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_program_instructions_order" ON "program_instructions" USING btree ("program_id","order");--> statement-breakpoint
CREATE INDEX "idx_program_reviews_program" ON "program_reviews" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_program_reviews_user_program" ON "program_reviews" USING btree ("user_id","program_id");--> statement-breakpoint
CREATE INDEX "idx_program_reviews_status" ON "program_reviews" USING btree ("status");