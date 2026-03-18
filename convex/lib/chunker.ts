/**
 * Text chunking utility for PDF content
 * Splits text into ~500 token segments with 50 token overlap
 */

interface Chunk {
  text: string;
  chunkIndex: number;
  pageNumber?: number;
}

function splitIntoUnits(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const units = paragraphs.flatMap((paragraph) => {
    const sentences = paragraph.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
    return (sentences ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
  });

  return units.length > 0 ? units : [text.replace(/\s+/g, " ").trim()].filter(Boolean);
}

/**
 * Estimate token count using whitespace-based heuristic
 * (1 token ≈ 4 characters for English text)
 */
function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).length;
  // Rough estimate: ~1.3 tokens per word average
  return Math.ceil(words * 1.3);
}

/**
 * Split text into chunks with specified size and overlap
 * @param text - The text to chunk
 * @param chunkSize - Target tokens per chunk (default: 500)
 * @param overlap - Overlap tokens between chunks (default: 50)
 * @param pageNumber - Optional page number for the text
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
  pageNumber?: number
): Chunk[] {
  const chunks: Chunk[] = [];
  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (!cleanedText) {
    return chunks;
  }

  const units = splitIntoUnits(cleanedText);

  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;
  let unitIndex = 0;

  while (unitIndex < units.length) {
    const unit = units[unitIndex];
    const unitTokens = estimateTokenCount(unit);

    if (currentTokens + unitTokens <= chunkSize) {
      currentChunk += unit + " ";
      currentTokens += unitTokens;
      unitIndex++;
      continue;
    }

    if (!currentChunk.trim()) {
      const words = unit.split(/\s+/);
      let sliceStart = 0;

      while (sliceStart < words.length) {
        let slice = "";
        let sliceTokens = 0;
        let sliceEnd = sliceStart;

        while (sliceEnd < words.length) {
          const nextWord = words[sliceEnd];
          const nextSlice = slice ? `${slice} ${nextWord}` : nextWord;
          const nextTokens = estimateTokenCount(nextSlice);

          if (nextTokens > chunkSize && slice) {
            break;
          }

          slice = nextSlice;
          sliceTokens = nextTokens;
          sliceEnd++;

          if (sliceTokens >= chunkSize) {
            break;
          }
        }

        if (slice.trim()) {
          chunks.push({
            text: slice.trim(),
            chunkIndex,
            pageNumber,
          });
          chunkIndex++;
        }

        sliceStart = Math.max(sliceStart + 1, sliceEnd - Math.max(1, Math.floor(overlap / 4)));
      }

      unitIndex++;
      currentChunk = "";
      currentTokens = 0;
    } else {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex,
        pageNumber,
      });
      chunkIndex++;

      if (overlap > 0 && chunks.length > 0) {
        const overlapText = getOverlapSentences(chunks[chunks.length - 1].text, overlap);
        currentChunk = overlapText ? `${overlapText} ` : "";
        currentTokens = estimateTokenCount(currentChunk);
      } else {
        currentChunk = "";
        currentTokens = 0;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      chunkIndex,
      pageNumber,
    });
  }

  return chunks;
}

/**
 * Extract last sentences from text to create overlap
 */
function getOverlapSentences(text: string, targetTokens: number): string {
  const sentences = splitIntoUnits(text);

  let overlapText = "";
  let overlapTokens = 0;

  // Start from the end and work backwards
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i].trim();
    const sentenceTokens = estimateTokenCount(sentence);

    if (overlapTokens + sentenceTokens <= targetTokens) {
      overlapText = sentence + " " + overlapText;
      overlapTokens += sentenceTokens;
    } else {
      break;
    }
  }

  return overlapText.trim();
}

/**
 * Process multiple pages of text
 * @param pages - Array of { text, pageNumber } objects
 * @param chunkSize - Target tokens per chunk
 * @param overlap - Overlap tokens between chunks
 */
export function chunkPages(
  pages: { text: string; pageNumber: number }[],
  chunkSize: number = 500,
  overlap: number = 50
): Chunk[] {
  const allChunks: Chunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(
      page.text,
      chunkSize,
      overlap,
      page.pageNumber
    );

    for (const chunk of pageChunks) {
      allChunks.push({
        ...chunk,
        chunkIndex: globalChunkIndex++,
      });
    }
  }

  return allChunks;
}
