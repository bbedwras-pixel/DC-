import { createApiServer } from "./api.js";
import { env } from "./config.js";
import { startDiscordBot } from "./bot.js";

const app = createApiServer();

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

startDiscordBot().catch((error) => {
  console.error("Failed to start Discord bot:", error);
});
