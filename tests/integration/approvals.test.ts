import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql, eq } from "drizzle-orm";

describe("Threadline PLM Milestone 6 Integration Tests", () => {
  const app = buildApp();
  let ownerToken: string;
  let styleId: string;

  beforeAll(async () => {
    // Register owner
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer-m6@acme.com",
        password: "password123",
      },
    });

    const user = await db.query.users.findFirst({
      where: sql`email = 'designer-m6@acme.com'`,
    });

    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer-m6@acme.com",
        token: user?.emailVerificationToken,
      },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer-m6@acme.com",
        password: "password123",
      },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co M6" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "designer-m6@acme.com", password: "password123" },
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
      name: "Autumn 2028",
      year: 2028,
      status: "Concept",
    }).returning();

    // Seed style
    const [style] = await db.insert(schema.styles).values({
      orgId: loginData2.orgId,
      styleNumber: "STYLE-A28-001",
      name: "Wool Cable Sweater",
      seasonId: season!.id,
      brandId: brand!.id,
      category: "Knitwear",
      status: "Idea",
    }).returning();
    styleId = style!.id;
  });

  it("should successfully manage sample rounds, fit logs, and approval workflows", async () => {
    // 1. Request Sample Round Proto 1
    const roundRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/sample-rounds`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        roundName: "Proto 1",
        comments: "Request initial knit gauge sample",
      },
    });
    expect(roundRes.statusCode).toBe(201);
    const round = JSON.parse(roundRes.body);
    expect(round.status).toBe("Requested");

    // 2. Log Fit Evaluation
    const fitRes = await app.inject({
      method: "POST",
      url: `/api/styles/${styleId}/fit-logs`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        sampleRoundId: round.id,
        modelReference: "Model-01",
        sampleStatus: "Changes Requested",
        fitEvaluation: "Sweater is too tight around collar seam.",
        changesRequested: "Increase collar width by 2cm.",
        photoKey: "sketches/fits/wool_sweater_collar.jpg",
      },
    });
    expect(fitRes.statusCode).toBe(201);
    const fitLog = JSON.parse(fitRes.body);
    expect(fitLog.sampleStatus).toBe("Changes Requested");

    // Verify sample round status became Evaluated
    const updatedRound = await db.query.sampleRounds.findFirst({
      where: eq(schema.sampleRounds.id, round.id),
    });
    expect(updatedRound?.status).toBe("Evaluated");

    // 3. Initiate and process Approval Workflow
    // Start as Draft
    const app1 = await app.inject({
      method: "POST",
      url: "/api/approvals",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        targetType: "Style",
        targetId: styleId,
        status: "Draft",
        comments: "Draft approval request",
      },
    });
    expect(app1.statusCode).toBe(201);
    const approvalData = JSON.parse(app1.body);
    expect(approvalData.status).toBe("Draft");

    // Submit for Review
    const app2 = await app.inject({
      method: "POST",
      url: "/api/approvals",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        targetType: "Style",
        targetId: styleId,
        status: "Submitted",
        comments: "Submitted for final signature",
      },
    });
    expect(app2.statusCode).toBe(200);
    const approvalData2 = JSON.parse(app2.body);
    expect(approvalData2.status).toBe("Submitted");

    // Approve & Sign
    const app3 = await app.inject({
      method: "POST",
      url: "/api/approvals",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        targetType: "Style",
        targetId: styleId,
        status: "Approved",
        comments: "Fit verified. Style approved for release.",
      },
    });
    expect(app3.statusCode).toBe(200);
    const approvalData3 = JSON.parse(app3.body);
    expect(approvalData3.status).toBe("Approved");
    expect(approvalData3.signatureToken).toContain("SIG-");
    expect(approvalData3.decisionAt).toBeDefined();
  });
});
