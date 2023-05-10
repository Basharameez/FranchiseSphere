import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, text } from "drizzle-orm/pg-core";

// 1. Users Table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  totpSecret: varchar("totp_secret", { length: 255 }),
  totpEnabled: boolean("totp_enabled").default(false).notNull(),
  recoveryCodes: jsonb("recovery_codes").default([]).notNull(), // array of strings
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 2. Organizations Table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  defaultCurrency: varchar("default_currency", { length: 10 }).default("USD").notNull(),
  defaultMeasurementUnit: varchar("default_measurement_unit", { length: 10 }).default("cm").notNull(),
  sizeConventions: jsonb("size_conventions").default([]).notNull(),
  productNumberFormat: varchar("product_number_format", { length: 50 }).default("TL-{SEASON}-{SEQ}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 3. Brands Table
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("Active").notNull(), // Active, Inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 4. Memberships Table
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).notNull(), // UserRole string
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 5. Sessions Table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 6. Invitations Table
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 50 }).default("Pending").notNull(), // Pending, Accepted, Revoked, Expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 7. API Keys Table
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  prefix: varchar("prefix", { length: 10 }).notNull(),
  hashedKey: varchar("hashed_key", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 50 }).default("Active").notNull(), // Active, Revoked
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 8. Seasons Table
export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  deliveryWindow: varchar("delivery_window", { length: 100 }),
  designFreezeDate: timestamp("design_freeze_date"),
  sampleDeadlines: jsonb("sample_deadlines").default([]).notNull(),
  costingDeadline: timestamp("costing_deadline"),
  releaseDate: timestamp("release_date"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).default("Concept").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 9. Collection Plans Table
