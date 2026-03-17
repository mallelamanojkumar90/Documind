import { mutation, query } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a Convex storage upload URL for PDF files
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Save document metadata after upload
 */
export const saveDocument = mutation({
  args: {
    name: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {
      name: args.name,
      storageId: args.storageId,
      size: args.size,
      status: "pending",
      createdAt: Date.now(),
    });

    return docId;
  },
});

/**
 * Update document status (internal mutation called by ingest action)
 */
export const updateDocStatusInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
    });
  },
});

/**
 * Update document status (public mutation for client-side use)
 */
export const updateDocStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
    });
  },
});

/**
 * List all documents ordered by creation date descending
 */
export const listDocuments = query(async (ctx) => {
  const documents = await ctx.db.query("documents").collect();
  return documents.sort((a, b) => b.createdAt - a.createdAt);
});

/**
 * Get a single document by ID
 */
export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

/**
 * Delete a document and its associated chunks and storage file
 */
export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);

    if (!document) {
      throw new Error("Document not found");
    }

    // Delete associated chunks
    const chunks = await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete storage file
    try {
      await ctx.storage.delete(document.storageId);
    } catch (e) {
      // File may not exist, continue
    }

    // Delete document
    await ctx.db.delete(args.documentId);
  },
});
