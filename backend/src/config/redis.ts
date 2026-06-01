import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;
export const isRedisEnabled = Boolean(REDIS_URL);

export const pubClient = isRedisEnabled ? createClient({ url: REDIS_URL }) : null;
export const subClient = pubClient?.duplicate() ?? null;
export const redisClient = isRedisEnabled ? createClient({ url: REDIS_URL }) : null;

export const redisConnectPromise =
  pubClient && subClient && redisClient
    ? Promise.all([
        pubClient.connect(),
        subClient.connect(),
        redisClient.connect(),
      ])
        .then(() => {
          console.log("Connected to Redis successfully");
          return true;
        })
        .catch((err) => {
          console.warn("Redis unavailable, socket will use in-memory fallback.", err?.message ?? err);
          return false;
        })
    : Promise.resolve(false);

pubClient?.on("error", (err) => console.warn("Redis PubClient unavailable:", err?.message ?? err));
subClient?.on("error", (err) => console.warn("Redis SubClient unavailable:", err?.message ?? err));
redisClient?.on("error", (err) => console.warn("Redis Client unavailable:", err?.message ?? err));
