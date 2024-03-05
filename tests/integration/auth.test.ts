import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../apps/api/src/app.js";
import { db, schema } from "@threadline/database";
import { sql } from "drizzle-orm";
import { requireAuth } from "../../apps/api/src/middleware/auth.js";
import { validateFileName, validateFileBuffer, sanitizeSVG, validateZipArchive } from "@threadline/document-security";

describe("Threadline PLM Milestone 0 & 1 Integration Tests", () => {
  const app = buildApp();

  beforeAll(async () => {
    // Clear tables before running tests
    await db.execute(sql`TRUNCATE TABLE users, organizations, brands, memberships, sessions, invitations, api_keys CASCADE`);
  });

  afterAll(async () => {
    // Clean up connections
  });

  it("should successfully run lifecycle of registration, email verification, login, and token rotation", async () => {
    // 1. Register User
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "designer@example.com",
        password: "password123",
      },
    });
    expect(regRes.statusCode).toBe(201);
    const regData = JSON.parse(regRes.body);
    expect(regData.userId).toBeDefined();

    // Retrieve verification token from database directly for test
    const user = await db.query.users.findFirst({
      where: sql`email = 'designer@example.com'`,
    });
    expect(user?.isVerified).toBe(false);
    expect(user?.emailVerificationToken).toBeDefined();

    // 2. Verify Email
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: {
        email: "designer@example.com",
        token: user?.emailVerificationToken,
      },
    });
    expect(verifyRes.statusCode).toBe(200);

    // 3. Login User
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "designer@example.com",
        password: "password123",
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginData = JSON.parse(loginRes.body);
    expect(loginData.accessToken).toBeDefined();
    expect(loginData.refreshToken).toBeDefined();

    // 4. Create Organization (Setup Multi-Tenancy)
    const orgRes = await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: {
        authorization: `Bearer ${loginData.accessToken}`,
      },
      payload: {
        name: "Acme Fashion",
        description: "Fictional apparel designer company",
      },
    });
    expect(orgRes.statusCode).toBe(201);
    const orgData = JSON.parse(orgRes.body);
    expect(orgData.id).toBeDefined();

    // 5. Setup TOTP MFA
    const mfaSetup = await app.inject({
      method: "POST",
      url: "/api/auth/mfa/setup",
      headers: {
        authorization: `Bearer ${loginData.accessToken}`,
      },
    });
    expect(mfaSetup.statusCode).toBe(200);

    // 6. Rotate token successfully
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: loginData.refreshToken,
      },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshData = JSON.parse(refreshRes.body);
    expect(refreshData.accessToken).toBeDefined();
    expect(refreshData.refreshToken).toBeDefined();

    // 7. Verify Replay Attack Invalidation
    // Replaying the old rotated refresh token should trigger invalidation
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: {
        refreshToken: loginData.refreshToken,
      },
    });
    expect(replayRes.statusCode).toBe(401);

    // Check that all sessions for this user are now revoked
    const activeSession = await db.query.sessions.findFirst({
      where: sql`user_id = ${user?.id} AND is_revoked = false`,
    });
    expect(activeSession).toBeUndefined();
  });

  it("should successfully invite team member and accept invitation", async () => {
    // Register owner
    const regOwner = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "owner@acme.com",
        password: "password123",
      },
    });
    const ownerData = JSON.parse(regOwner.body);
    const user = await db.query.users.findFirst({ where: sql`email = 'owner@acme.com'` });
    await app.inject({
      method: "POST",
      url: "/api/auth/verify-email",
      payload: { email: "owner@acme.com", token: user?.emailVerificationToken },
    });

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "owner@acme.com", password: "password123" },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    // Create organization
    await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Design Co" },
    });

    // Login again to get refreshed access token with Owner role and orgId
    const loginRes2 = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "owner@acme.com", password: "password123" },
    });
    const { accessToken: ownerAccessToken } = JSON.parse(loginRes2.body);

    // Invite team member
    const inviteRes = await app.inject({
      method: "POST",
      url: "/api/auth/invite",
      headers: { authorization: `Bearer ${ownerAccessToken}` },
      payload: {
        email: "sourcing@acme.com",
        role: "Sourcing Coordinator",
      },
    });
    expect(inviteRes.statusCode).toBe(201);

    const invite = await db.query.invitations.findFirst({
      where: sql`email = 'sourcing@acme.com'`,
    });
    expect(invite?.status).toBe("Pending");

    // Accept invite
    const acceptRes = await app.inject({
      method: "POST",
      url: "/api/auth/accept-invite",
      payload: {
        token: invite?.token,
        password: "password456",
      },
    });
    expect(acceptRes.statusCode).toBe(200);

    const acceptedInvite = await db.query.invitations.findFirst({
      where: sql`email = 'sourcing@acme.com'`,
    });
    expect(acceptedInvite?.status).toBe("Accepted");

    // Check membership exists
    const memberUser = await db.query.users.findFirst({ where: sql`email = 'sourcing@acme.com'` });
    const membership = await db.query.memberships.findFirst({
      where: sql`user_id = ${memberUser?.id}`,
    });
    expect(membership?.role).toBe("Sourcing Coordinator");
  });

  it("should create API keys and authorize requests", async () => {
    // Login as owner to generate key
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "owner@acme.com", password: "password123" },
    });
    const { accessToken } = JSON.parse(loginRes.body);

    const keyRes = await app.inject({
      method: "POST",
      url: "/api/auth/api-keys",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(keyRes.statusCode).toBe(201);
    const { apiKey } = JSON.parse(keyRes.body);
    expect(apiKey).toBeDefined();

    // Verify key works
    const testRouteRes = await app.inject({
      method: "POST",
      url: "/api/auth/organization",
      headers: {
        "x-api-key": apiKey,
      },
      payload: { name: "Another Org" },
    });
    // It should allow creation
    expect(testRouteRes.statusCode).toBe(201);
  });

  it("should enforce document security validations", () => {
    // 1. Filename validation
    expect(validateFileName("sketch.png")).toBe(true);
    expect(validateFileName("../sketch.png")).toBe(false);

    // 2. MIME signatures
    const dummyPdf = Buffer.from("%PDF-1.4 ... dummy content");
    const dummyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const badBuffer = Buffer.from("invalid content");

    expect(validateFileBuffer(dummyPdf, "application/pdf").isValid).toBe(true);
    expect(validateFileBuffer(dummyPng, "image/png").isValid).toBe(true);
    expect(validateFileBuffer(badBuffer, "image/png").isValid).toBe(false);

    // 3. SVG sanitization
    const cleanSvg = `<svg><rect width="10" height="10"/></svg>`;
    const evilSvg = `<svg><script>alert(1)</script></svg>`;

    expect(sanitizeSVG(cleanSvg).isValid).toBe(true);
    expect(sanitizeSVG(evilSvg).isValid).toBe(false);

    // 4. ZIP traversal / bomb checks
    const badZip = Buffer.from("PK\x03\x04...../../file.txt");
    expect(validateZipArchive(badZip).isValid).toBe(false);
  });
});
