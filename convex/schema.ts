import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    name: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    createdAt: v.number(),
  }),

  chunks: defineTable({
    documentId: v.id("documents"),
    text: v.string(),
    embedding: v.array(v.float64()),
    pageNumber: v.optional(v.number()),
    chunkIndex: v.number(),
  }).vectorIndex("by_groq_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["documentId"],
  }),

  conversations: defineTable({
    title: v.string(),
    documentId: v.optional(v.id("documents")),
    createdAt: v.number(),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(v.object({
      documentName: v.string(),
      chunkText: v.string(),
      pageNumber: v.optional(v.number()),
    }))),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
});
