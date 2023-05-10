CREATE TABLE IF NOT EXISTS "colours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"digital_value" varchar(50) NOT NULL,
	"material_applicability" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "colourways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"colour_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"material_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"image_key" varchar(255),
	"approval_status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"composition" text NOT NULL,
	"construction" text,
	"weight" varchar(50),
	"width" varchar(50),
	"finish" text,
	"care_instructions" text,
	"colour_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_order" varchar(50),
	"lead_time" varchar(50),
	"cost_estimate" varchar(50) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"approval_status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"composition" text,
	"colour_capability" varchar(100),
	"width" varchar(50),
	"weight" varchar(50),
	"unit" varchar(20) DEFAULT 'm' NOT NULL,
	"supplier_id" uuid,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"confidentiality" varchar(50) DEFAULT 'Internal' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"countries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"material_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lead_time" varchar(100),
	"contact_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"qualification_status" varchar(50) DEFAULT 'Unqualified' NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colours" ADD CONSTRAINT "colours_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colourways" ADD CONSTRAINT "colourways_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colourways" ADD CONSTRAINT "colourways_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "colourways" ADD CONSTRAINT "colourways_colour_id_colours_id_fk" FOREIGN KEY ("colour_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_specifications" ADD CONSTRAINT "material_specifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_specifications" ADD CONSTRAINT "material_specifications_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_specifications" ADD CONSTRAINT "material_specifications_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
