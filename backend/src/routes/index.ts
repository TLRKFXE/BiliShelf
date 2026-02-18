import type { FastifyInstance } from "fastify";
import { folderRoutes } from "./folders.js";
import { healthRoute } from "./health.js";
import { tagRoutes } from "./tags.js";
import { videoRoutes } from "./videos.js";

export function registerApiRoutes(app: FastifyInstance) {
  app.register(healthRoute, { prefix: "/api" });
  app.register(folderRoutes, { prefix: "/api" });
  app.register(videoRoutes, { prefix: "/api" });
  app.register(tagRoutes, { prefix: "/api" });
}
