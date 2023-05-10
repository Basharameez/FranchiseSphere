CREATE TABLE IF NOT EXISTS "measurement_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255) NOT NULL,
	"method" text,
	"unit" varchar(10) DEFAULT 'cm' NOT NULL,
	"category" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "measurement_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"sample_size" varchar(50) NOT NULL,
	"size_scale_id" uuid NOT NULL,
	"measurement_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tolerances" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"grading_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approval_status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sample_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"sample_round" varchar(50) NOT NULL,
	"measurement_point_id" uuid NOT NULL,
	"expected_value" varchar(50) NOT NULL,
	"tolerance" varchar(50) NOT NULL,
	"measured_value" varchar(50) NOT NULL,
	"deviation" varchar(50) NOT NULL,
	"result" varchar(20) NOT NULL,
	"reviewer_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "size_scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "measurement_points" ADD CONSTRAINT "measurement_points_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "measurement_specifications" ADD CONSTRAINT "measurement_specifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "measurement_specifications" ADD CONSTRAINT "measurement_specifications_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "measurement_specifications" ADD CONSTRAINT "measurement_specifications_size_scale_id_size_scales_id_fk" FOREIGN KEY ("size_scale_id") REFERENCES "public"."size_scales"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_measurements" ADD CONSTRAINT "sample_measurements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_measurements" ADD CONSTRAINT "sample_measurements_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_measurements" ADD CONSTRAINT "sample_measurements_measurement_point_id_measurement_points_id_fk" FOREIGN KEY ("measurement_point_id") REFERENCES "public"."measurement_points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sample_measurements" ADD CONSTRAINT "sample_measurements_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "size_scales" ADD CONSTRAINT "size_scales_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
