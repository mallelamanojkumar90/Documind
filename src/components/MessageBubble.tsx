"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface Message {
  _id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentName: string;
    chunkText: string;
    pageNumber?: number;
  }>;
  createdAt: number;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`
        mb-4 flex
        ${isUser ? "justify-end" : "justify-start"}
      `}
    >
      <div
        className={`
          ${isUser ? "bubble-user" : "bubble-assistant"}
          shadow-sm
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.sources && message.sources.length > 0 && (
              <SourcesAccordion sources={message.sources} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SourcesAccordionProps {
  sources: Array<{
    documentName: string;
    chunkText: string;
    pageNumber?: number;
  }>;
}

export function SourcesAccordion({ sources }: SourcesAccordionProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="sources-accordion">
      <button
        className="w-full flex items-center justify-between gap-2 py-2 text-xs font-medium text-[var(--brand-primary)] hover:opacity-80"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={14} />
          {sources.length} Source{sources.length !== 1 ? "s" : ""} cited
        </div>
        {isExpanded ? (
          <ChevronUp size={14} />
        ) : (
          <ChevronDown size={14} />
        )}
      </button>

      {isExpanded && (
        <div className="flex flex-wrap gap-2 pt-2">
          {sources.map((source, index) => (
            <div
              key={index}
              className="source-chip max-w-full"
              title={source.chunkText}
            >
              <span className="font-mono text-xs">
                {source.documentName}
                {source.pageNumber !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[var(--brand-teal)] text-white rounded text-xs">
                    p.{source.pageNumber}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
