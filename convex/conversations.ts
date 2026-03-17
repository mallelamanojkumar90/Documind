import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    title: v.string(),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      title: args.title,
      documentId: args.documentId,
      createdAt: Date.now(),
    });

    return conversationId;
  },
});

/**
 * List all conversations ordered by creation date descending
 */
export const listConversations = query(async (ctx) => {
  const conversations = await ctx.db.query("conversations").collect();
  return conversations.sort((a, b) => b.createdAt - a.createdAt);
});

/**
 * Get a single conversation by ID
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Update conversation title
 */
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
    });
  },
});

/**
 * Delete a conversation and its messages
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // Delete associated messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});
