"use client";

import React, { useMemo, useState } from "react";
import { FileText, Loader2, Search, Trash2, Upload } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Logo } from "./Logo";

const EMPTY_DOCUMENTS: Doc<"documents">[] = [];
const EMPTY_CONVERSATIONS: Doc<"conversations">[] = [];

export function PDFQaApp() {
  const documents = useQuery(api.documents.listDocuments) ?? EMPTY_DOCUMENTS;
  const conversations = useQuery(api.conversations.listConversations) ?? EMPTY_CONVERSATIONS;
  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | "all">("all");
  const [question, setQuestion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [statusText, setStatusText] = useState("");

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const createConversation = useMutation(api.conversations.createConversation);
  const ingestDocument = useAction(api.ingest.ingestDocument);
  const sendMessage = useAction(api.messagesNode.sendMessage);

  const selectedDocuments = useMemo(() => {
    if (selectedDocumentId === "all") {
      return documents;
    }

    return documents.filter((document: Doc<"documents">) => document._id === selectedDocumentId);
  }, [documents, selectedDocumentId]);

  const activeConversation = useMemo(() => {
    if (selectedDocumentId === "all") {
      return conversations.find((conversation: Doc<"conversations">) => !conversation.documentId) ?? null;
    }

    return (
      conversations.find(
        (conversation: Doc<"conversations">) => conversation.documentId === selectedDocumentId
      ) ?? null
    );
  }, [conversations, selectedDocumentId]);

  const messages =
    useQuery(
      api.messages.getMessages,
      activeConversation ? { conversationId: activeConversation._id } : "skip"
    ) ?? [];

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setStatusText("Uploading PDFs to Convex...");

    try {
      for (const file of Array.from(files)) {
        if (file.type !== "application/pdf") {
          throw new Error(`${file.name} is not a PDF file.`);
        }

        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        const documentId = await saveDocument({
          name: file.name,
          storageId,
          size: file.size,
        });

        setSelectedDocumentId(documentId);
        setStatusText(`Indexing ${file.name}...`);

        await ingestDocument({
          documentId,
          storageId,
        });
      }

      setStatusText("PDF knowledge base updated in Convex.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || selectedDocuments.length === 0) {
      return;
    }

    setQuestion("");
    setIsAnswering(true);

    try {
      let conversationId = activeConversation?._id;

      if (!conversationId) {
        conversationId = await createConversation({
          title:
            selectedDocumentId === "all"
              ? "Q&A Across PDFs"
              : `Q&A: ${selectedDocuments[0]?.name ?? "Document"}`,
          documentId: selectedDocumentId === "all" ? undefined : selectedDocumentId,
        });
      }

      await sendMessage({
        conversationId,
        content: trimmedQuestion,
        documentId: selectedDocumentId === "all" ? undefined : selectedDocumentId,
      });
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to answer question.");
    } finally {
      setIsAnswering(false);
    }
  }

  async function handleDeleteDocument(documentId: Id<"documents">) {
    await deleteDocument({ documentId });

    if (selectedDocumentId === documentId) {
      setSelectedDocumentId("all");
    }
  }

  const hasReadySelection =
    selectedDocuments.length > 0 &&
    selectedDocuments.every((document: Doc<"documents">) => document.status === "ready");

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="card-base w-full lg:w-[320px] lg:self-start">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Logo size="medium" showText={true} />
            <span className="status-ready">Convex Q&A</span>
          </div>

          <label className="drag-zone block">
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
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
                  Store PDFs and indexed chunks in Convex.
                </p>
              </div>
            </div>
          </label>

          {statusText ? (
            <p className="mt-3 text-sm text-gray-600">{statusText}</p>
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

              {documents.map((document: Doc<"documents">) => (
                <div
                  key={document._id}
                  className={`card-base cursor-pointer p-4 transition-all ${
                    selectedDocumentId === document._id ? "ring-2 ring-[var(--brand-primary)]" : ""
                  }`}
                  onClick={() => setSelectedDocumentId(document._id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--brand-primary)]" />
                        <p className="truncate font-medium">{document.name}</p>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {(document.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="mt-2">
                        <span
                          className={
                            document.status === "ready"
                              ? "status-ready"
                              : document.status === "processing"
                                ? "status-processing"
                                : document.status === "error"
                                  ? "status-error"
                                  : "status-pending"
                          }
                        >
                          {document.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost-danger p-2"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await handleDeleteDocument(document._id);
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
              Ask grounded questions against PDFs stored in Convex. Answers use only the selected document context.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <div className="empty-state rounded-2xl border border-dashed border-[var(--brand-accent-light)]">
                <Logo size="large" showText={false} />
                <h2 className="heading-serif mt-4 text-xl">Ask from your PDFs</h2>
                <p className="mt-2 max-w-xl text-gray-500">
                  Upload one or more PDFs to Convex, select a document or search across all of them, then ask factual
                  questions, summaries, or section-specific queries.
                </p>
              </div>
            ) : (
              messages.map((message: Doc<"messages">) => (
                <div key={message._id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
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
              {!selectedDocuments.every((document: Doc<"documents">) => document.status === "ready") &&
              selectedDocuments.length > 0 ? (
                <p className="text-sm text-amber-700">
                  Wait for the selected PDF to finish indexing before asking questions.
                </p>
              ) : null}
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
                disabled={isAnswering || !hasReadySelection}
              />
              <div className="flex justify-end">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => void handleAsk()}
                  disabled={isAnswering || !hasReadySelection || !question.trim()}
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
