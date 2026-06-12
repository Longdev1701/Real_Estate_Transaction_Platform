CREATE INDEX IF NOT EXISTS "RefreshToken_userId_revokedAt_idx"
ON "RefreshToken"("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "RefreshToken_revokedAt_idx"
ON "RefreshToken"("revokedAt");

CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx"
ON "RefreshToken"("expiresAt");
