import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreChunk(text: string, query: string): number {
  const queryTokens = tokenize(query);
  const chunkTokens = new Set(tokenize(text));

  let score = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) {
      score += 1;
    }
  }

  if (text.toLowerCase().includes(query.toLowerCase())) {
    score += 3;
  }

  return score;
}

/**
 * Bulk insert chunks with embeddings (internal mutation)
 */
export const saveChunks = internalMutation({
  args: {
    chunks: v.array(v.object({
      documentId: v.id("documents"),
      text: v.string(),
      embedding: v.array(v.float64()),
      pageNumber: v.optional(v.number()),
      chunkIndex: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    for (const chunk of args.chunks) {
      await ctx.db.insert("chunks", {
        documentId: chunk.documentId,
        text: chunk.text,
        embedding: chunk.embedding,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
      });
    }
  },
});

/**
 * Search for similar chunks using vector similarity
 * This is an internal action because it uses ctx.vectorSearch
 */
export const similaritySearch = internalAction({
  args: {
    queryText: v.string(),
    documentId: v.optional(v.id("documents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const chunks = args.documentId
      ? await ctx.runQuery(internal.chunks.getChunksByDocument, {
          documentId: args.documentId,
        })
      : await ctx.runQuery(internal.chunks.getAllChunks, {});

    const scoredChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const details = await ctx.runQuery(internal.chunks.getChunkDetails, {
          chunkId: chunk._id,
        });

        return {
          text: details?.text || "",
          chunkIndex: details?.chunkIndex || 0,
          pageNumber: details?.pageNumber,
          documentName: details?.documentName || "Unknown",
          similarity: scoreChunk(details?.text || "", args.queryText),
        };
      })
    );

    return scoredChunks
      .filter((chunk) => chunk.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },
});

/**
 * Internal query to get chunk details with document name
 */
export const getChunkDetails = internalQuery({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    const chunk = await ctx.db.get(args.chunkId);
    if (!chunk) return null;
    const doc = await ctx.db.get(chunk.documentId);
    return {
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      documentName: doc?.name || "Unknown",
    };
  },
});

/**
 * Get chunks for a specific document (internal query)
 */
export const getChunksByDocument = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .collect();

    return chunks;
  },
});

export const getAllChunks = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("chunks").collect();
  },
});
