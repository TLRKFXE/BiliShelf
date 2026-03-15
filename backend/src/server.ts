import { createApp } from "./app.js";
import { env } from "./config.js";
import { initDb } from "./db/init.js";

async function start() {
  initDb();
  const app = createApp();

  try {
    await app.listen({
      host: "127.0.0.1",
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
