"use client";

import React, { useState, useRef } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="card-base mt-4">
      <textarea
        ref={textareaRef}
        className="textarea-base w-full resize-none"
        rows={1}
        placeholder={placeholder || "Ask anything about your documents..."}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={{ minHeight: "50px", maxHeight: "200px" }}
      />
      <div className="flex justify-end mt-3">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
        >
          <Send size={16} />
          Send
        </button>
      </div>
    </div>
  );
}
