import { db, schema } from "./index.js";
import { sql } from "drizzle-orm";

export async function seedAll() {
  console.log("Seeding Threadline PLM Database...");

  // 1. Clear database
  await db.execute(sql`TRUNCATE TABLE "users", "organizations", "brands", "memberships", "seasons", "collection_plans", "styles", "product_briefs", "design_files", "suppliers", "materials", "material_specifications", "colours", "colourways", "size_scales", "measurement_points", "measurement_specifications", "sample_measurements", "bom_items", "cost_estimates", "supplier_quotes", "sample_rounds", "fit_logs", "approvals", "releases", "audit_logs", "comments", "notifications", "activities" CASCADE;`);

  // 2. Create Organization
  const [org] = await db.insert(schema.organizations).values({
    name: "Design Co Global",
    description: "Global Apparel Production",
  }).returning();

  // 3. Create Users
  const [owner] = await db.insert(schema.users).values({
    email: "director@designco.com",
    passwordHash: "$scrypt$N=16384,r=8,p=1$7d21353...$hash", // mock format
    isVerified: true,
  }).returning();

  const [designer] = await db.insert(schema.users).values({
    email: "designer1@designco.com",
    passwordHash: "designer_hash",
    isVerified: true,
  }).returning();

  const [sourcing] = await db.insert(schema.users).values({
    email: "sourcing1@designco.com",
    passwordHash: "sourcing_hash",
    isVerified: true,
  }).returning();

  // Memberships
  await db.insert(schema.memberships).values([
    { orgId: org.id, userId: owner.id, role: "Organization Owner" },
    { orgId: org.id, userId: designer.id, role: "Collaborator" },
    { orgId: org.id, userId: sourcing.id, role: "Collaborator" },
  ]);

  // 4. Create Brands
  const [brandClassic] = await db.insert(schema.brands).values({
    orgId: org.id,
    name: "Classic Atelier",
    description: "Traditional high-quality garments",
    status: "Active",
  }).returning();

  const [brandSport] = await db.insert(schema.brands).values({
    orgId: org.id,
    name: "AeroSport Performance",
    description: "High-performance technical activewear",
    status: "Active",
  }).returning();

  // 5. Create Seasons
  const [seasonSS28] = await db.insert(schema.seasons).values({
    orgId: org.id,
    name: "Spring Summer 2028",
    year: 2028,
    deliveryWindow: "Feb-April 2028",
    status: "Development",
    ownerId: owner.id,
  }).returning();

  const [seasonFW28] = await db.insert(schema.seasons).values({
    orgId: org.id,
    name: "Fall Winter 2028",
    year: 2028,
    deliveryWindow: "Aug-Oct 2028",
    status: "Planning",
    ownerId: owner.id,
  }).returning();

  // 6. Size Scales
  const [scaleAlpha] = await db.insert(schema.sizeScales).values({
    orgId: org.id,
    name: "Alpha Sizing XS-XL",
    labels: ["XS", "S", "M", "L", "XL"],
  }).returning();

  const [scaleNumeric] = await db.insert(schema.sizeScales).values({
    orgId: org.id,
    name: "Numeric Womens 2-10",
    labels: ["2", "4", "6", "8", "10"],
  }).returning();

  // 7. Measurement Points
  const [mpChest] = await db.insert(schema.measurementPoints).values({
    orgId: org.id,
    code: "CHEST-WIDTH",
    description: "Chest Width (1 inch below armhole flat)",
    method: "Measure flat across body below armhole seam",
    unit: "cm",
    category: "Tops",
  }).returning();

  const [mpLength] = await db.insert(schema.measurementPoints).values({
    orgId: org.id,
    code: "BODY-LENGTH",
    description: "Body Length (HPS to hem)",
    method: "Measure from high point shoulder straight down to hem",
    unit: "cm",
    category: "Tops",
  }).returning();

  // 8. Colours Library
  const [colSand] = await db.insert(schema.colours).values({
    orgId: org.id,
    code: "CLR-SAND",
    name: "Desert Sand",
    digitalValue: "#E6D8B8",
    materialApplicability: ["Fabric", "Trim"],
  }).returning();

  const [colNavy] = await db.insert(schema.colours).values({
    orgId: org.id,
    code: "CLR-NAVY",
    name: "Midnight Navy",
    digitalValue: "#000033",
    materialApplicability: ["Fabric", "Thread"],
  }).returning();

  const [colForest] = await db.insert(schema.colours).values({
    orgId: org.id,
    code: "CLR-FOREST",
    name: "Forest Green",
    digitalValue: "#1A330E",
    materialApplicability: ["Fabric"],
  }).returning();

  // 9. Suppliers Directory
  const [supMilano] = await db.insert(schema.suppliers).values({
    orgId: org.id,
    name: "Milano Weavers Ltd",
    countries: ["Italy"],
    productCapabilities: ["Linen Weaving", "Silk Dyeing"],
    materialCapabilities: ["Linen", "Silk"],
    qualificationStatus: "Qualified",
  }).returning();

  const [supYkk] = await db.insert(schema.suppliers).values({
    orgId: org.id,
    name: "YKK Fasteners Ltd",
    countries: ["Japan", "USA"],
    productCapabilities: ["Metal Zippers", "Plastic Trims"],
    materialCapabilities: ["Zipper", "Button"],
    qualificationStatus: "Qualified",
  }).returning();

  // 10. Materials Library
  const [matLinen] = await db.insert(schema.materials).values({
    orgId: org.id,
    code: "MAT-LIN-100",
    description: "100% Belgian Premium Linen",
    type: "Fabric",
    composition: "100% Linen",
    width: "140cm",
    weight: "180gsm",
    unit: "m",
    supplierId: supMilano.id,
  }).returning();

  const [matZipper] = await db.insert(schema.materials).values({
    orgId: org.id,
    code: "MAT-ZIP-M5",
    description: "YKK Metal Zipper 15cm",
    type: "Zipper",
    composition: "Brass & Polyester",
    unit: "pcs",
    supplierId: supYkk.id,
  }).returning();

  // 11. Styles Catalog
  console.log("Seeding extensive Style records...");
  const stylesCount = 10;
  for (let i = 1; i <= stylesCount; i++) {
    const isClassic = i % 2 === 0;
    const styleName = isClassic ? `Atelier Linen Dress v${i}` : `Aero Performance Tee v${i}`;
    const styleNumber = isClassic ? `ST-CLS-D${100 + i}` : `ST-SPT-T${200 + i}`;
    const category = isClassic ? "Dresses" : "Tops";
    const seasonId = isClassic ? seasonSS28.id : seasonFW28.id;
    const brandId = isClassic ? brandClassic.id : brandSport.id;

    const [style] = await db.insert(schema.styles).values({
      orgId: org.id,
      styleNumber,
      name: styleName,
      seasonId,
      brandId,
      category,
      ownerId: designer.id,
      status: "Development",
    }).returning();

    // Brief
    await db.insert(schema.productBriefs).values({
      orgId: org.id,
      styleId: style.id,
      designObjective: `Create version ${i} of our flagship model.`,
      inspiration: "Minimalist fashion trends",
      functionalRequirements: "Breathable fabric, loose fit layout.",
      sizeRange: "XS-XL",
    });

    // Colorway
    const [cway] = await db.insert(schema.colourways).values({
      orgId: org.id,
      styleId: style.id,
      colourId: isClassic ? colSand.id : colNavy.id,
      name: isClassic ? "Desert Sands" : "Midnight",
    }).returning();

    // BOM
    await db.insert(schema.bomItems).values([
      {
        orgId: org.id,
        styleId: style.id,
        colourwayId: cway.id,
        materialId: matLinen.id,
        position: "Body",
        usageQuantity: "1.8",
        estimatedCost: "15.50",
      },
      {
        orgId: org.id,
        styleId: style.id,
        colourwayId: cway.id,
        materialId: matZipper.id,
        position: "Center Back",
        usageQuantity: "1.0",
        estimatedCost: "2.20",
      },
    ]);

    // Cost Estimate
    await db.insert(schema.costEstimates).values({
      orgId: org.id,
      styleId: style.id,
      colourwayId: cway.id,
      size: "M",
      materialsCost: "30.10",
      trimCost: "2.20",
      cmtLaborCost: "15.00",
      logisticsCost: "3.50",
      packagingCost: "1.20",
      targetMargin: "0.60",
      wholesalePrice: "130.00",
      retailPrice: "286.00",
    });

    // Sample Round
    const [round] = await db.insert(schema.sampleRounds).values({
      orgId: org.id,
      styleId: style.id,
      roundName: "Proto 1",
      status: "Evaluated",
    }).returning();

    // Fit Log
    await db.insert(schema.fitLogs).values({
      orgId: org.id,
      styleId: style.id,
      sampleRoundId: round.id,
      sampleStatus: "Changes Requested",
      fitEvaluation: "Excellent overall draping. Waistline needs tightening.",
      changesRequested: "Take in waist circumference by 1.5cm.",
    });

    // Measurement spec
    await db.insert(schema.measurementSpecifications).values({
      orgId: org.id,
      styleId: style.id,
      sampleSize: "M",
      sizeScaleId: scaleAlpha.id,
      measurementPoints: [
        {
          pointId: mpChest.id,
          baseValue: 48.0 + i,
          tolerance: 1.0,
          gradingRule: {
            type: "fixed",
            increment: 2.5,
          },
        },
        {
          pointId: mpLength.id,
          baseValue: 70.0 + i,
          tolerance: 1.5,
          gradingRule: {
            type: "perSize",
            increments: [1.0, 1.0, 1.5, 1.5, 2.0],
          },
        },
      ],
    });
  }

  // 12. Mock Audit Logs
  await db.insert(schema.auditLogs).values([
    {
      orgId: org.id,
      userId: owner.id,
      action: "Create",
      targetTable: "styles",
      targetId: "00000000-0000-0000-0000-000000000000",
      fieldName: "styleNumber",
      newValue: "ST-CLS-D101",
      ipAddress: "127.0.0.1",
      userAgent: "threadline-cli/1.0.0",
    },
    {
      orgId: org.id,
      userId: designer.id,
      action: "Update",
      targetTable: "bom_items",
      targetId: "00000000-0000-0000-0000-000000000000",
      fieldName: "usageQuantity",
      oldValue: "1.5",
      newValue: "1.8",
      ipAddress: "127.0.0.1",
      userAgent: "threadline-cli/1.0.0",
    },
  ]);

  console.log("Database seeded successfully.");
}
