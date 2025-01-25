import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

// Input validation
const CreateReleaseSchema = z.object({
  name: z.string().min(2),
  seasonId: z.string().uuid(),
  styleIds: z.array(z.string().uuid()),
});

export async function reportsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Get complete Technical Pack for Style
  fastify.get("/styles/:id/tech-pack", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const brief = await db.query.productBriefs.findFirst({
      where: eq(schema.productBriefs.styleId, styleId),
    });

    const files = await db.query.designFiles.findMany({
      where: eq(schema.designFiles.styleId, styleId),
    });

    const bomItemsList = await db.query.bomItems.findMany({
      where: eq(schema.bomItems.styleId, styleId),
    });

    const measurementsList = await db.query.measurementSpecifications.findMany({
      where: eq(schema.measurementSpecifications.styleId, styleId),
    });

    const fitLogsList = await db.query.fitLogs.findMany({
      where: eq(schema.fitLogs.styleId, styleId),
    });

    const approvalTrack = await db.query.approvals.findFirst({
      where: and(
        eq(schema.approvals.targetType, "Style"),
        eq(schema.approvals.targetId, styleId)
      ),
    });

    // Seed audit log for tech pack export action
    await db.insert(schema.auditLogs).values({
      orgId,
      userId: request.user!.userId,
      action: "Export",
      targetTable: "styles",
      targetId: styleId,
      fieldName: "techPack",
      newValue: "Generated Technical Pack PDF/JSON",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
    });

    return reply.send({
      exportTimestamp: new Date().toISOString(),
      style,
      brief,
      sketches: files.map(f => f.fileKey),
      bom: bomItemsList,
      measurements: measurementsList,
      fitHistory: fitLogsList,
      approval: approvalTrack,
    });
  });

  // 2. Create Release Control Sheet
  fastify.post("/releases", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateReleaseSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [release] = await db.insert(schema.releases).values({
      orgId,
      name: data.name,
      seasonId: data.seasonId,
      styleIds: data.styleIds,
      status: "Draft",
    }).returning();

    // Log audit log
    await db.insert(schema.auditLogs).values({
      orgId,
      userId: request.user!.userId,
      action: "Create",
      targetTable: "releases",
      targetId: release.id,
      fieldName: "status",
      newValue: "Draft",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
    });

    return reply.status(201).send(release);
  });

  // 3. Finalize and Lock Release Control Sheet (Finalized releases are locked from modifications!)
  fastify.put("/releases/:id/finalize", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const releaseId = request.params.id;

    const existingRelease = await db.query.releases.findFirst({
      where: and(eq(schema.releases.id, releaseId), eq(schema.releases.orgId, orgId)),
    });

    if (!existingRelease) {
      return reply.status(404).send({ error: "Release not found" });
    }

    if (existingRelease.status === "Finalized") {
      return reply.status(400).send({ error: "Bad Request: Finalized releases are locked from modifications" });
    }

    const [updated] = await db.update(schema.releases)
      .set({
        status: "Finalized",
        releasedDate: new Date(),
        releasedById: request.user!.userId,
      })
      .where(eq(schema.releases.id, releaseId))
      .returning();

    // Log audit log
    await db.insert(schema.auditLogs).values({
      orgId,
      userId: request.user!.userId,
      action: "Update",
      targetTable: "releases",
      targetId: releaseId,
      fieldName: "status",
      oldValue: "Draft",
      newValue: "Finalized",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] || "Unknown",
    });

    return reply.send(updated);
  });

  // 4. Query Audit Logs Compliance Report
  fastify.get("/audit-logs", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;

    const logs = await db.query.auditLogs.findMany({
      where: eq(schema.auditLogs.orgId, orgId),
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
    });

    return reply.send(logs);
  });
}
