import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemToken(token: string): string {
  if (token.length <= 4) {
    return token;
  }

  const suffixes = ["ingly", "edly", "ing", "ed", "es", "s"];
  for (const suffix of suffixes) {
    if (token.endsWith(suffix) && token.length > suffix.length + 2) {
      return token.slice(0, -suffix.length);
    }
  }

  return token;
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .map(stemToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function createNGrams(text: string, size: number): Set<string> {
  const compact = normalizeText(text).replace(/\s+/g, " ");
  const grams = new Set<string>();

  if (compact.length <= size) {
    if (compact) {
      grams.add(compact);
    }
    return grams;
  }

  for (let index = 0; index <= compact.length - size; index++) {
    grams.add(compact.slice(index, index + size));
  }

  return grams;
}

function diceCoefficient(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const leftItems = Array.from(left);
  let overlap = 0;
  for (const gram of leftItems) {
    if (right.has(gram)) {
      overlap++;
    }
  }

  return (2 * overlap) / (left.size + right.size);
}

function scoreChunk(text: string, query: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);

  if (!normalizedQuery || !normalizedText) {
    return 0;
  }

  const queryTokens = tokenize(query);
  const chunkTokens = tokenize(text);
  const chunkTokenSet = new Set(chunkTokens);

  let score = 0;

  for (const token of queryTokens) {
    if (chunkTokenSet.has(token)) {
      score += token.length >= 6 ? 3 : 2;
      continue;
    }

    if (Array.from(chunkTokenSet).some((chunkToken) => chunkToken.startsWith(token) || token.startsWith(chunkToken))) {
      score += 1;
    }
  }

  if (normalizedText.includes(normalizedQuery)) {
    score += 12;
  }

  const queryBigrams = new Set(
    queryTokens.slice(0, -1).map((token, index) => `${token} ${queryTokens[index + 1]}`)
  );
  for (const bigram of queryBigrams) {
    if (normalizedText.includes(bigram)) {
      score += 4;
    }
  }

  const queryTrigrams = createNGrams(normalizedQuery, 3);
  const textTrigrams = createNGrams(normalizedText, 3);
  score += diceCoefficient(queryTrigrams, textTrigrams) * 10;

  const queryCoverage =
    queryTokens.length > 0
      ? queryTokens.filter((token) => chunkTokenSet.has(token)).length / queryTokens.length
      : 0;
  score += queryCoverage * 6;

  return Number(score.toFixed(4));
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
    const chunks: Array<{ _id: any }> = args.documentId
      ? await ctx.runQuery(internal.chunks.getChunksByDocument, {
          documentId: args.documentId,
        })
      : await ctx.runQuery(internal.chunks.getAllChunks, {});

    const scoredChunks: Array<{
      text: string;
      chunkIndex: number;
      pageNumber?: number;
      documentName: string;
      similarity: number;
    }> = await Promise.all(
      chunks.map(async (chunk: { _id: any }) => {
        const details = await ctx.runQuery(internal.chunks.getChunkDetails, {
          chunkId: chunk._id,
        });

        const text = details?.text || "";
        return {
          text,
          chunkIndex: details?.chunkIndex || 0,
          pageNumber: details?.pageNumber,
          documentName: details?.documentName || "Unknown",
          similarity: scoreChunk(text, args.queryText),
        };
      })
    );

    const rankedChunks = scoredChunks
      .filter((chunk: {
        text: string;
        chunkIndex: number;
        pageNumber?: number;
        documentName: string;
        similarity: number;
      }) => chunk.text.trim().length > 0)
      .sort((a, b) => b.similarity - a.similarity || a.chunkIndex - b.chunkIndex);

    const relevantChunks = rankedChunks
      .filter((chunk) => chunk.similarity >= 1.25)
      .slice(0, limit);

    if (relevantChunks.length > 0) {
      return relevantChunks;
    }

    return rankedChunks.slice(0, Math.min(limit, 2));
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
