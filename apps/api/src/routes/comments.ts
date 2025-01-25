import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

// Input validation
const AddCommentSchema = z.object({
  targetType: z.enum(["Style", "Material", "FitLog"]),
  targetId: z.string().uuid(),
  commentText: z.string().min(1),
  mentions: z.array(z.string().uuid()).optional(),
});

export async function commentsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Post Comment & Trigger Notifications/Activity logs
  fastify.post("/comments", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = AddCommentSchema.parse(request.body);
    const orgId = request.user!.orgId;
    const authorId = request.user!.userId;

    const [comment] = await db.insert(schema.comments).values({
      orgId,
      targetType: data.targetType,
      targetId: data.targetId,
      authorId,
      commentText: data.commentText,
      mentions: data.mentions || [],
    }).returning();

    // Log Activity Stream
    await db.insert(schema.activities).values({
      orgId,
      performerId: authorId,
      action: "Commented",
      targetType: data.targetType,
      targetId: data.targetId,
      description: `User posted a comment on ${data.targetType}: "${data.commentText.slice(0, 30)}..."`,
    });

    // Create notifications for @mentioned users
    const mentions = data.mentions || [];
    for (const mentionUserId of mentions) {
      await db.insert(schema.notifications).values({
        orgId,
        recipientId: mentionUserId,
        message: `You were mentioned in a comment: "${data.commentText.slice(0, 50)}"`,
        targetType: data.targetType,
        targetId: data.targetId,
      });
    }

    return reply.status(201).send(comment);
  });

  // 2. Fetch target comments
  fastify.get("/comments/:targetType/:targetId", async (request: FastifyRequest<{ Params: { targetType: string; targetId: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const { targetType, targetId } = request.params;

    const list = await db.query.comments.findMany({
      where: and(
        eq(schema.comments.targetType, targetType),
        eq(schema.comments.targetId, targetId),
        eq(schema.comments.orgId, orgId)
      ),
      orderBy: [desc(schema.comments.createdAt)],
    });

    return reply.send(list);
  });

  // 3. Retrieve notifications list
  fastify.get("/notifications", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const recipientId = request.user!.userId;

    const list = await db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.recipientId, recipientId),
        eq(schema.notifications.orgId, orgId),
        eq(schema.notifications.status, "Unread")
      ),
      orderBy: [desc(schema.notifications.createdAt)],
    });

    return reply.send(list);
  });

  // 4. Mark notification as read
  fastify.put("/notifications/:id/read", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const recipientId = request.user!.userId;
    const notificationId = request.params.id;

    const [updated] = await db.update(schema.notifications)
      .set({ status: "Read" })
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.recipientId, recipientId),
        eq(schema.notifications.orgId, orgId)
      ))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: "Notification not found or access denied" });
    }

    return reply.send(updated);
  });

  // 5. Fetch Activity streams
  fastify.get("/activities", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;

    const list = await db.query.activities.findMany({
      where: eq(schema.activities.orgId, orgId),
      orderBy: [desc(schema.activities.createdAt)],
    });

    return reply.send(list);
  });
}
