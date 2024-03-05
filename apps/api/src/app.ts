import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { authRoutes } from "./routes/auth.js";
import { seasonsRoutes } from "./routes/seasons.js";
import { materialsRoutes } from "./routes/materials.js";
import { measurementsRoutes } from "./routes/measurements.js";
import { costingRoutes } from "./routes/costing.js";
import { approvalsRoutes } from "./routes/approvals.js";
import { reportsRoutes } from "./routes/reports.js";
import { commentsRoutes } from "./routes/comments.js";

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS
  fastify.register(cors, {
    origin: "*",
  });

  // Enable Rate Limiting (bypass or scale in tests)
  const isTest = process.env.NODE_ENV === "test";
  fastify.register(rateLimit, {
    max: isTest ? 100000 : 100,
    timeWindow: "1 minute",
  });

  // Register Routes
  fastify.register(authRoutes, { prefix: "/api/auth" });
  fastify.register(seasonsRoutes, { prefix: "/api" });
  fastify.register(materialsRoutes, { prefix: "/api" });
  fastify.register(measurementsRoutes, { prefix: "/api" });
  fastify.register(costingRoutes, { prefix: "/api" });
  fastify.register(approvalsRoutes, { prefix: "/api" });
  fastify.register(reportsRoutes, { prefix: "/api" });
  fastify.register(commentsRoutes, { prefix: "/api" });

  fastify.get("/health", async () => {
    return { status: "ok", service: "Threadline PLM API" };
  });

  return fastify;
}
