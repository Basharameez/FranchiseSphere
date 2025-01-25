import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

// Input validation
const AddBomItemSchema = z.object({
  colourwayId: z.string().uuid(),
  materialId: z.string().uuid(),
  position: z.string().min(1),
  usageQuantity: z.string(),
  unit: z.string().optional(),
  wastageMultiplier: z.string().optional(),
  estimatedCost: z.string(),
  actualCost: z.string().optional(),
});

const CreateCostEstimateSchema = z.object({
  colourwayId: z.string().uuid(),
  size: z.string().min(1),
  materialsCost: z.string(),
  trimCost: z.string().optional(),
  cmtLaborCost: z.string(),
  logisticsCost: z.string().optional(),
  packagingCost: z.string().optional(),
  dutyCost: z.string().optional(),
  targetMargin: z.string().optional(), // e.g. "0.60" for 60%
  currency: z.string().optional(),
});

const CreateSupplierQuoteSchema = z.object({
  supplierId: z.string().uuid(),
  materialId: z.string().uuid(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  priceTiers: z.array(z.object({
    minQty: z.number(),
    price: z.number(),
  })),
  minOrder: z.string().optional(),
  leadTime: z.string().optional(),
  qualificationRating: z.string().optional(),
});

export async function costingRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Add BOM Item to Style
  fastify.post("/styles/:id/bom", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = AddBomItemSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const [bom] = await db.insert(schema.bomItems).values({
      orgId,
      styleId,
      colourwayId: data.colourwayId,
      materialId: data.materialId,
      position: data.position,
      usageQuantity: data.usageQuantity,
      unit: data.unit || "m",
      wastageMultiplier: data.wastageMultiplier || "1.0",
      estimatedCost: data.estimatedCost,
      actualCost: data.actualCost,
    }).returning();

    return reply.status(201).send(bom);
  });

  // 2. Fetch BOM Details for Style
  fastify.get("/styles/:id/bom", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;

    const list = await db.query.bomItems.findMany({
      where: and(
        eq(schema.bomItems.styleId, styleId),
        eq(schema.bomItems.orgId, orgId)
      ),
    });

    return reply.send(list);
  });

  // 3. Create Cost Estimate (with margin calculations)
  fastify.post("/styles/:id/cost-estimates", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = CreateCostEstimateSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    // Parse costing factors
    const mat = parseFloat(data.materialsCost);
    const trim = parseFloat(data.trimCost || "0.0");
    const cmt = parseFloat(data.cmtLaborCost);
    const log = parseFloat(data.logisticsCost || "0.0");
    const pkg = parseFloat(data.packagingCost || "0.0");
    const duty = parseFloat(data.dutyCost || "0.0");
    const margin = parseFloat(data.targetMargin || "0.0"); // e.g. 0.60

    // Calculations
    const costOfGoods = mat + trim + cmt + log + pkg + duty;
    
    // wholesale = Cost of Goods / (1 - margin)
    const wholesaleVal = margin < 1 ? costOfGoods / (1 - margin) : costOfGoods;
    
    // retail = wholesale * 2.2 (industry standard markup)
    const retailVal = wholesaleVal * 2.2;

    const wholesalePrice = (Math.round(wholesaleVal * 100) / 100).toFixed(2);
    const retailPrice = (Math.round(retailVal * 100) / 100).toFixed(2);

    const [estimate] = await db.insert(schema.costEstimates).values({
      orgId,
      styleId,
      colourwayId: data.colourwayId,
      size: data.size,
      materialsCost: data.materialsCost,
      trimCost: data.trimCost || "0.0",
      cmtLaborCost: data.cmtLaborCost,
      logisticsCost: data.logisticsCost || "0.0",
      packagingCost: data.packagingCost || "0.0",
      dutyCost: data.dutyCost || "0.0",
      targetMargin: data.targetMargin || "0.0",
      wholesalePrice,
      retailPrice,
      currency: data.currency || "USD",
      status: "Draft",
    }).returning();

    return reply.status(201).send(estimate);
  });

  // 4. Create Supplier Quote
  fastify.post("/supplier-quotes", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateSupplierQuoteSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [quote] = await db.insert(schema.supplierQuotes).values({
      orgId,
      supplierId: data.supplierId,
      materialId: data.materialId,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validTo: data.validTo ? new Date(data.validTo) : null,
      priceTiers: data.priceTiers,
      minOrder: data.minOrder,
      leadTime: data.leadTime,
      qualificationRating: data.qualificationRating,
    }).returning();

    return reply.status(201).send(quote);
  });
}
