CREATE TABLE IF NOT EXISTS "bom_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"colourway_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"position" varchar(100) NOT NULL,
	"usage_quantity" varchar(50) NOT NULL,
	"unit" varchar(20) DEFAULT 'm' NOT NULL,
	"wastage_multiplier" varchar(20) DEFAULT '1.0' NOT NULL,
	"estimated_cost" varchar(50) NOT NULL,
	"actual_cost" varchar(50),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"colourway_id" uuid NOT NULL,
	"size" varchar(50) NOT NULL,
	"materials_cost" varchar(50) NOT NULL,
	"trim_cost" varchar(50) DEFAULT '0.0' NOT NULL,
	"cmt_labor_cost" varchar(50) NOT NULL,
	"logistics_cost" varchar(50) DEFAULT '0.0' NOT NULL,
	"packaging_cost" varchar(50) DEFAULT '0.0' NOT NULL,
	"duty_cost" varchar(50) DEFAULT '0.0' NOT NULL,
	"target_margin" varchar(50) DEFAULT '0.0' NOT NULL,
	"wholesale_price" varchar(50) NOT NULL,
	"retail_price" varchar(50) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"price_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_order" varchar(50),
	"lead_time" varchar(50),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"qualification_rating" varchar(50),
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_colourway_id_colourways_id_fk" FOREIGN KEY ("colourway_id") REFERENCES "public"."colourways"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_estimates" ADD CONSTRAINT "cost_estimates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_estimates" ADD CONSTRAINT "cost_estimates_style_id_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."styles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_estimates" ADD CONSTRAINT "cost_estimates_colourway_id_colourways_id_fk" FOREIGN KEY ("colourway_id") REFERENCES "public"."colourways"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
