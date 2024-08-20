import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";

describe("Threadline PLM Milestone 4 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let styleId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m4@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m4@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m4@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m4@acme.com",
        password: "password123",
      },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M4" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m4@acme.com", password: "password123" },
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
      name: "Spring 2028",
      year: 2028,
      status: "Concept",
    }).returning();

    // Seed style
    const [style] = await db.insert(schema.styles).values({
      orgId: loginData2.orgId,
      styleNumber: "STYLE-S28-001",
      name: "Silk Slip Dress",
      seasonId: season!.id,
      brandId: brand!.id,
      category: "Dresses",
      status: "Idea",
    }).returning();
    styleId = style!.id;
  });

  it("should successfully manage size scales, measurement points, grading rules, and sample measurements validation", async () => {
    // 1. Create Size Scale
    const scaleRes = await app.inject({
      method: "POST",
      url: "/api/size-scales",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Standard Numeric Sizes",
        labels: ["XS", "S", "M", "L", "XL"],
      },
    });
    expect(scaleRes.statusCode).toBe(201);
    const scale = JSON.parse(scaleRes.body);

    // 2. Create Measurement Points
    const pt1Res = await app.inject({
      method: "POST",
      url: "/api/measurement-points",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        code: "CHEST-WIDTH",
        description: "Chest Width (1 inch below armhole)",
        method: "Measure flat across chest",
        unit: "cm",
        category: "Dresses",
      },
    });
    expect(pt1Res.statusCode).toBe(201);
    const pt1 = JSON.parse(pt1Res.body);

    const pt2Res = await app.inject({
      method: "POST",
      url: "/api/measurement-points",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        code: "BACK-LENGTH",
        description: "Center Back Length",
        method: "Measure from collar seam to hem",
        unit: "cm",
        category: "Dresses",
      },
    });
    expect(pt2Res.statusCode).toBe(201);
    const pt2 = JSON.parse(pt2Res.body);

    // 3. Create Measurement Specification (Base values, tolerances, and grading rules)
    const specRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/measurement-specifications`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        sampleSize: "M", // Base sample size is 'M' (index 2 in ['XS', 'S', 'M', 'L', 'XL'])
        sizeScaleId: scale.id,
        measurementPoints: [
          {
            pointId: pt1.id,
            baseValue: 48.0, // Base chest flat width
            tolerance: 1.0,  // +/- 1 cm
            gradingRule: {
              type: "fixed",
              increment: 2.5, // Grades up by 2.5cm, down by 2.5cm per size offset
            },
          },
          {
            pointId: pt2.id,
            baseValue: 90.0, // Base back length
            tolerance: 1.5,
            gradingRule: {
              type: "perSize",
              increments: [1.0, 1.0, 1.5, 1.5, 2.0], // Custom size offset deltas
            },
          },
        ],
      },
    });
    expect(specRes.statusCode).toBe(201);

    // 4. Fetch Graded Measurements & Validate calculations
    const gradedRes = await app.inject({
      method: "GET",
      url: `/api/styles/${styleId}/graded-measurements`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(gradedRes.statusCode).toBe(200);
    const gradedData = JSON.parse(gradedRes.body);
    expect(gradedData.labels).toEqual(["XS", "S", "M", "L", "XL"]);

    // Assert Chest Width sizing values
    const chestWidthGraded = gradedData.measurements.find((m: any) => m.pointId === pt1.id);
    expect(chestWidthGraded).toBeDefined();
    // Base M = 48. L = 48 + 2.5 = 50.5. XL = 48 + 5 = 53. XS = 48 - (2 * 2.5) = 43.
    expect(chestWidthGraded.gradings["XS"].value).toBe(43);
    expect(chestWidthGraded.gradings["M"].value).toBe(48);
    expect(chestWidthGraded.gradings["XL"].value).toBe(53);

    // Assert Back Length sizing values
    const backLengthGraded = gradedData.measurements.find((m: any) => m.pointId === pt2.id);
    expect(backLengthGraded).toBeDefined();
    expect(backLengthGraded.gradings["M"].value).toBe(90);

    // 5. Submit Sample Measurement and Validate Deviation/Tolerance Checks
    // Expected chest width is 48.0, tolerance is 1.0.
    // actual = 48.5 (deviation = 0.5) -> should Pass
    const samplePassRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/sample-measurements`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        sampleRound: "Proto 1",
        measurementPointId: pt1.id,
        measuredValue: 48.5,
      },
    });
    expect(samplePassRes.statusCode).toBe(201);
    const samplePass = JSON.parse(samplePassRes.body);
    expect(samplePass.result).toBe("Pass");
    expect(samplePass.deviation).toBe("0.5");

    // actual = 50.0 (deviation = 2.0) -> should Fail (tolerance is 1.0)
    const sampleFailRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/sample-measurements`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        sampleRound: "Proto 1",
        measurementPointId: pt1.id,
        measuredValue: 50.0,
      },
    });
    expect(sampleFailRes.statusCode).toBe(201);
    const sampleFail = JSON.parse(sampleFailRes.body);
    expect(sampleFail.result).toBe("Fail");
    expect(sampleFail.deviation).toBe("2");
  });
});
