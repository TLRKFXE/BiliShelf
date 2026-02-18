import type { FastifyPluginAsync } from "fastify";

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "bilishelf-backend",
      timestamp: new Date().toISOString()
    };
  });
};
