"use node";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY environment variable");
  }

  return apiKey;
}

async function groqRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${GROQ_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Groq API request failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as T;
}

type EmbeddingsResponse = {
  data: Array<{ embedding: number[] }>;
};

type ChatCompletionsResponse = {
  choices: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await groqRequest<EmbeddingsResponse>("/embeddings", {
    model: "nomic-embed-text-v1_5",
    input: text,
  });

  return response.data[0]?.embedding ?? [];
}

export async function generateChatCompletion(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const response = await groqRequest<ChatCompletionsResponse>("/chat/completions", {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}
