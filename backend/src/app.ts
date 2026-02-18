import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerApiRoutes } from "./routes/index.js";

export function createApp() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname"
              }
            }
          : undefined
    }
  });

  app.register(cors, {
    origin: true,
    credentials: true
  });

  app.register(sensible);
  registerApiRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: error.issues
      });
    }

    reply.send(error);
  });

  return app;
}
