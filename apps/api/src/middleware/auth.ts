import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "@threadline/security";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";

export interface AuthenticatedUser {
  userId: string;
  orgId: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  // 1. Check API Key first
  const apiKeyHeader = request.headers["x-api-key"] as string;
  if (apiKeyHeader) {
    const parts = apiKeyHeader.split("_");
    if (parts.length === 3 && parts[0] === "tl") {
      const prefix = parts[1];
      const key = parts[2];
      if (prefix && key) {
        const hashed = createHash("sha256").update(apiKeyHeader).digest("hex");
        const found = await db.query.apiKeys.findFirst({
          where: and(
            eq(schema.apiKeys.prefix, prefix),
            eq(schema.apiKeys.hashedKey, hashed),
            eq(schema.apiKeys.status, "Active")
          ),
        });

        if (found) {
          if (!found.expiresAt || found.expiresAt > new Date()) {
            // Find administrator or first owner in the organization
            const owner = await db.query.memberships.findFirst({
              where: eq(schema.memberships.orgId, found.orgId),
            });
            if (owner) {
              request.user = {
                userId: owner.userId,
                orgId: found.orgId,
                role: owner.role,
              };
              return;
            }
          }
        }
      }
    }
  }

  // 2. Check Bearer Token
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized: Missing access token" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId || !decoded.orgId) {
    return reply.status(401).send({ error: "Unauthorized: Invalid or expired access token" });
  }

  // Verify session is active
  if (decoded.sessionId) {
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, decoded.sessionId),
    });
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Unauthorized: Session is revoked or expired" });
    }
  }

  // Set user context
  request.user = {
    userId: decoded.userId,
    orgId: decoded.orgId,
    role: decoded.role,
  };
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Forbidden: Insufficient permissions" });
    }
  };
}
