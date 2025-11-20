import { pgTable, uuid, varchar, timestamp, boolean, jsonb, text } from "drizzle-orm/pg-core";
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
    token: varchar("token", { length: 255 }).notNull().unique(),
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
//# sourceMappingURL=schema.js.map