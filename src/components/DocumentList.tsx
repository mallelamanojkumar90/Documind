"use client";

import React from "react";
import { FileText, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";

interface DocumentListProps {
  onDocumentSelect?: (documentId: Id<"documents">) => void;
  selectedDocumentId?: Id<"documents">;
}

export function DocumentList({ onDocumentSelect, selectedDocumentId }: DocumentListProps) {
  const documents = useQuery(api.documents.listDocuments);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="status-pending">Pending</span>;
      case "processing":
        return <span className="status-processing">Processing</span>;
      case "ready":
        return <span className="status-ready">Ready</span>;
      case "error":
        return <span className="status-error">Error</span>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle size={16} className="text-[var(--brand-teal)]" />;
      case "processing":
        return <Clock size={16} className="text-amber-600" />;
      case "error":
        return <AlertCircle size={16} className="text-[var(--brand-primary-dark)]" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const handleDelete = async (documentId: Id<"documents">) => {
    if (confirm("Delete this document and all its indexed content?")) {
      await deleteDocument({ documentId });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h3 className="font-medium text-sm mb-3 text-[var(--brand-ink)]">
        Documents
      </h3>
      <ul className="space-y-2">
        {documents.map((doc: Doc<"documents">) => (
          <li
            key={doc._id}
            className={`
              card-base p-3 cursor-pointer transition-all
              ${doc.status !== "ready" ? "opacity-70" : ""}
              ${doc._id === selectedDocumentId ? "ring-2 ring-[var(--brand-primary)]" : ""}
            `}
            onClick={() => {
              if (doc.status === "ready") {
                onDocumentSelect?.(doc._id);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="shrink-0 mt-0.5">
                  {getStatusIcon(doc.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--brand-ink)] truncate">
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFileSize(doc.size)}
                  </p>
                  {doc.status !== "ready" && (
                    <p className="text-xs text-gray-500 mt-1">
                      This PDF must finish indexing before it can answer questions.
                    </p>
                  )}
                  <div className="mt-1.5">{getStatusBadge(doc.status)}</div>
                </div>
              </div>
              <button
                className="btn-ghost-danger p-1.5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(doc._id);
                }}
                title="Delete document"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
