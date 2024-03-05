import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";

describe("Threadline PLM Milestone 2 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let brandId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m2@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m2@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m2@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m2@acme.com",
        password: "password123",
      },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    const orgRes = await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M2" },
    });
    const orgData = JSON.parse(orgRes.body);

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m2@acme.com", password: "password123" },
    });
    ownerToken = JSON.parse(loginRes2.body).accessToken;

    // Seed fictional brand
    const [brand] = await db.insert(schema.brands).values({
      orgId: orgData.id,
      name: "Acme Atelier",
      description: "Fictional luxury apparel brand",
    }).returning();
    brandId = brand!.id;
  });

  it("should successfully manage seasons, collection plans, style records, briefs, and files", async () => {
    // 1. Create Season
    const seasonRes = await app.inject({
      method: "POST",
      url: "/api/seasons",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Spring Summer 2027",
        year: 2027,
        deliveryWindow: "March 2027",
        designFreezeDate: new Date("2026-10-01T12:00:00Z").toISOString(),
      },
    });
    expect(seasonRes.statusCode).toBe(201);
    const season = JSON.parse(seasonRes.body);
    expect(season.id).toBeDefined();

    // 2. Create Collection Plan
    const collectionRes = await app.inject({
      method: "POST",
      url: "/api/collections",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        seasonId: season.id,
        name: "Eco-Activewear Collection",
        categories: ["Activewear", "Tops"],
        targetStyleCount: 15,
      },
    });
    expect(collectionRes.statusCode).toBe(201);

    // 3. Create Style Record
    const styleRes = await app.inject({
      method: "POST",
      url: "/api/styles",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        styleNumber: "STYLE-SS27-001",
        name: "Minimalist Linen Tank",
        seasonId: season.id,
        brandId: brandId,
        category: "Tops",
        confidentiality: "Internal",
      },
    });
    expect(styleRes.statusCode).toBe(201);
    const style = JSON.parse(styleRes.body);

    // 4. Save Product Brief
    const briefRes = await app.inject({
      method: "POST",
      url: `/api/styles/${style.id}/brief`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        designObjective: "Build a lightweight linen tank top.",
        inspiration: "Eco-minimalism",
        sizeRange: "XS-XL",
      },
    });
    expect(briefRes.statusCode).toBe(201);

    // 5. Attach Sketch Design File with valid signature check
    const validPdfBase64 = Buffer.from("%PDF-1.4 ... dummy content").toString("base64");
    const fileRes = await app.inject({
      method: "POST",
      url: `/api/styles/${style.id}/files`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        fileName: "linen_sketch.pdf",
        fileContentBase64: validPdfBase64,
        fileType: "application/pdf",
      },
    });
    expect(fileRes.statusCode).toBe(201);

    // 6. Attempt attachment with invalid file signature
    const invalidFileRes = await app.inject({
      method: "POST",
      url: `/api/styles/${style.id}/files`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        fileName: "malicious.pdf",
        fileContentBase64: Buffer.from("malicious exe payload").toString("base64"),
        fileType: "application/pdf",
      },
    });
    expect(invalidFileRes.statusCode).toBe(400);

    // 7. Get complete style detail
    const detailRes = await app.inject({
      method: "GET",
      url: `/api/styles/${style.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = JSON.parse(detailRes.body);
    expect(detail.brief).toBeDefined();
    expect(detail.files).toBeDefined();
    expect(detail.files.length).toBe(1);
  });
});
