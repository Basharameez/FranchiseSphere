import { buildApp } from "./app.js";

const app = buildApp();
const port = parseInt(process.env.PORT || "3000");

async function start() {
  try {
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Threadline PLM API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
