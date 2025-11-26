CREATE TABLE "engagement_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_type" varchar(20) NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pending_lesson_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" varchar NOT NULL,
	"lesson_ids" text[] NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scheduler_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduler_name" varchar(50) NOT NULL,
	"run_date" varchar(10) NOT NULL,
	"status" varchar(20) NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "telegram_verification_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" varchar,
	"code" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "referral_bonus_percent" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "trade_in_page_content" ALTER COLUMN "telegram_url" SET DEFAULT 'https://t.me/yourchannel';--> statement-breakpoint
ALTER TABLE "vip_page_content" ALTER COLUMN "page_subtitle" SET DEFAULT 'Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "fantik_price" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "payment_type" varchar(20) DEFAULT 'money_only';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "fantik_price" integer;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "payment_type" varchar(20) DEFAULT 'money_only';--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "paid_fantiks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "require_2fa" varchar DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_first_name" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_last_name" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "require_2fa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "engagement_notifications" ADD CONSTRAINT "engagement_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_lesson_notifications" ADD CONSTRAINT "pending_lesson_notifications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_verification_codes" ADD CONSTRAINT "telegram_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_engagement_notifications_user" ON "engagement_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_engagement_notifications_type" ON "engagement_notifications" USING btree ("notification_type");--> statement-breakpoint
CREATE INDEX "idx_engagement_notifications_sent_at" ON "engagement_notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_engagement_user_type_unique" ON "engagement_notifications" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "idx_pending_lesson_notifications_scheduled" ON "pending_lesson_notifications" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_pending_lesson_notifications_processed" ON "pending_lesson_notifications" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_pending_lesson_notifications_course" ON "pending_lesson_notifications" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_scheduler_runs_name_date" ON "scheduler_runs" USING btree ("scheduler_name","run_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scheduler_run_unique" ON "scheduler_runs" USING btree ("scheduler_name","run_date");--> statement-breakpoint
CREATE INDEX "idx_telegram_codes_user_id" ON "telegram_verification_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_codes_email" ON "telegram_verification_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_telegram_codes_expires_at" ON "telegram_verification_codes" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_telegram_chat_id_unique" UNIQUE("telegram_chat_id");