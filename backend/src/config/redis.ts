import { createClient } from "redis";

// Default Redis URL or load from environment
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Pub/Sub clients for Socket.IO Adapter
export const pubClient = createClient({ url: REDIS_URL });
export const subClient = pubClient.duplicate();

// Create a general client for state management (e.g. online users)
export const redisClient = createClient({ url: REDIS_URL });

// Connect to Redis
export const redisConnectPromise = Promise.all([
  pubClient.connect(),
  subClient.connect(),
  redisClient.connect()
]).then(() => {
  console.log("Connected to Redis successfully");
}).catch((err) => {
  console.error("Redis connection error:", err);
});

// Error handling to prevent app crash
pubClient.on("error", (err) => console.error("Redis PubClient Error", err));
subClient.on("error", (err) => console.error("Redis SubClient Error", err));
redisClient.on("error", (err) => console.error("Redis Client Error", err));
