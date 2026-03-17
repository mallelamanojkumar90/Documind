"use client";

import React, { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Logo } from "./Logo";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";

interface ChatWindowProps {
  conversationId: Id<"conversations">;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="empty-state flex-1">
        <Logo size="large" showText={false} />
        <h2 className="heading-serif text-xl mt-4 mb-2">Ask questions about your PDFs</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Use your uploaded PDFs as the knowledge base. Ask for facts, summaries, clauses, or key points.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="prompt-chip">Summarize this PDF</span>
          <span className="prompt-chip">What does this section say?</span>
          <span className="prompt-chip">Answer from the document only</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto">
        {messages.map((message: Doc<"messages">) => (
          <MessageBubble key={message._id} message={message} />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
