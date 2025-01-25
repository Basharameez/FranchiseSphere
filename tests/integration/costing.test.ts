import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";

describe("Threadline PLM Milestone 5 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let styleId: string;
  let colourwayId: string;
  let materialId: string;
  let supplierId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m5@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m5@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m5@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m5@acme.com",
        password: "password123",
      },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M5" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m5@acme.com", password: "password123" },
    });
    const loginData2 = JSON.parse(loginRes2.body);
    ownerToken = loginData2.accessToken;

    // Seed brand
    const [brand] = await db.insert(schema.brands).values({
      orgId: loginData2.orgId,
      name: "Acme Brand",
    }).returning();

    // Seed season
    const [season] = await db.insert(schema.seasons).values({
      orgId: loginData2.orgId,
      name: "Summer 2028",
      year: 2028,
      status: "Concept",
    }).returning();

    // Seed style
    const [style] = await db.insert(schema.styles).values({
      orgId: loginData2.orgId,
      styleNumber: "STYLE-S28-002",
      name: "Cotton Summer Short",
      seasonId: season!.id,
      brandId: brand!.id,
      category: "Bottoms",
      status: "Idea",
    }).returning();
    styleId = style!.id;

    // Seed colour
    const [colour] = await db.insert(schema.colours).values({
      orgId: loginData2.orgId,
      code: "CLR-NAVY-01",
      name: "Ocean Navy",
      digitalValue: "#000080",
    }).returning();

    // Seed colourway
    const [colourway] = await db.insert(schema.colourways).values({
      orgId: loginData2.orgId,
      styleId: styleId,
      colourId: colour!.id,
      name: "Navy Colourway",
    }).returning();
    colourwayId = colourway!.id;

    // Seed supplier
    const [supplier] = await db.insert(schema.suppliers).values({
      orgId: loginData2.orgId,
      name: "Cotton Mill Inc",
      qualificationStatus: "Qualified",
    }).returning();
    supplierId = supplier!.id;

    // Seed material
    const [material] = await db.insert(schema.materials).values({
      orgId: loginData2.orgId,
      code: "MAT-COTTON-02",
      description: "Organic Twill Cotton",
      type: "Fabric",
      supplierId: supplierId,
    }).returning();
    materialId = material!.id;
  });

  it("should successfully manage BOM, cost estimates margins, and supplier quote price tiers", async () => {
    // 1. Create Supplier Quote with Price Tiers
    const quoteRes = await app.inject({
      method: "POST",
      url: "/api/supplier-quotes",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        supplierId,
        materialId,
        priceTiers: [
          { minQty: 100, price: 12.5 },
          { minQty: 500, price: 10.0 },
        ],
        minOrder: "100m",
        leadTime: "30 days",
      },
    });
    expect(quoteRes.statusCode).toBe(201);
    const quote = JSON.parse(quoteRes.body);
    expect(quote.priceTiers).toBeDefined();

    // 2. Add BOM Item
    const bomRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/bom`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        colourwayId,
        materialId,
        position: "Main Body",
        usageQuantity: "1.2",
        unit: "m",
        wastageMultiplier: "1.1",
        estimatedCost: "12.50",
      },
    });
    expect(bomRes.statusCode).toBe(201);

    // 3. Fetch BOM Items
    const getBomRes = await app.inject({
      method: "GET",
      url: `/api/styles/${styleId}/bom`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(getBomRes.statusCode).toBe(200);
    const bomList = JSON.parse(getBomRes.body);
    expect(bomList.length).toBe(1);

    // 4. Create Cost Estimate (with Wholesale and Retail Margin calculations)
    // materialsCost = 15.00, trimCost = 2.00, cmtLaborCost = 10.00, logisticsCost = 3.00, packaging = 1.00, duty = 2.00
    // Total COGS = 15 + 2 + 10 + 3 + 1 + 2 = 33.00
    // Target Margin = 60% (0.60)
    // wholesale = 33.00 / (1 - 0.60) = 33.00 / 0.40 = 82.50
    // retail = 82.50 * 2.2 = 181.50
    const costRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/cost-estimates`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        colourwayId,
        size: "M",
        materialsCost: "15.00",
        trimCost: "2.00",
        cmtLaborCost: "10.00",
        logisticsCost: "3.00",
        packagingCost: "1.00",
        dutyCost: "2.00",
        targetMargin: "0.60",
      },
    });
    expect(costRes.statusCode).toBe(201);
    const estimate = JSON.parse(costRes.body);
    expect(estimate.wholesalePrice).toBe("82.50");
    expect(estimate.retailPrice).toBe("181.50");
  });
});
