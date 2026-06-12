import { prisma } from "../prisma/prisma.service.js";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 500;
const MAX_BATCHES_PER_RUN = 10;
const REVOKED_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let cleanupJobStarted = false;

const collectExpiredRefreshTokenIds = async () => {
  const revokedBefore = new Date(Date.now() - REVOKED_TOKEN_RETENTION_MS);

  return prisma.refreshToken.findMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          revokedAt: {
            not: null,
            lt: revokedBefore,
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: CLEANUP_BATCH_SIZE,
    select: { id: true },
  });
};

const cleanupRefreshTokens = async () => {
  let totalDeleted = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const expiredTokens = await collectExpiredRefreshTokenIds();

    if (!expiredTokens.length) {
      break;
    }

    const ids = expiredTokens.map((token) => token.id);
    const result = await prisma.refreshToken.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    totalDeleted += result.count;

    if (expiredTokens.length < CLEANUP_BATCH_SIZE) {
      break;
    }
  }

  if (totalDeleted > 0) {
    console.info("[auth-cleanup] deleted refresh tokens:", totalDeleted);
  }
};

export const startRefreshTokenCleanupJob = () => {
  if (cleanupJobStarted) {
    return;
  }

  cleanupJobStarted = true;

  cleanupRefreshTokens().catch((error) => {
    console.error("[auth-cleanup] initial cleanup failed:", error);
  });

  setInterval(() => {
    cleanupRefreshTokens().catch((error) => {
      console.error("[auth-cleanup] scheduled cleanup failed:", error);
    });
  }, CLEANUP_INTERVAL_MS);
};

