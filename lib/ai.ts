/**
 * Provider-agnostic LLM and Embeddings abstraction
 * Supports OpenAI, Anthropic, and Cohere providers
 */

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { CohereClient } from "cohere-ai";

// Provider selection via environment variable
const LLM_PROVIDER = process.env.LLM_PROVIDER || "openai";

// Initialize clients (lazy - only created when needed)
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let cohereClient: CohereClient | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function getCohere(): CohereClient {
  if (!cohereClient) {
    cohereClient = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });
  }
  return cohereClient;
}

/**
 * Generate embedding vector for text
 * @param text - Text to embed
 * @returns 1536-dimensional embedding array (OpenAI default)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  switch (LLM_PROVIDER) {
    case "openai": {
      const openai = getOpenAI();
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      });
      return response.data[0].embedding;
    }

    case "cohere": {
      const cohere = getCohere();
      const response = await cohere.embed({
        model: "embed-english-v3.0",
        texts: [text],
        input_type: "search_document",
      });
      // Cohere returns 1024-dim embeddings - pad to 1536 if needed
      const embedding = response.embeddings[0];
      if (embedding.length === 1024) {
        // Pad with zeros to match schema dimensions
        return [...embedding, ...Array(512).fill(0)];
      }
      return embedding;
    }

    case "anthropic": {
      // Anthropic doesn't have embeddings API - fall back to OpenAI
      const openai = getOpenAI();
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      });
      return response.data[0].embedding;
    }

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${LLM_PROVIDER}`);
  }
}

/**
 * Generate chat completion using the configured LLM provider
 * @param systemPrompt - System instruction
 * @param messages - Array of { role, content } message objects
 * @returns Generated response text
 */
export async function generateChatCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  switch (LLM_PROVIDER) {
    case "openai": {
      const openai = getOpenAI();
      const formattedMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || "";
    }

    case "anthropic": {
      const anthropic = getAnthropic();

      // Anthropic uses different message format
      const anthropicMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      return response.content[0]?.type === "text"
        ? response.content[0].text
        : "";
    }

    case "cohere": {
      const cohere = getCohere();

      // Cohere chat endpoint
      const chatHistory = messages.map((m) => ({
        role: m.role,
        message: m.content,
      }));

      const response = await cohere.chat({
        model: "command-r-plus",
        message: messages[messages.length - 1]?.content || "",
        preamble: systemPrompt,
        chat_history: chatHistory.slice(0, -1),
      });

      return response.text || "";
    }

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${LLM_PROVIDER}`);
  }
}

/**
 * Get the current provider name
 */
export function getProvider(): string {
  return LLM_PROVIDER;
}

/**
 * Get the embedding dimensions based on provider
 */
export function getEmbeddingDimensions(): number {
  if (LLM_PROVIDER === "cohere") {
    return 1024;
  }
  return 1536;
}
