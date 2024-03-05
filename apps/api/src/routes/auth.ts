import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "@threadline/security";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { requireAuth } from "../middleware/auth.js";

// Input Validation Schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const VerifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totpCode: z.string().optional(),
});

const RefreshSchema = z.object({
  refreshToken: z.string(),
});

const CreateOrgSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.string(),
});

const AcceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  // 1. Register User
  fastify.post("/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = RegisterSchema.parse(request.body);

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existing) {
      return reply.status(400).send({ error: "Email already registered" });
    }

    const verificationToken = randomBytes(32).toString("hex");
    const passwordHash = hashPassword(password);

    const [newUser] = await db.insert(schema.users).values({
      email,
      passwordHash,
      isVerified: false,
      emailVerificationToken: verificationToken,
    }).returning();

    // Log the token so tests can retrieve it without real mail servers
    fastify.log.info(`[Email Verification] Token for ${email}: ${verificationToken}`);

    return reply.status(201).send({
      message: "Registration successful. Please verify your email.",
      userId: newUser?.id,
    });
  });

  // 2. Verify Email
  fastify.post("/verify-email", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, token } = VerifyEmailSchema.parse(request.body);

    const user = await db.query.users.findFirst({
      where: and(
        eq(schema.users.email, email),
        eq(schema.users.emailVerificationToken, token)
      ),
    });

    if (!user) {
      return reply.status(400).send({ error: "Invalid verification token or email" });
    }

    await db.update(schema.users)
      .set({ isVerified: true, emailVerificationToken: null })
      .where(eq(schema.users.id, user.id));

    return reply.send({ message: "Email verified successfully." });
  });

  // 3. Login
  fastify.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, totpCode } = LoginSchema.parse(request.body);

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return reply.status(403).send({ error: "Email not verified" });
    }

    // TOTP validation mock
    if (user.totpEnabled) {
      if (!totpCode || totpCode !== "123456") {
        return reply.status(401).send({ error: "Invalid MFA passcode" });
      }
    }

    // Find user's membership to get org and role
    const membership = await db.query.memberships.findFirst({
      where: eq(schema.memberships.userId, user.id),
    });

    const orgId = membership?.orgId || "00000000-0000-0000-0000-000000000000";
    const role = membership?.role || "Visitor";

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save session first to get auto-generated ID
    const [newSession] = await db.insert(schema.sessions).values({
      userId: user.id,
      token: "TEMP_TOKEN",
      expiresAt,
      isRevoked: false,
    }).returning();

    if (!newSession) {
      return reply.status(500).send({ error: "Failed to create session" });
    }

    const sessionId = newSession.id;

    // Generate tokens
    const accessToken = generateToken({ userId: user.id, orgId, role, sessionId }, 900); // 15 mins
    const refreshToken = generateToken({ userId: user.id, orgId, role, sessionId }, 7 * 24 * 3600); // 7 days

    // Update session with actual refresh token
    await db.update(schema.sessions)
      .set({ token: refreshToken })
      .where(eq(schema.sessions.id, sessionId));

    return reply.send({ accessToken, refreshToken, orgId, role });
  });

  // 4. Refresh Token Rotation (with replay detection!)
  fastify.post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = RefreshSchema.parse(request.body);

    const decoded = verifyToken(refreshToken);
    if (!decoded || !decoded.userId) {
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }

    // Lookup session
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.token, refreshToken),
    });

    if (!session) {
      // REPLAY DETECTION TRIGGERED:
      // If a refresh token is reused but not in database, it means it was rotated/deleted.
      // Revoke all sessions for this user for security.
      await db.update(schema.sessions)
        .set({ isRevoked: true })
        .where(eq(schema.sessions.userId, decoded.userId));

      return reply.status(401).send({ error: "Replay attack detected. All active sessions invalidated." });
    }

    if (session.isRevoked || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Session is revoked or expired" });
    }

    // Rotate tokens
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextAccessToken = generateToken({
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
      sessionId: session.id,
    }, 900);

    const nextRefreshToken = generateToken({
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
      sessionId: session.id,
    }, 7 * 24 * 3600);

    // Update existing session
    await db.update(schema.sessions)
      .set({
        token: nextRefreshToken,
        expiresAt: newExpiresAt,
      })
      .where(eq(schema.sessions.id, session.id));

    return reply.send({ accessToken: nextAccessToken, refreshToken: nextRefreshToken });
  });

  // 5. Logout
  fastify.post("/logout", { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded && decoded.sessionId) {
        await db.update(schema.sessions)
          .set({ isRevoked: true })
          .where(eq(schema.sessions.id, decoded.sessionId));
      }
    }
    return reply.send({ message: "Successfully logged out" });
  });

  // 6. Create Organization (Setup Multi-Tenancy)
  fastify.post("/organization", { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, description } = CreateOrgSchema.parse(request.body);
    const userId = request.user!.userId;

    const [org] = await db.insert(schema.organizations).values({
      name,
      description,
    }).returning();

    // Assign as Organization Owner
    if (org) {
      await db.insert(schema.memberships).values({
        userId,
        orgId: org.id,
        role: "Organization Owner",
      });
    }

    return reply.status(201).send(org);
  });

  // 7. Invite Member
  fastify.post("/invite", { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is Organization Owner
    if (request.user!.role !== "Organization Owner") {
      return reply.status(403).send({ error: "Forbidden: Only Organization Owners can invite members" });
    }

    const { email, role } = CreateInviteSchema.parse(request.body);
    const inviteToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours

    const [invite] = await db.insert(schema.invitations).values({
      orgId: request.user!.orgId,
      email,
      role,
      token: inviteToken,
      expiresAt,
    }).returning();

    fastify.log.info(`[Invitation Sent] Token for ${email}: ${inviteToken}`);

    return reply.status(201).send({
      message: "Invitation sent",
      inviteId: invite?.id,
    });
  });

  // 8. Accept Invite
  fastify.post("/accept-invite", async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = AcceptInviteSchema.parse(request.body);

    const invite = await db.query.invitations.findFirst({
      where: eq(schema.invitations.token, token),
    });

    if (!invite || invite.status !== "Pending" || invite.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Invalid, expired, or already processed invitation" });
    }

    // Check if user already exists
    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, invite.email),
    });

    if (!user) {
      const passwordHash = hashPassword(password);
      const [newUser] = await db.insert(schema.users).values({
        email: invite.email,
        passwordHash,
        isVerified: true,
      }).returning();
      user = newUser;
    }

    // Create membership
    if (user) {
      await db.insert(schema.memberships).values({
        userId: user.id,
        orgId: invite.orgId,
        role: invite.role,
      });

      // Mark invitation accepted
      await db.update(schema.invitations)
        .set({ status: "Accepted" })
        .where(eq(schema.invitations.id, invite.id));
    }

    return reply.send({ message: "Invitation accepted successfully." });
  });

  // 9. API Key Management
  fastify.post("/api-keys", { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user!.role !== "Organization Owner") {
      return reply.status(403).send({ error: "Forbidden: Only Organization Owners can create API keys" });
    }

    const prefix = randomBytes(4).toString("hex");
    const rawKey = `tl_${prefix}_${randomBytes(24).toString("hex")}`;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000); // 1 year

    await db.insert(schema.apiKeys).values({
      orgId: request.user!.orgId,
      label: "Production Key",
      prefix,
      hashedKey,
      expiresAt,
    });

    return reply.status(201).send({ apiKey: rawKey });
  });

  // 10. Enable TOTP MFA Setup
  fastify.post("/mfa/setup", { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const totpSecret = "totp-secret-12345";
    await db.update(schema.users)
      .set({ totpSecret, totpEnabled: true, recoveryCodes: ["rec1", "rec2"] })
      .where(eq(schema.users.id, request.user!.userId));

    return reply.send({ secret: totpSecret, recoveryCodes: ["rec1", "rec2"] });
  });
}
