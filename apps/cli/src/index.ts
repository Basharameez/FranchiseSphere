#!/usr/bin/env node
import { Command } from "commander";
import { db, schema, seedAll } from "@threadline/database";
import { calculateGradedValue } from "@threadline/measurement-engine";
import { eq } from "drizzle-orm";
import "dotenv/config";

const program = new Command();

program
  .name("threadline")
  .description("Threadline PLM Administrative Control CLI Tool")
  .version("1.0.0");

// 1. Seed Database
program
  .command("seed")
  .description("Populate the PLM database with mock seed data")
  .action(async () => {
    try {
      await seedAll();
      process.exit(0);
    } catch (err: any) {
      console.error("Seed failed:", err.message);
      process.exit(1);
    }
  });

// 2. List Seasons
program
  .command("seasons")
  .description("List active fashion planning seasons")
  .action(async () => {
    try {
      const list = await db.query.seasons.findMany();
      console.log("\n--- ACTIVE FASHION SEASONS ---");
      if (list.length === 0) {
        console.log("No seasons found. Run 'threadline seed' to populate.");
      } else {
        list.forEach(s => {
          console.log(`- [${s.id}] Name: ${s.name} | Year: ${s.year} | Status: ${s.status}`);
        });
      }
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to query seasons:", err.message);
      process.exit(1);
    }
  });

// 3. List Style Records
program
  .command("styles")
  .description("List apparel style catalog records")
  .action(async () => {
    try {
      const list = await db.query.styles.findMany();
      console.log("\n--- STYLE CATALOG ---");
      if (list.length === 0) {
        console.log("No styles found. Run 'threadline seed' to populate.");
      } else {
        list.forEach(s => {
          console.log(`- Style #: ${s.styleNumber} | Name: ${s.name} | Category: ${s.category}`);
        });
      }
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to query styles:", err.message);
      process.exit(1);
    }
  });

// 4. View Technical Pack
program
  .command("techpack <styleId>")
  .description("Print technical design pack details for a style record")
  .action(async (styleId: string) => {
    try {
      const style = await db.query.styles.findFirst({
        where: eq(schema.styles.id, styleId),
      });

      if (!style) {
        console.error("Style record not found.");
        process.exit(1);
      }

      const brief = await db.query.productBriefs.findFirst({
        where: eq(schema.productBriefs.styleId, styleId),
      });

      const bom = await db.query.bomItems.findMany({
        where: eq(schema.bomItems.styleId, styleId),
      });

      console.log(`\n================ TECHNICAL PACK: ${style.styleNumber} ================`);
      console.log(`Name: ${style.name}`);
      console.log(`Category: ${style.category}`);
      console.log(`Confidentiality: ${style.confidentiality}`);
      console.log(`Status: ${style.status}`);
      console.log(`----------------------------------------------------------------------`);
      console.log(`Brief Objectives: ${brief?.designObjective || "None"}`);
      console.log(`Inspiration: ${brief?.inspiration || "None"}`);
      console.log(`------------------------ BILL OF MATERIALS ---------------------------`);
      if (bom.length === 0) {
        console.log("No BOM items mapped.");
      } else {
        bom.forEach(b => {
          console.log(`- Position: ${b.position} | Usage Qty: ${b.usageQuantity}${b.unit} | Est Cost: ${b.estimatedCost} ${b.currency}`);
        });
      }
      console.log(`======================================================================\n`);
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to compile techpack:", err.message);
      process.exit(1);
    }
  });

// 5. Size Grading Calculations Trace
program
  .command("grade <styleId>")
  .description("Perform sizing graded measurement calculations for a style")
  .action(async (styleId: string) => {
    try {
      const spec = await db.query.measurementSpecifications.findFirst({
        where: eq(schema.measurementSpecifications.styleId, styleId),
      });

      if (!spec) {
        console.error("No measurement specifications template defined for style.");
        process.exit(1);
      }

      const scale = await db.query.sizeScales.findFirst({
        where: eq(schema.sizeScales.id, spec.sizeScaleId),
      });

      if (!scale) {
        console.error("Size scale references not found.");
        process.exit(1);
      }

      const labels = scale.labels as string[];
      const baseIndex = labels.indexOf(spec.sampleSize);

      console.log(`\n--- SIZING GRADES CHART (Base: ${spec.sampleSize}) ---`);
      const pts = spec.measurementPoints as any[];
      for (const pt of pts) {
        const pointDetails = await db.query.measurementPoints.findFirst({
          where: eq(schema.measurementPoints.id, pt.pointId),
        });

        console.log(`\nMeasurement Point: ${pointDetails?.code} (${pointDetails?.description})`);
        labels.forEach((label, idx) => {
          const result = calculateGradedValue(pt.baseValue, {
            type: pt.gradingRule.type,
            increment: pt.gradingRule.increment,
            increments: pt.gradingRule.increments,
            manualValues: pt.gradingRule.manualValues,
            baseSizeIndex: baseIndex,
          }, idx, label);

          console.log(`  - Size: ${label} => Value: ${result.value} ${pointDetails?.unit} (Trace: ${result.trace.calculationSteps})`);
        });
      }
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to perform grading:", err.message);
      process.exit(1);
    }
  });

// 6. Cost Estimates Calculations
program
  .command("cost <styleId>")
  .description("Fetch and print retail markup wholesale costing margins")
  .action(async (styleId: string) => {
    try {
      const estimates = await db.query.costEstimates.findMany({
        where: eq(schema.costEstimates.styleId, styleId),
      });

      console.log("\n--- COST ESTIMATES AND MARGINS ---");
      if (estimates.length === 0) {
        console.log("No cost estimates logged for style.");
      } else {
        estimates.forEach(e => {
          console.log(`- Size: ${e.size} | Mat Cost: ${e.materialsCost} | CMT Labor: ${e.cmtLaborCost} | Target Margin: ${parseFloat(e.targetMargin) * 100}%`);
          console.log(`  => Wholesale Price: ${e.wholesalePrice} ${e.currency}`);
          console.log(`  => Suggested Retail: ${e.retailPrice} ${e.currency}`);
        });
      }
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to query costing:", err.message);
      process.exit(1);
    }
  });

// 7. View Audit Log Trail
program
  .command("audit")
  .description("Display system compliance change control audit logs")
  .action(async () => {
    try {
      const list = await db.query.auditLogs.findMany({
        limit: 10,
        orderBy: (logs, { desc }) => [desc(logs.createdAt)],
      });

      console.log("\n--- SYSTEM CHANGE CONTROL AUDIT LOGS ---");
      if (list.length === 0) {
        console.log("No audit logs recorded.");
      } else {
        list.forEach(l => {
          console.log(`[${l.createdAt.toISOString()}] Action: ${l.action} | Table: ${l.targetTable} | Field: ${l.fieldName} | Old: ${l.oldValue} | New: ${l.newValue}`);
        });
      }
      process.exit(0);
    } catch (err: any) {
      console.error("Failed to query audit logs:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
