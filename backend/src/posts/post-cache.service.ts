import { redisClient } from "../config/redis.js";
import { clearHomeCache } from "../home/home.service.js";

type PostsListCacheEntry = {
  expiresAt: number;
  data: {
    items: Array<Record<string, unknown>>;
    meta: {
      page: number;
      limit: number;
      total: number | null;
      totalPages: number | null;
      hasMore: boolean;
    };
  };
};

type PostDetailCacheEntry<TData = unknown> = {
  expiresAt: number;
  data: TData;
};

const postsCache = new Map<string, PostsListCacheEntry>();
const localPostDetailCache = new Map<string, PostDetailCacheEntry>();

export const buildPostDetailCacheKey = (postId: string) => `posts:detail:base:${postId}`;

export const getPostsListCache = (cacheKey: string) => {
  const cached = postsCache.get(cacheKey);
  return cached && cached.expiresAt > Date.now() ? cached.data : null;
};

export const setPostsListCache = (cacheKey: string, data: PostsListCacheEntry["data"], ttlMs: number) => {
  postsCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const getLocalPostDetailCache = <TData>(cacheKey: string) => {
  const cached = localPostDetailCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }

  return cached.data as TData;
};

export const setLocalPostDetailCache = <TData>(cacheKey: string, data: TData, ttlMs: number) => {
  localPostDetailCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const clearPostListAndDetailCaches = () => {
  postsCache.clear();
  localPostDetailCache.clear();
};

export const invalidatePostDetailCache = async (postId: string) => {
  const cacheKey = buildPostDetailCacheKey(postId);
  localPostDetailCache.delete(cacheKey);

  if (redisClient?.isOpen) {
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.warn("Failed to delete Redis cache key:", error);
    }
  }
};

export const invalidatePostReadCaches = async (postId?: string) => {
  clearPostListAndDetailCaches();
  clearHomeCache();

  if (postId) {
    await invalidatePostDetailCache(postId);
  }
};
