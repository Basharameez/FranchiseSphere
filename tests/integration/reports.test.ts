import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";

describe("Threadline PLM Milestone 7 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let seasonId: string;
  let styleId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m7@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m7@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m7@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m7@acme.com",
        password: "password123",
      },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M7" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m7@acme.com", password: "password123" },
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
      name: "Holiday 2028",
      year: 2028,
      status: "Concept",
    }).returning();
    seasonId = season!.id;

    // Seed style
    const [style] = await db.insert(schema.styles).values({
      orgId: loginData2.orgId,
      styleNumber: "STYLE-H28-001",
      name: "Velvet Party Dress",
      seasonId: seasonId,
      brandId: brand!.id,
      category: "Dresses",
      status: "Idea",
    }).returning();
    styleId = style!.id;
  });

  it("should successfully compile tech packs, manage releases controls, and query compliance logs", async () => {
    // 1. Create a Release control sheet mapping style
    const releaseRes = await app.inject({
      method: "POST",
      url: "/api/releases",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: "Holiday 2028 Launch",
        seasonId: seasonId,
        styleIds: [styleId],
      },
    });
    expect(releaseRes.statusCode).toBe(201);
    const release = JSON.parse(releaseRes.body);
    expect(release.status).toBe("Draft");

    // 2. Finalize and lock the release sheet
    const finalizeRes = await app.inject({
      method: "PUT",
      url: `/api/releases/${release.id}/finalize`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(finalizeRes.statusCode).toBe(200);

    // 3. Attempt modification on locked release sheet (Should fail!)
    const replayFinalizeRes = await app.inject({
      method: "PUT",
      url: `/api/releases/${release.id}/finalize`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(replayFinalizeRes.statusCode).toBe(400);

    // 4. Fetch complete Technical Pack
    const techPackRes = await app.inject({
      method: "GET",
      url: `/api/styles/${styleId}/tech-pack`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(techPackRes.statusCode).toBe(200);
    const pack = JSON.parse(techPackRes.body);
    expect(pack.style).toBeDefined();
    expect(pack.exportTimestamp).toBeDefined();

    // 5. Query Audit Logs Compliance trail
    const auditRes = await app.inject({
      method: "GET",
      url: "/api/audit-logs",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(auditRes.statusCode).toBe(200);
    const logs = JSON.parse(auditRes.body);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBeDefined();
  });
});
