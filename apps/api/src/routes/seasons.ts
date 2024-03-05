import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateFileName, validateFileBuffer } from "@threadline/document-security";
import { createHash } from "crypto";

// Request Schemas
const CreateSeasonSchema = z.object({
  name: z.string().min(2),
  year: z.number().int().min(2000),
  deliveryWindow: z.string().optional(),
  designFreezeDate: z.string().datetime().optional(),
  sampleDeadlines: z.array(z.string().datetime()).optional(),
  costingDeadline: z.string().datetime().optional(),
  releaseDate: z.string().datetime().optional(),
  status: z.string().optional(),
});

const CreateCollectionSchema = z.object({
  seasonId: z.string().uuid(),
  name: z.string().min(2),
  categories: z.array(z.string()),
  targetStyleCount: z.number().int().nonnegative().optional(),
  colourStrategy: z.string().optional(),
  priceBandMetadata: z.record(z.any()).optional(),
  deliveryGroups: z.array(z.string()).optional(),
});

const CreateStyleSchema = z.object({
  styleNumber: z.string().min(1),
  name: z.string().min(2),
  seasonId: z.string().uuid(),
  brandId: z.string().uuid(),
  category: z.string().min(1),
  confidentiality: z.enum(["Public", "Internal", "Confidential"]).optional(),
});

const SaveBriefSchema = z.object({
  designObjective: z.string().optional(),
  inspiration: z.string().optional(),
  functionalRequirements: z.string().optional(),
  targetDelivery: z.string().optional(),
  targetCost: z.record(z.any()).optional(),
  colourDirection: z.string().optional(),
  materialDirection: z.string().optional(),
  sizeRange: z.string().optional(),
  sustainability: z.string().optional(),
});

const AttachFileSchema = z.object({
  fileName: z.string(),
  fileContentBase64: z.string(),
  fileType: z.string(),
});

export async function seasonsRoutes(fastify: FastifyInstance) {
  // Apply auth middleware to all endpoints here
  fastify.addHook("preHandler", requireAuth);

  // 1. Create Season
  fastify.post("/seasons", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateSeasonSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [season] = await db.insert(schema.seasons).values({
      orgId,
      name: data.name,
      year: data.year,
      deliveryWindow: data.deliveryWindow,
      designFreezeDate: data.designFreezeDate ? new Date(data.designFreezeDate) : null,
      sampleDeadlines: data.sampleDeadlines || [],
      costingDeadline: data.costingDeadline ? new Date(data.costingDeadline) : null,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
      ownerId: request.user!.userId,
      status: data.status || "Concept",
    }).returning();

    return reply.status(201).send(season);
  });

  // 2. Get Seasons
  fastify.get("/seasons", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const list = await db.query.seasons.findMany({
      where: eq(schema.seasons.orgId, orgId),
    });
    return reply.send(list);
  });

  // 3. Create Collection Plan
  fastify.post("/collections", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateCollectionSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [collection] = await db.insert(schema.collectionPlans).values({
      orgId,
      seasonId: data.seasonId,
      name: data.name,
      categories: data.categories,
      targetStyleCount: data.targetStyleCount || 0,
      colourStrategy: data.colourStrategy,
      priceBandMetadata: data.priceBandMetadata || {},
      deliveryGroups: data.deliveryGroups || [],
      approvalStatus: "Draft",
    }).returning();

    return reply.status(201).send(collection);
  });

  // 4. Create Style Record
  fastify.post("/styles", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateStyleSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [style] = await db.insert(schema.styles).values({
      orgId,
      styleNumber: data.styleNumber,
      name: data.name,
      seasonId: data.seasonId,
      brandId: data.brandId,
      category: data.category,
      ownerId: request.user!.userId,
      confidentiality: data.confidentiality || "Internal",
      status: "Idea",
    }).returning();

    return reply.status(201).send(style);
  });

  // 5. Get Style detail
  fastify.get("/styles/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;

    const style = await db.query.styles.findFirst({
      where: and(
        eq(schema.styles.id, styleId),
        eq(schema.styles.orgId, orgId)
      ),
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

    return reply.send({ ...style, brief, files });
  });

  // 6. Save/Update Product Brief
  fastify.post("/styles/:id/brief", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = SaveBriefSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const existingBrief = await db.query.productBriefs.findFirst({
      where: eq(schema.productBriefs.styleId, styleId),
    });

    if (existingBrief) {
      const [updated] = await db.update(schema.productBriefs)
        .set({
          designObjective: data.designObjective,
          inspiration: data.inspiration,
          functionalRequirements: data.functionalRequirements,
          targetDelivery: data.targetDelivery,
          targetCost: data.targetCost || {},
          colourDirection: data.colourDirection,
          materialDirection: data.materialDirection,
          sizeRange: data.sizeRange,
          sustainability: data.sustainability,
        })
        .where(eq(schema.productBriefs.id, existingBrief.id))
        .returning();
      return reply.send(updated);
    } else {
      const [newBrief] = await db.insert(schema.productBriefs).values({
        orgId,
        styleId,
        designObjective: data.designObjective,
        inspiration: data.inspiration,
        functionalRequirements: data.functionalRequirements,
        targetDelivery: data.targetDelivery,
        targetCost: data.targetCost || {},
        colourDirection: data.colourDirection,
        materialDirection: data.materialDirection,
        sizeRange: data.sizeRange,
        sustainability: data.sustainability,
      }).returning();
      return reply.status(201).send(newBrief);
    }
  });

  // 7. Attach Design File (with Document Security scan!)
  fastify.post("/styles/:id/files", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const { fileName, fileContentBase64, fileType } = AttachFileSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    // 1. Filename validation
    if (!validateFileName(fileName)) {
      return reply.status(400).send({ error: "Invalid file name (traversal attempt or special characters rejected)" });
    }

    const buffer = Buffer.from(fileContentBase64, "base64");

    // 2. MIME and Signature verification
    const securityCheck = validateFileBuffer(buffer, fileType);
    if (!securityCheck.isValid) {
      return reply.status(400).send({ error: securityCheck.error });
    }

    // Calculate checksum and mock upload key
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const fileKey = `sketches/${orgId}/${styleId}/${checksum}`;

    const [designFile] = await db.insert(schema.designFiles).values({
      orgId,
      styleId,
      fileName,
      fileKey,
      fileType,
      checksum,
      uploadedById: request.user!.userId,
    }).returning();

    return reply.status(201).send(designFile);
  });
}
