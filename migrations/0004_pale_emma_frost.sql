ALTER TABLE "balance_transactions" ALTER COLUMN "id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "user_id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "status" varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "currency" varchar(10) DEFAULT 'RUB' NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;