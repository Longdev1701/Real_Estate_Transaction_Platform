import { app } from "./app.js";
import { PORT } from "./config/env.js";
import { createServer } from "http";
import { initializeSocket } from "./socket/socket.js";

const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
