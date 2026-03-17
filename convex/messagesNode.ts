"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateChatCompletion } from "./lib/groq";

export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userMessageId = await ctx.runMutation(internal.messages.saveMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    const chunks = await ctx.runAction(internal.chunks.similaritySearch, {
      queryText: args.content,
      documentId: args.documentId,
      limit: 5,
    });

    if (chunks.length === 0) {
      const noAnswerText =
        "I could not find an answer to that in the uploaded PDF knowledge base yet. Try asking about content that appears in one of your uploaded documents.";

      const assistantMessageId = await ctx.runMutation(internal.messages.saveMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: noAnswerText,
        sources: [],
        createdAt: Date.now(),
      });

      return {
        assistantMessageId,
        content: noAnswerText,
        sources: [],
      };
    }

    const contextText = chunks
      .map(
        (chunk: any, index: number) =>
          `[Source ${index + 1}${chunk.pageNumber ? ` Page ${chunk.pageNumber}` : ""}]: ${chunk.text}`
      )
      .join("\n\n");

    const systemPrompt = `You are DocuMind, a PDF question-answering assistant.
Answer using only the provided PDF context.
If the answer is not supported by the context, say that the answer is not available in the uploaded PDFs.
Always cite the source number and page number when available.
Do not invent facts beyond the provided document context.

Context from documents:
${contextText}

Be concise, accurate, and helpful.`;

    const messages = await ctx.runQuery(internal.messages.getMessagesInternal, {
      conversationId: args.conversationId,
    });

    const conversationHistory = messages
      .filter((message: any) => message._id !== userMessageId)
      .map((message: any) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

    conversationHistory.push({
      role: "user" as const,
      content: args.content,
    });

    const responseText = await generateChatCompletion(systemPrompt, conversationHistory);

    const sources = chunks.map((chunk: any) => ({
      documentName: chunk.documentName,
      chunkText: chunk.text,
      pageNumber: chunk.pageNumber,
    }));

    const assistantMessageId = await ctx.runMutation(internal.messages.saveMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: responseText,
      sources,
      createdAt: Date.now(),
    });

    return {
      assistantMessageId,
      content: responseText,
      sources,
    };
  },
});