export const collectionPlans = pgTable("collection_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  categories: jsonb("categories").default([]).notNull(),
  targetStyleCount: integer("target_style_count").default(0).notNull(),
  colourStrategy: text("colour_strategy"),
  priceBandMetadata: jsonb("price_band_metadata").default({}).notNull(),
  deliveryGroups: jsonb("delivery_groups").default([]).notNull(),
  approvalStatus: varchar("approval_status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 10. Styles Table
export const styles = pgTable("styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleNumber: varchar("style_number", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  confidentiality: varchar("confidentiality", { length: 50 }).default("Internal").notNull(),
  status: varchar("status", { length: 50 }).default("Idea").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// 11. Product Briefs Table
export const productBriefs = pgTable("product_briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  designObjective: text("design_objective"),
  inspiration: text("inspiration"),
  functionalRequirements: text("functional_requirements"),
  targetDelivery: varchar("target_delivery", { length: 100 }),
  targetCost: jsonb("target_cost").default({}).notNull(),
  colourDirection: text("colour_direction"),
  materialDirection: text("material_direction"),
  sizeRange: varchar("size_range", { length: 100 }),
  sustainability: text("sustainability"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 12. Design Files Table
export const designFiles = pgTable("design_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 13. Suppliers Table
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  countries: jsonb("countries").default([]).notNull(),
  productCapabilities: jsonb("product_capabilities").default([]).notNull(),
  materialCapabilities: jsonb("material_capabilities").default([]).notNull(),
  leadTime: varchar("lead_time", { length: 100 }),
  contactRoles: jsonb("contact_roles").default([]).notNull(),
  qualificationStatus: varchar("qualification_status", { length: 50 }).default("Unqualified").notNull(),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 14. Materials Table
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // Fabric, Lining, Elastic, Button, Zipper, etc.
  composition: text("composition"),
  colourCapability: varchar("colour_capability", { length: 100 }),
  width: varchar("width", { length: 50 }),
  weight: varchar("weight", { length: 50 }),
  unit: varchar("unit", { length: 20 }).default("m").notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  confidentiality: varchar("confidentiality", { length: 50 }).default("Internal").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 15. Material Specifications Table
export const materialSpecifications = pgTable("material_specifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").default(1).notNull(),
  composition: text("composition").notNull(),
  construction: text("construction"),
  weight: varchar("weight", { length: 50 }),
  width: varchar("width", { length: 50 }),
  finish: text("finish"),
  careInstructions: text("care_instructions"),
  colourReferences: jsonb("colour_references").default([]).notNull(),
  minOrder: varchar("min_order", { length: 50 }),
  leadTime: varchar("lead_time", { length: 50 }),
  costEstimate: varchar("cost_estimate", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  approvalStatus: varchar("approval_status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 16. Colours Table
export const colours = pgTable("colours", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  digitalValue: varchar("digital_value", { length: 50 }).notNull(), // e.g. HEX/RGB
  materialApplicability: jsonb("material_applicability").default([]).notNull(),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 17. Colourways Table
export const colourways = pgTable("colourways", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  colourId: uuid("colour_id").references(() => colours.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  materialMapping: jsonb("material_mapping").default({}).notNull(),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  imageKey: varchar("image_key", { length: 255 }),
  approvalStatus: varchar("approval_status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 18. Size Scales Table
export const sizeScales = pgTable("size_scales", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  labels: jsonb("labels").default([]).notNull(), // array of strings (e.g. ['XS', 'S', 'M'])
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 19. Measurement Points Table
export const measurementPoints = pgTable("measurement_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  method: text("method"),
  unit: varchar("unit", { length: 10 }).default("cm").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 20. Measurement Specifications Table
export const measurementSpecifications = pgTable("measurement_specifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  sampleSize: varchar("sample_size", { length: 50 }).notNull(),
  sizeScaleId: uuid("size_scale_id").references(() => sizeScales.id, { onDelete: "cascade" }).notNull(),
  measurementPoints: jsonb("measurement_points").default([]).notNull(), // JSON list mapping points
  baseValues: jsonb("base_values").default({}).notNull(),
  tolerances: jsonb("tolerances").default({}).notNull(),
  gradingRules: jsonb("grading_rules").default({}).notNull(),
  version: integer("version").default(1).notNull(),
  approvalStatus: varchar("approval_status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 21. Sample Measurements Table
export const sampleMeasurements = pgTable("sample_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  sampleRound: varchar("sample_round", { length: 50 }).notNull(),
  measurementPointId: uuid("measurement_point_id").references(() => measurementPoints.id, { onDelete: "cascade" }).notNull(),
  expectedValue: varchar("expected_value", { length: 50 }).notNull(),
  tolerance: varchar("tolerance", { length: 50 }).notNull(),
  measuredValue: varchar("measured_value", { length: 50 }).notNull(),
  deviation: varchar("deviation", { length: 50 }).notNull(),
  result: varchar("result", { length: 20 }).notNull(), // Pass or Fail
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 22. BOM Items Table
export const bomItems = pgTable("bom_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  colourwayId: uuid("colourway_id").references(() => colourways.id, { onDelete: "cascade" }).notNull(),
  materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  position: varchar("position", { length: 100 }).notNull(), // e.g. Body, Trim
  usageQuantity: varchar("usage_quantity", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("m").notNull(),
  wastageMultiplier: varchar("wastage_multiplier", { length: 20 }).default("1.0").notNull(),
  estimatedCost: varchar("estimated_cost", { length: 50 }).notNull(),
  actualCost: varchar("actual_cost", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 23. Cost Estimates Table
export const costEstimates = pgTable("cost_estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  colourwayId: uuid("colourway_id").references(() => colourways.id, { onDelete: "cascade" }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  materialsCost: varchar("materials_cost", { length: 50 }).notNull(),
  trimCost: varchar("trim_cost", { length: 50 }).default("0.0").notNull(),
  cmtLaborCost: varchar("cmt_labor_cost", { length: 50 }).notNull(),
  logisticsCost: varchar("logistics_cost", { length: 50 }).default("0.0").notNull(),
  packagingCost: varchar("packaging_cost", { length: 50 }).default("0.0").notNull(),
  dutyCost: varchar("duty_cost", { length: 50 }).default("0.0").notNull(),
  targetMargin: varchar("target_margin", { length: 50 }).default("0.0").notNull(), // percentage
  wholesalePrice: varchar("wholesale_price", { length: 50 }).notNull(),
  retailPrice: varchar("retail_price", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  status: varchar("status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 24. Supplier Quotes Table
export const supplierQuotes = pgTable("supplier_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
  materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }).notNull(),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  priceTiers: jsonb("price_tiers").default([]).notNull(), // JSON list of tiers [{minQty: 100, price: 10}]
  minOrder: varchar("min_order", { length: 50 }),
  leadTime: varchar("lead_time", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("USD").notNull(),
  qualificationRating: varchar("qualification_rating", { length: 50 }),
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 25. Sample Rounds Table
export const sampleRounds = pgTable("sample_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  roundName: varchar("round_name", { length: 50 }).notNull(), // e.g. Proto 1, Proto 2, PPS
  requestedDate: timestamp("requested_date"),
  receivedDate: timestamp("received_date"),
  status: varchar("status", { length: 50 }).default("Requested").notNull(), // Requested, Received, Evaluated
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 26. Fit Logs Table
export const fitLogs = pgTable("fit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "cascade" }).notNull(),
  sampleRoundId: uuid("sample_round_id").references(() => sampleRounds.id, { onDelete: "cascade" }).notNull(),
  fitDate: timestamp("fit_date"),
  modelReference: varchar("model_reference", { length: 100 }),
  sampleStatus: varchar("sample_status", { length: 50 }).notNull(), // e.g. Pass, Changes Requested
  fitEvaluation: text("fit_evaluation"),
  changesRequested: text("changes_requested"),
  photoKey: varchar("photo_key", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 27. Approvals Table
export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // Style, BOM, Specification
  targetId: uuid("target_id").notNull(),
  status: varchar("status", { length: 50 }).default("Draft").notNull(), // Draft, Submitted, Reviewing, Approved, Rejected
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  comments: text("comments"),
  signatureToken: varchar("signature_token", { length: 255 }),
  decisionAt: timestamp("decision_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 28. Releases Table
export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "cascade" }).notNull(),
  styleIds: jsonb("style_ids").default([]).notNull(), // list of style uuids
  status: varchar("status", { length: 50 }).default("Draft").notNull(), // Draft, Finalized
  releasedDate: timestamp("released_date"),
  releasedById: uuid("released_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 29. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // Create, Update, Delete
  targetTable: varchar("target_table", { length: 100 }).notNull(),
  targetId: uuid("target_id").notNull(),
  fieldName: varchar("field_name", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 30. Comments Table
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // Style, Material, FitLog
  targetId: uuid("target_id").notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  commentText: text("comment_text").notNull(),
  mentions: jsonb("mentions").default([]).notNull(), // list of user ids
  status: varchar("status", { length: 50 }).default("Active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 31. Notifications Table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  recipientId: uuid("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  message: text("message").notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id").notNull(),
  status: varchar("status", { length: 20 }).default("Unread").notNull(), // Unread, Read
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// 32. Activities Table
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  performerId: uuid("performer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // e.g. Commented, Approved, Released
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
