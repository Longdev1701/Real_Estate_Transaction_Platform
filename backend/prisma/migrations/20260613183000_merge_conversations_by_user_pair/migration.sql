CREATE TEMP TABLE "_ConversationDuplicateMap" AS
WITH ranked_conversations AS (
    SELECT
        id,
        "buyerId",
        "sellerId",
        ROW_NUMBER() OVER (
            PARTITION BY "buyerId", "sellerId"
            ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
        ) AS rn
    FROM "Conversation"
),
keepers AS (
    SELECT
        id AS keeper_id,
        "buyerId",
        "sellerId"
    FROM ranked_conversations
    WHERE rn = 1
)
SELECT
    rc.id AS duplicate_id,
    k.keeper_id
FROM ranked_conversations rc
JOIN keepers k
  ON k."buyerId" = rc."buyerId"
 AND k."sellerId" = rc."sellerId"
WHERE rc.rn > 1;

UPDATE "Message" m
SET "conversationId" = d.keeper_id
FROM "_ConversationDuplicateMap" d
WHERE m."conversationId" = d.duplicate_id;

UPDATE "Conversation" c
SET "deletedByIds" = merged.merged_deleted_by_ids
FROM (
    SELECT
        d.keeper_id,
        COALESCE(
            ARRAY(
                SELECT DISTINCT deleted_id
                FROM (
                    SELECT UNNEST(c1."deletedByIds") AS deleted_id
                    FROM "Conversation" c1
                    WHERE c1.id = d.keeper_id
                    UNION ALL
                    SELECT UNNEST(c2."deletedByIds") AS deleted_id
                    FROM "Conversation" c2
                    JOIN "_ConversationDuplicateMap" d2 ON d2.duplicate_id = c2.id
                    WHERE d2.keeper_id = d.keeper_id
                ) merged_ids
            ),
            ARRAY[]::TEXT[]
        ) AS merged_deleted_by_ids
    FROM "_ConversationDuplicateMap" d
    GROUP BY d.keeper_id
) merged
WHERE c.id = merged.keeper_id;

DELETE FROM "Conversation" c
USING "_ConversationDuplicateMap" d
WHERE c.id = d.duplicate_id;

DROP TABLE "_ConversationDuplicateMap";

DROP INDEX "Conversation_buyerId_sellerId_postId_key";

CREATE UNIQUE INDEX "Conversation_buyerId_sellerId_key" ON "Conversation"("buyerId", "sellerId");
