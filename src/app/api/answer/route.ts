import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RequestChunk = {
  id: string;
  text: string;
  pageNumber: number;
};

type RequestDocument = {
  id: string;
  name: string;
  chunks: RequestChunk[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function scoreChunk(question: string, chunkText: string): number {
  const questionTokens = tokenize(question);
  const chunkTokens = new Set(tokenize(chunkText));

  let score = 0;
  for (const token of questionTokens) {
    if (chunkTokens.has(token)) {
      score += 1;
    }
  }

  if (chunkText.toLowerCase().includes(question.toLowerCase())) {
    score += 3;
  }

  return score;
}

async function answerWithGroq(question: string, contexts: Array<{ documentName: string; pageNumber: number; text: string }>) {
  const apiKey = process.env.GROQ_API_KEY;
  const contextText = contexts
    .map(
      (context, index) =>
        `[Source ${index + 1} | ${context.documentName} | page ${context.pageNumber}]\n${context.text}`
    )
    .join("\n\n");

  if (!apiKey) {
    return `I found relevant content in the PDFs, but GROQ_API_KEY is missing. Review these sources:\n\n${contextText}`;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a PDF question-answering assistant. Answer using only the provided PDF excerpts. If the answer is not in the excerpts, say so clearly. Cite source numbers in your answer.",
        },
        {
          role: "user",
          content: `Question:\n${question}\n\nPDF excerpts:\n${contextText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq answer request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || "I could not generate an answer.";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    question?: string;
    documents?: RequestDocument[];
  };

  const question = body.question?.trim();
  const documents = body.documents ?? [];

  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const rankedChunks = documents
    .flatMap((document) =>
      document.chunks.map((chunk) => ({
        documentName: document.name,
        pageNumber: chunk.pageNumber,
        text: chunk.text,
        score: scoreChunk(question, chunk.text),
      }))
    )
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (rankedChunks.length === 0) {
    return NextResponse.json({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "I could not find that answer in the uploaded PDFs. Try a more specific question or upload the relevant document.",
      sources: [],
    });
  }

  const answer = await answerWithGroq(question, rankedChunks);

  return NextResponse.json({
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer,
    sources: rankedChunks.map((chunk) => ({
      documentName: chunk.documentName,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
    })),
  });
}
