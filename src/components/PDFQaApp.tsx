"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Logo } from "./Logo";

type Chunk = {
  id: string;
  text: string;
  pageNumber: number;
};

type KnowledgeDocument = {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  chunks: Chunk[];
  createdAt: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentName: string;
    pageNumber?: number;
    text: string;
  }>;
};

const STORAGE_KEY = "documind-local-kb";

export function PDFQaApp() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setDocuments(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const selectedDocuments = useMemo(() => {
    if (selectedDocumentId === "all") {
      return documents;
    }
    return documents.filter((document) => document.id === selectedDocumentId);
  }, [documents, selectedDocumentId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setUploadStatus("Extracting PDF text...");

    try {
      const nextDocuments: KnowledgeDocument[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const document = (await response.json()) as KnowledgeDocument;
        nextDocuments.push(document);
      }

      setDocuments((current) => [...nextDocuments, ...current]);
      setSelectedDocumentId(nextDocuments[0]?.id ?? "all");
      setUploadStatus("PDF knowledge base updated.");
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || selectedDocuments.length === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsAnswering(true);

    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          documents: selectedDocuments,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const answer = (await response.json()) as ChatMessage;
      setMessages((current) => [...current, answer]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "I could not answer that question right now.",
        },
      ]);
    } finally {
      setIsAnswering(false);
    }
  }

  function removeDocument(documentId: string) {
    setDocuments((current) => current.filter((document) => document.id !== documentId));
    if (selectedDocumentId === documentId) {
      setSelectedDocumentId("all");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="card-base w-full lg:w-[320px] lg:self-start">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Logo size="medium" showText={true} />
            <span className="status-ready">Local Q&A</span>
          </div>

          <label className="drag-zone block">
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center gap-3">
              {isUploading ? (
                <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
              ) : (
                <Upload size={32} className="text-[var(--brand-primary)]" />
              )}
              <div>
                <p className="font-medium">
                  {isUploading ? "Uploading PDFs..." : "Upload PDFs"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Build the knowledge base directly in this browser session.
                </p>
              </div>
            </div>
          </label>

          {uploadStatus ? (
            <p className="mt-3 text-sm text-gray-600">{uploadStatus}</p>
          ) : null}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="heading-serif text-lg">Knowledge Base</h2>
              <button
                className="btn-ghost text-sm"
                type="button"
                onClick={() => setSelectedDocumentId("all")}
              >
                All PDFs
              </button>
            </div>

            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--brand-accent-light)] p-4 text-sm text-gray-500">
                  No PDFs uploaded yet.
                </div>
              ) : null}

              {documents.map((document) => (
                <div
                  key={document.id}
                  className={`card-base cursor-pointer p-4 transition-all ${
                    selectedDocumentId === document.id ? "ring-2 ring-[var(--brand-primary)]" : ""
                  }`}
                  onClick={() => setSelectedDocumentId(document.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--brand-primary)]" />
                        <p className="truncate font-medium">{document.name}</p>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {document.pageCount} pages • {document.chunks.length} chunks
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost-danger p-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeDocument(document.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-[70vh] flex-1 flex-col rounded-2xl border border-[var(--brand-accent-light)] bg-white">
          <div className="border-b border-[var(--brand-accent-light)] px-6 py-5">
            <h1 className="heading-serif text-2xl">PDF Question & Answer</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ask grounded questions against your uploaded PDFs. The answer will use only the selected knowledge base.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <div className="empty-state rounded-2xl border border-dashed border-[var(--brand-accent-light)]">
                <Logo size="large" showText={false} />
                <h2 className="heading-serif mt-4 text-xl">Ask from your PDFs</h2>
                <p className="mt-2 max-w-xl text-gray-500">
                  Upload one or more PDFs, select a document or search across all of them, then ask factual questions,
                  summaries, or section-specific queries.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={message.role === "user" ? "bubble-user" : "bubble-assistant"}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 ? (
                      <div className="sources-accordion">
                        <p className="py-2 text-xs font-medium text-[var(--brand-primary)]">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, index) => (
                            <div key={`${source.documentName}-${index}`} className="source-chip max-w-full">
                              {source.documentName}
                              {source.pageNumber ? ` p.${source.pageNumber}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}

            {isAnswering ? (
              <div className="flex justify-start">
                <div className="bubble-assistant flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--brand-accent-light)] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
              <Search size={16} />
              {selectedDocumentId === "all"
                ? "Searching across all uploaded PDFs"
                : `Searching in ${selectedDocuments[0]?.name ?? "selected PDF"}`}
            </div>
            <div className="flex flex-col gap-3">
              <textarea
                className="textarea-base w-full"
                placeholder="Ask a question about the uploaded PDFs..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleAsk();
                  }
                }}
                disabled={isAnswering || selectedDocuments.length === 0}
              />
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => void handleAsk()}
                  disabled={isAnswering || selectedDocuments.length === 0 || !question.trim()}
                >
                  Ask Question
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
