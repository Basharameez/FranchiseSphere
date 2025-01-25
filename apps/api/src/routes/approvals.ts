import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { randomBytes } from "crypto";

// Input validation
const RequestSampleRoundSchema = z.object({
  roundName: z.string().min(1), // Proto 1, Proto 2, Fit Sample, etc.
  requestedDate: z.string().datetime().optional(),
  comments: z.string().optional(),
});

const LogFitSchema = z.object({
  sampleRoundId: z.string().uuid(),
  fitDate: z.string().datetime().optional(),
  modelReference: z.string().optional(),
  sampleStatus: z.string().min(1), // e.g. "Changes Requested", "Pass"
  fitEvaluation: z.string().optional(),
  changesRequested: z.string().optional(),
  photoKey: z.string().optional(),
});

const SubmitApprovalSchema = z.object({
  targetType: z.enum(["Style", "BOM", "Specification"]),
  targetId: z.string().uuid(),
  status: z.enum(["Draft", "Submitted", "Reviewing", "Approved", "Rejected"]),
  comments: z.string().optional(),
});

export async function approvalsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Request Sample Round
  fastify.post("/styles/:id/sample-rounds", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = RequestSampleRoundSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const [round] = await db.insert(schema.sampleRounds).values({
      orgId,
      styleId,
      roundName: data.roundName,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : new Date(),
      status: "Requested",
      comments: data.comments,
    }).returning();

    return reply.status(201).send(round);
  });

  // 2. Record Fit Log
  fastify.post("/styles/:id/fit-logs", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = LogFitSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    // Verify sample round exists
    const round = await db.query.sampleRounds.findFirst({
      where: and(eq(schema.sampleRounds.id, data.sampleRoundId), eq(schema.sampleRounds.styleId, styleId)),
    });

    if (!round) {
      return reply.status(404).send({ error: "Sample round reference not found for style" });
    }

    // Update round status to Evaluated
    await db.update(schema.sampleRounds)
      .set({ status: "Evaluated", receivedDate: new Date() })
      .where(eq(schema.sampleRounds.id, round.id));

    const [fitLog] = await db.insert(schema.fitLogs).values({
      orgId,
      styleId,
      sampleRoundId: data.sampleRoundId,
      fitDate: data.fitDate ? new Date(data.fitDate) : new Date(),
      modelReference: data.modelReference,
      sampleStatus: data.sampleStatus,
      fitEvaluation: data.fitEvaluation,
      changesRequested: data.changesRequested,
      photoKey: data.photoKey,
    }).returning();

    return reply.status(201).send(fitLog);
  });

  // 3. Submit or Review Approval (Draft -> Submitted -> Approved/Rejected workflow)
  fastify.post("/approvals", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const data = SubmitApprovalSchema.parse(request.body);

    // Look for existing approval record for target
    const existingApproval = await db.query.approvals.findFirst({
      where: and(
        eq(schema.approvals.targetType, data.targetType),
        eq(schema.approvals.targetId, data.targetId),
        eq(schema.approvals.orgId, orgId)
      ),
    });

    // If setting to Approved or Rejected, generate review signature token
    const signatureToken = (data.status === "Approved" || data.status === "Rejected")
      ? `SIG-${randomBytes(16).toString("hex").toUpperCase()}`
      : null;

    if (existingApproval) {
      const [updated] = await db.update(schema.approvals)
        .set({
          status: data.status,
          reviewerId: request.user!.userId,
          comments: data.comments,
          signatureToken: signatureToken || existingApproval.signatureToken,
          decisionAt: signatureToken ? new Date() : existingApproval.decisionAt,
        })
        .where(eq(schema.approvals.id, existingApproval.id))
        .returning();
      return reply.send(updated);
    } else {
      const [newApproval] = await db.insert(schema.approvals).values({
        orgId,
        targetType: data.targetType,
        targetId: data.targetId,
        status: data.status,
        reviewerId: request.user!.userId,
        comments: data.comments,
        signatureToken: signatureToken || undefined,
        decisionAt: signatureToken ? new Date() : undefined,
      }).returning();
      return reply.status(201).send(newApproval);
    }
  });
}
