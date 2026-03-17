/**
 * Text chunking utility for PDF content
 * Splits text into ~500 token segments with 50 token overlap
 */

interface Chunk {
  text: string;
  chunkIndex: number;
  pageNumber?: number;
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

  if (!text || text.trim().length === 0) {
    return chunks;
  }

  // Split into sentences for better boundaries
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];

  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;
  let sentenceIndex = 0;

  while (sentenceIndex < sentences.length) {
    const sentence = sentences[sentenceIndex].trim();
    const sentenceTokens = estimateTokenCount(sentence);

    if (currentTokens + sentenceTokens <= chunkSize) {
      // Add sentence to current chunk
      currentChunk += sentence + " ";
      currentTokens += sentenceTokens;
      sentenceIndex++;
    } else {
      // Current chunk is full, save it
      if (currentChunk.trim().length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          chunkIndex,
          pageNumber,
        });
        chunkIndex++;
      }

      // Start new chunk with overlap
      if (overlap > 0 && chunks.length > 0) {
        // Get last few sentences for overlap
        const overlapSentences = getOverlapSentences(
          chunks[Math.max(0, chunks.length - 1)].text,
          overlap
        );
        currentChunk = overlapSentences + " ";
        currentTokens = estimateTokenCount(currentChunk);
      } else {
        currentChunk = "";
        currentTokens = 0;
      }
    }
  }

  // Don't forget the last chunk
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
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];

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
