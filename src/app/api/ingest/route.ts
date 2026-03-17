import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

function chunkText(text: string, pageNumber: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const segments: Array<{ id: string; text: string; pageNumber: number }> = [];

  if (!normalized) {
    return segments;
  }

  const targetLength = 1200;
  let index = 0;
  let cursor = 0;

  while (cursor < normalized.length) {
    const slice = normalized.slice(cursor, cursor + targetLength);
    segments.push({
      id: `${pageNumber}-${index}`,
      text: slice.trim(),
      pageNumber,
    });
    cursor += targetLength - 150;
    index += 1;
  }

  return segments;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF uploads are supported." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfData = await pdfParse(Buffer.from(arrayBuffer));
  const pages = pdfData.text
    .split(/\f|\x0c/)
    .map((text, index) => ({
      text: text.trim(),
      pageNumber: index + 1,
    }))
    .filter((page) => page.text.length > 0);

  const pageEntries =
    pages.length > 0
      ? pages
      : [{ text: pdfData.text.trim(), pageNumber: 1 }].filter((page) => page.text.length > 0);

  const chunks = pageEntries.flatMap((page) => chunkText(page.text, page.pageNumber));

  return NextResponse.json({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    pageCount: pageEntries.length,
    chunks,
    createdAt: Date.now(),
  });
}
