"use node";

/**
 * Provider-agnostic LLM and Embeddings abstraction
 * Chat completions: Groq (fast inference via OpenAI-compatible API)
 * Embeddings: Groq nomic-embed-text-v1_5 model
 */

import { OpenAI } from "openai";

// ── Groq client (OpenAI-compatible) ────────────────────────────
let groqClient: OpenAI | null = null;

function getGroq(): OpenAI {
  if (!groqClient) {
    groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groqClient;
}

/**
 * Generate embedding vector for text using Groq
 * Uses nomic-embed-text-v1_5 which supports 768 dimensions
 * @param text - Text to embed
 * @returns 768-dimensional embedding array
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const groq = getGroq();
  const response = await groq.embeddings.create({
    model: "nomic-embed-text-v1_5",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Generate chat completion using Groq
 * Uses llama-3.3-70b-versatile for high-quality, fast responses
 * @param systemPrompt - System instruction
 * @param messages - Array of { role, content } message objects
 * @returns Generated response text
 */
export async function generateChatCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const groq = getGroq();
  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Get the current provider name
 */
export function getProvider(): string {
  return "groq";
}

/**
 * Get the embedding dimensions (nomic-embed-text-v1_5 = 768)
 */
export function getEmbeddingDimensions(): number {
  return 768;
}
