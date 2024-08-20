import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";

describe("Threadline PLM Milestone 3 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let styleId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m3@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m3@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m3@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m3@acme.com",
        password: "password123",
      },
    });
    const { accessToken, orgId } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M3" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m3@acme.com", password: "password123" },
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
      name: "Fall Winter 2027",
      year: 2027,
      status: "Concept",
    }).returning();

    // Seed style
    const [style] = await db.insert(schema.styles).values({
      orgId: loginData2.orgId,
      styleNumber: "STYLE-FW27-001",
      name: "Linen Trench Coat",
      seasonId: season!.id,
      brandId: brand!.id,
      category: "Outerwear",
      status: "Idea",
    }).returning();
    styleId = style!.id;
  });

  it("should successfully manage suppliers, materials, specifications immutability, colours, and colourways", async () => {
    // 1. Create Supplier
    const supplierRes = await app.inject({
      method: "POST",
      url: "/api/suppliers",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Acme Fabric Mills",
        countries: ["Italy"],
        productCapabilities: ["Weaving", "Dyeing"],
        materialCapabilities: ["Linen", "Cotton"],
      },
    });
    expect(supplierRes.statusCode).toBe(201);
    const supplier = JSON.parse(supplierRes.body);
    expect(supplier.id).toBeDefined();

    // 2. Create Material
    const materialRes = await app.inject({
      method: "POST",
      url: "/api/materials",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        code: "MAT-LINEN-100",
        description: "100% Belgian Linen",
        type: "Fabric",
        composition: "100% Linen",
        supplierId: supplier.id,
      },
    });
    expect(materialRes.statusCode).toBe(201);
    const material = JSON.parse(materialRes.body);

    // 3. Create Material Specification (Draft status)
    const specRes = await app.inject({
      method: "POST",
      url: `/api/materials/${material.id}/specifications`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        supplierId: supplier.id,
        composition: "100% Linen",
        construction: "Plain weave",
        costEstimate: "18.50",
        currency: "USD",
        approvalStatus: "Draft",
      },
    });
    expect(specRes.statusCode).toBe(201);
    const spec = JSON.parse(specRes.body);

    // 4. Update Draft Specification (Should succeed)
    const updateDraftRes = await app.inject({
      method: "PUT",
      url: `/api/material-specifications/${spec.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        supplierId: supplier.id,
        composition: "100% Linen (Premium)",
        costEstimate: "19.00",
        approvalStatus: "Approved", // Promote to Approved
      },
    });
    expect(updateDraftRes.statusCode).toBe(200);

    // 5. Attempt Update Approved Specification (Immutability check - Should fail!)
    const updateApprovedRes = await app.inject({
      method: "PUT",
      url: `/api/material-specifications/${spec.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        supplierId: supplier.id,
        composition: "100% Linen (Violated)",
        costEstimate: "25.00",
        approvalStatus: "Approved",
      },
    });
    expect(updateApprovedRes.statusCode).toBe(400);
    const errorMsg = JSON.parse(updateApprovedRes.body).error;
    expect(errorMsg).toContain("immutable");

    // 6. Create Colour
    const colourRes = await app.inject({
      method: "POST",
      url: "/api/colours",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        code: "CLR-SAND-01",
        name: "Desert Sand",
        digitalValue: "#E6D8B8",
      },
    });
    expect(colourRes.statusCode).toBe(201);
    const colour = JSON.parse(colourRes.body);

    // 7. Map Colourway for active style
    const colourwayRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/colourways`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        colourId: colour.id,
        name: "Desert Sand Colourway",
        materialMapping: {
          shell: material.id,
        },
      },
    });
    expect(colourwayRes.statusCode).toBe(201);
  });
});
