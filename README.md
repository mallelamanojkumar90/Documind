# DocuMind

DocuMind is a PDF question-answering app built with Next.js and Convex. Upload PDFs, let the app index them into chunks, and ask grounded questions against a single document or across your full document set.

## What It Does

- Upload PDFs from the browser into Convex storage
- Extract and chunk PDF text for retrieval
- Store documents, chunks, conversations, and messages in Convex
- Ask questions against one selected PDF or across all uploaded PDFs
- Return answers with cited source documents and page references

## Architecture

- Frontend: Next.js 14 App Router
- Realtime backend and storage: Convex
- Main UI: `src/components/PDFQaApp.tsx`
- Convex provider: `src/components/ConvexClientProvider.tsx`
- Convex functions: `convex/`
- Styling: `src/app/globals.css`

## Requirements

- Node.js 18+
- npm
- A running Convex deployment
- Environment variables in `.env.local`

## Environment Variables

Create `.env.local` with the values for your Convex deployment and LLM provider:

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_convex_deployment

# LLM provider: groq | openai | anthropic | cohere
LLM_PROVIDER=groq

GROQ_API_KEY=your_key_here
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
COHERE_API_KEY=

NEXT_PUBLIC_CONVEX_SITE_URL=your_convex_site_url
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start Convex in one terminal if it is not already running:

```bash
npx convex dev
```

3. Start the Next.js app in another terminal:

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
3. Wait for indexing to complete
4. Select one PDF or choose all PDFs
5. Ask a question and review the cited sources in the response

## Project Structure

```text
convex/
  chunks.ts
  conversations.ts
  documents.ts
  ingest.ts
  messages.ts
  messagesNode.ts
  schema.ts

src/
  app/
    chat/[conversationId]/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    ConvexClientProvider.tsx
    Logo.tsx
    PDFQaApp.tsx
```

## Notes

- PDFs and indexed data are stored in Convex, not browser local storage
- The app depends on Convex being available before the frontend can query data
- LLM responses depend on the configured provider and API key

## License

MIT
