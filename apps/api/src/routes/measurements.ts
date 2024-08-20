import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { calculateGradedValue, validateSampleMeasurement } from "@threadline/measurement-engine";

// Input Validation
const CreateSizeScaleSchema = z.object({
  name: z.string().min(1),
  labels: z.array(z.string()).min(1),
});

const CreateMeasurementPointSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(2),
  method: z.string().optional(),
  unit: z.string().default("cm"),
  category: z.string().min(1),
});

const CreateSpecSchema = z.object({
  sampleSize: z.string().min(1), // e.g. "M"
  sizeScaleId: z.string().uuid(),
  measurementPoints: z.array(z.object({
    pointId: z.string().uuid(),
    baseValue: z.number(),
    tolerance: z.number(),
    gradingRule: z.object({
      type: z.enum(["fixed", "perSize", "manual"]),
      increment: z.number().optional(),
      increments: z.array(z.number()).optional(),
      manualValues: z.record(z.number()).optional(),
    }),
  })),
  version: z.number().int().optional(),
});

const EnterSampleSchema = z.object({
  sampleRound: z.string().min(1),
  measurementPointId: z.string().uuid(),
  measuredValue: z.number(),
  reviewerId: z.string().uuid().optional(),
});

export async function measurementsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Create Size Scale
  fastify.post("/size-scales", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateSizeScaleSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [scale] = await db.insert(schema.sizeScales).values({
      orgId,
      name: data.name,
      labels: data.labels,
    }).returning();

    return reply.status(201).send(scale);
  });

  // 2. Create Measurement Point
  fastify.post("/measurement-points", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateMeasurementPointSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [point] = await db.insert(schema.measurementPoints).values({
      orgId,
      code: data.code,
      description: data.description,
      method: data.method,
      unit: data.unit,
      category: data.category,
    }).returning();

    return reply.status(201).send(point);
  });

  // 3. Create Measurement Specification for Style
  fastify.post("/styles/:id/measurement-specifications", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = CreateSpecSchema.parse(request.body);

    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const [spec] = await db.insert(schema.measurementSpecifications).values({
      orgId,
      styleId,
      sampleSize: data.sampleSize,
      sizeScaleId: data.sizeScaleId,
      measurementPoints: data.measurementPoints,
      baseValues: {}, // raw meta if needed
      tolerances: {},
      gradingRules: {},
      version: data.version || 1,
      approvalStatus: "Draft",
    }).returning();

    return reply.status(201).send(spec);
  });

  // 4. Calculate & Fetch Graded Measurements for All Sizes
  fastify.get("/styles/:id/graded-measurements", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;

    const spec = await db.query.measurementSpecifications.findFirst({
      where: and(
        eq(schema.measurementSpecifications.styleId, styleId),
        eq(schema.measurementSpecifications.orgId, orgId)
      ),
    });

    if (!spec) {
      return reply.status(404).send({ error: "Measurement specifications not found for style" });
    }

    const scale = await db.query.sizeScales.findFirst({
      where: eq(schema.sizeScales.id, spec.sizeScaleId),
    });

    if (!scale) {
      return reply.status(404).send({ error: "Size scale reference not found" });
    }

    const labels = scale.labels as string[];

    // Parse size index of the base sample size
    const baseIndex = labels.indexOf(spec.sampleSize);
    if (baseIndex === -1) {
      return reply.status(400).send({ error: `Base size ${spec.sampleSize} not found in scale labels` });
    }

    // Graded mapping output
    const outputs: any[] = [];
    const pts = spec.measurementPoints as any[];

    for (const pt of pts) {
      // Find point details
      const pointDetails = await db.query.measurementPoints.findFirst({
        where: eq(schema.measurementPoints.id, pt.pointId),
      });

      const sizeGradings: Record<string, any> = {};

      labels.forEach((label: string, idx: number) => {
        const result = calculateGradedValue(pt.baseValue, {
          type: pt.gradingRule.type,
          increment: pt.gradingRule.increment,
          increments: pt.gradingRule.increments,
          manualValues: pt.gradingRule.manualValues,
          baseSizeIndex: baseIndex,
        }, idx, label);

        sizeGradings[label] = {
          value: result.value,
          trace: result.trace,
        };
      });

      outputs.push({
        pointId: pt.pointId,
        code: pointDetails?.code || "UNKNOWN",
        description: pointDetails?.description || "",
        unit: pointDetails?.unit || "cm",
        baseValue: pt.baseValue,
        tolerance: pt.tolerance,
        gradings: sizeGradings,
      });
    }

    return reply.send({
      styleId,
      sampleSize: spec.sampleSize,
      sizeScaleName: scale.name,
      labels,
      measurements: outputs,
    });
  });

  // 5. Submit Sample Measurement and Validate Deviation/Tolerances
  fastify.post("/styles/:id/sample-measurements", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = EnterSampleSchema.parse(request.body);

    const spec = await db.query.measurementSpecifications.findFirst({
      where: and(
        eq(schema.measurementSpecifications.styleId, styleId),
        eq(schema.measurementSpecifications.orgId, orgId)
      ),
    });

    if (!spec) {
      return reply.status(404).send({ error: "Measurement specification template not found" });
    }

    // Find the expected base value and tolerance for this measurement point
    const pts = spec.measurementPoints as any[];
    const ptMatch = pts.find(p => p.pointId === data.measurementPointId);
    if (!ptMatch) {
      return reply.status(400).send({ error: "Measurement point is not defined in style specifications" });
    }

    // Calculate pass/fail deviation
    const expected = ptMatch.baseValue;
    const tolerance = ptMatch.tolerance;
    const actual = data.measuredValue;

    const engineResult = validateSampleMeasurement(expected, tolerance, actual);

    const [sample] = await db.insert(schema.sampleMeasurements).values({
      orgId,
      styleId,
      sampleRound: data.sampleRound,
      measurementPointId: data.measurementPointId,
      expectedValue: expected.toString(),
      tolerance: tolerance.toString(),
      measuredValue: actual.toString(),
      deviation: engineResult.deviation.toString(),
      result: engineResult.result,
      reviewerId: request.user!.userId,
    }).returning();

    return reply.status(201).send({
      ...sample,
      deviationPercent: engineResult.deviationPercent,
    });
  });
}
