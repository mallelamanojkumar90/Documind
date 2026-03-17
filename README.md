# DocuMind

DocuMind is a local PDF question-answering app built with Next.js. You can upload one or more PDFs, use them as a knowledge base, and ask grounded questions with cited source snippets.

## What It Does

- Upload PDFs directly from the browser
- Extract text from each PDF with `pdf-parse`
- Split document text into smaller chunks for retrieval
- Search the uploaded PDF knowledge base with local text matching
- Generate answers from relevant PDF excerpts
- Show cited source PDFs and page numbers alongside answers

## Current Architecture

- Frontend: Next.js 14 App Router
- Ingestion API: `src/app/api/ingest/route.ts`
- Answer API: `src/app/api/answer/route.ts`
- Main UI: `src/components/PDFQaApp.tsx`
- Styling: `src/app/globals.css`

The current app stores the uploaded PDF knowledge base in browser local storage. That keeps the setup simple and avoids deployment issues with external backend services.

## Requirements

- Node.js 18+
- npm
- Optional: `GROQ_API_KEY` in `.env.local` if you want LLM-generated answers

If `GROQ_API_KEY` is not set, the app can still surface the relevant PDF excerpts, but answer generation quality will be limited.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Optionally create `.env.local`:

```bash
GROQ_API_KEY=your_key_here
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## How To Use

1. Open the homepage
2. Upload one or more PDF files
3. Select a specific PDF or search across all uploaded PDFs
4. Ask a question in the input box
5. Review the answer and the cited source references

## Project Structure

```text
src/
  app/
    api/
      answer/route.ts
      ingest/route.ts
    chat/[conversationId]/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    Logo.tsx
    PDFQaApp.tsx
```

## Notes

- Uploaded PDFs are stored only in the browser for now
- Refreshing the page keeps the local knowledge base if local storage is preserved
- This version intentionally avoids relying on Convex for the active app flow

## License

MIT
