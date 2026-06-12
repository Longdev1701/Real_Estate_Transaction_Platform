import { app } from "./app.js";
import { startRefreshTokenCleanupJob } from "./auth/auth.cleanup.js";
import { startAuthMetricsReporter } from "./auth/auth.observability.js";
import { PORT } from "./config/env.js";
import { createServer } from "http";
import { initializeSocket } from "./socket/socket.js";
import { redisConnectPromise } from "./config/redis.js";

const httpServer = createServer(app);

startRefreshTokenCleanupJob();
startAuthMetricsReporter();

redisConnectPromise.then(() => {
  // Initialize Socket.io only after Redis is connected
  initializeSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server due to Redis connection error:", err);
});
