"use client";

import React from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Logo } from "./Logo";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeConversationId?: Id<"conversations">;
}

export function Sidebar({ activeConversationId }: SidebarProps) {
  const router = useRouter();
  const conversations = useQuery(api.conversations.listConversations);
  const createConversation = useMutation(api.conversations.createConversation);
  const deleteConversation = useMutation(api.conversations.deleteConversation);

  const handleNewChat = async () => {
    const id = await createConversation({
      title: "Q&A Across PDFs",
    });
    router.push(`/chat/${id}`);
  };

  const handleConversationClick = (id: Id<"conversations">) => {
    router.push(`/chat/${id}`);
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: Id<"conversations">
  ) => {
    e.stopPropagation();
    await deleteConversation({ conversationId: id });
    if (activeConversationId === id) {
      router.push("/");
    }
  };

  return (
    <aside className="sidebar-base">
      {/* Logo at top */}
      <div className="p-4 border-b border-[var(--brand-accent-light)]">
        <Logo size="medium" showText={true} />
      </div>

      {/* New Chat button */}
      <div className="p-4">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleNewChat}
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations && conversations.length > 0 ? (
          <ul className="space-y-1">
            {conversations.map((conv: Doc<"conversations">) => (
              <li key={conv._id}>
                <div
                  className={`
                    sidebar-conversation
                    ${conv._id === activeConversationId ? "sidebar-conversation-active" : ""}
                  `}
                  onClick={() => handleConversationClick(conv._id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="truncate text-sm">
                        {conv.title}
                      </span>
                    </div>
                    <button
                      className="btn-ghost-danger p-1 shrink-0"
                      onClick={(e) => handleDelete(e, conv._id)}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No conversations yet
          </div>
        )}
      </div>
    </aside>
  );
}
