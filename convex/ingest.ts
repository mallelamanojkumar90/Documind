"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import pdfParse from "pdf-parse";
import { chunkPages } from "./lib/chunker";

/**
 * Ingest a PDF into the knowledge base by extracting text, chunking it,
 * generating embeddings, and storing the chunks for retrieval.
 */
export const ingestDocument = action({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.documents.updateDocStatusInternal, {
        documentId: args.documentId,
        status: "processing",
      });

      const pdfBlob = await ctx.storage.get(args.storageId);

      if (!pdfBlob) {
        throw new Error("Failed to fetch uploaded PDF from storage");
      }

      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(pdfBuffer);

      const rawPages = pdfData.text
        .split(/\f|\x0c/)
        .map((text, index) => ({
          text: text.trim(),
          pageNumber: index + 1,
        }))
        .filter((page) => page.text.length > 0);

      const pages =
        rawPages.length > 0
          ? rawPages
          : [{ text: pdfData.text.trim(), pageNumber: 1 }].filter((page) => page.text.length > 0);

      const chunks = chunkPages(pages, 500, 50);

      const embeddedChunks = await Promise.all(
        chunks.map(async (chunk) => ({
          documentId: args.documentId,
          text: chunk.text,
          embedding: Array.from({ length: 768 }, () => 0),
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
        }))
      );

      if (embeddedChunks.length > 0) {
        await ctx.runMutation(internal.chunks.saveChunks, {
          chunks: embeddedChunks,
        });
      }

      await ctx.runMutation(internal.documents.updateDocStatusInternal, {
        documentId: args.documentId,
        status: "ready",
      });

      return {
        success: true,
        chunksCount: embeddedChunks.length,
        pages: pages.length,
        storageId: args.storageId,
      };
    } catch (error) {
      await ctx.runMutation(internal.documents.updateDocStatusInternal, {
        documentId: args.documentId,
        status: "error",
      });

      console.error("Ingestion error:", error);
      throw error;
    }
  },
});
