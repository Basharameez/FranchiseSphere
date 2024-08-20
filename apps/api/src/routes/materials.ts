import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@threadline/database";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

// Input validation
const CreateSupplierSchema = z.object({
  name: z.string().min(2),
  countries: z.array(z.string()).optional(),
  productCapabilities: z.array(z.string()).optional(),
  materialCapabilities: z.array(z.string()).optional(),
  leadTime: z.string().optional(),
  contactRoles: z.array(z.record(z.any())).optional(),
  qualificationStatus: z.string().optional(),
});

const CreateMaterialSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  composition: z.string().optional(),
  colourCapability: z.string().optional(),
  width: z.string().optional(),
  weight: z.string().optional(),
  unit: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  confidentiality: z.enum(["Public", "Internal", "Confidential"]).optional(),
});

const CreateSpecificationSchema = z.object({
  supplierId: z.string().uuid(),
  composition: z.string().min(2),
  construction: z.string().optional(),
  weight: z.string().optional(),
  width: z.string().optional(),
  finish: z.string().optional(),
  careInstructions: z.string().optional(),
  colourReferences: z.array(z.string()).optional(),
  minOrder: z.string().optional(),
  leadTime: z.string().optional(),
  costEstimate: z.string().min(1),
  currency: z.string().optional(),
  approvalStatus: z.string().optional(),
});

const CreateColourSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  digitalValue: z.string().min(3),
  materialApplicability: z.array(z.string()).optional(),
});

const CreateColourwaySchema = z.object({
  colourId: z.string().uuid(),
  name: z.string().min(2),
  materialMapping: z.record(z.any()).optional(),
});

export async function materialsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  // 1. Create Supplier
  fastify.post("/suppliers", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateSupplierSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [supplier] = await db.insert(schema.suppliers).values({
      orgId,
      name: data.name,
      countries: data.countries || [],
      productCapabilities: data.productCapabilities || [],
      materialCapabilities: data.materialCapabilities || [],
      leadTime: data.leadTime,
      contactRoles: data.contactRoles || [],
      qualificationStatus: data.qualificationStatus || "Unqualified",
    }).returning();

    return reply.status(201).send(supplier);
  });

  // 2. Get Suppliers
  fastify.get("/suppliers", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const list = await db.query.suppliers.findMany({
      where: eq(schema.suppliers.orgId, orgId),
    });
    return reply.send(list);
  });

  // 3. Create Material
  fastify.post("/materials", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateMaterialSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [material] = await db.insert(schema.materials).values({
      orgId,
      code: data.code,
      description: data.description,
      type: data.type,
      composition: data.composition,
      colourCapability: data.colourCapability,
      width: data.width,
      weight: data.weight,
      unit: data.unit || "m",
      supplierId: data.supplierId,
      confidentiality: data.confidentiality || "Internal",
    }).returning();

    return reply.status(201).send(material);
  });

  // 4. Create Material Specification (Approved spec is immutable)
  fastify.post("/materials/:id/specifications", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const materialId = request.params.id;
    const data = CreateSpecificationSchema.parse(request.body);

    // Verify material exists
    const material = await db.query.materials.findFirst({
      where: and(eq(schema.materials.id, materialId), eq(schema.materials.orgId, orgId)),
    });

    if (!material) {
      return reply.status(404).send({ error: "Material record not found" });
    }

    const [spec] = await db.insert(schema.materialSpecifications).values({
      orgId,
      materialId,
      supplierId: data.supplierId,
      composition: data.composition,
      construction: data.construction,
      weight: data.weight,
      width: data.width,
      finish: data.finish,
      careInstructions: data.careInstructions,
      colourReferences: data.colourReferences || [],
      minOrder: data.minOrder,
      leadTime: data.leadTime,
      costEstimate: data.costEstimate,
      currency: data.currency || "USD",
      approvalStatus: data.approvalStatus || "Draft",
    }).returning();

    return reply.status(201).send(spec);
  });

  // 4b. Update Material Specification (Enforcing immutability if Approved!)
  fastify.put("/material-specifications/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const specId = request.params.id;
    const data = CreateSpecificationSchema.parse(request.body);

    const existingSpec = await db.query.materialSpecifications.findFirst({
      where: and(eq(schema.materialSpecifications.id, specId), eq(schema.materialSpecifications.orgId, orgId)),
    });

    if (!existingSpec) {
      return reply.status(404).send({ error: "Specification not found" });
    }

    // IMMUTABILITY ENFORCEMENT:
    // If the specification is already Approved, reject any modifications!
    if (existingSpec.approvalStatus === "Approved") {
      return reply.status(400).send({ error: "Bad Request: Approved material specifications are immutable and cannot be updated" });
    }

    const [updated] = await db.update(schema.materialSpecifications)
      .set({
        composition: data.composition,
        construction: data.construction,
        weight: data.weight,
        width: data.width,
        finish: data.finish,
        careInstructions: data.careInstructions,
        colourReferences: data.colourReferences || [],
        minOrder: data.minOrder,
        leadTime: data.leadTime,
        costEstimate: data.costEstimate,
        currency: data.currency || "USD",
        approvalStatus: data.approvalStatus || "Draft",
      })
      .where(eq(schema.materialSpecifications.id, specId))
      .returning();

    return reply.send(updated);
  });

  // 5. Create Colour
  fastify.post("/colours", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = CreateColourSchema.parse(request.body);
    const orgId = request.user!.orgId;

    const [colour] = await db.insert(schema.colours).values({
      orgId,
      code: data.code,
      name: data.name,
      digitalValue: data.digitalValue,
      materialApplicability: data.materialApplicability || [],
    }).returning();

    return reply.status(201).send(colour);
  });

  // 6. Create Style Colourway mapping
  fastify.post("/styles/:id/colourways", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const orgId = request.user!.orgId;
    const styleId = request.params.id;
    const data = CreateColourwaySchema.parse(request.body);

    // Verify style exists
    const style = await db.query.styles.findFirst({
      where: and(eq(schema.styles.id, styleId), eq(schema.styles.orgId, orgId)),
    });

    if (!style) {
      return reply.status(404).send({ error: "Style record not found" });
    }

    const [colourway] = await db.insert(schema.colourways).values({
      orgId,
      styleId,
      colourId: data.colourId,
      name: data.name,
      materialMapping: data.materialMapping || {},
      status: "Active",
      approvalStatus: "Draft",
    }).returning();

    return reply.status(201).send(colourway);
  });
}
