import * as React from "react";
import { type Conversation } from "@/lib/mock-data";
import { MessageSquare, Plus, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export function ConversationHistory({ conversations, activeId, onSelect, onDelete }: ConversationHistoryProps) {
  // Group conversations by date
  const grouped = conversations.reduce((acc, conv) => {
    if (!acc[conv.date]) acc[conv.date] = [];
    acc[conv.date].push(conv);
    return acc;
  }, {} as Record<string, typeof conversations>);

  return (
    <div className="sticky top-0 h-[calc(100vh-4rem)] flex flex-col bg-[var(--surface)] border-r border-[var(--border)] w-64 xl:w-72 hidden md:flex shrink-0">
      <div className="p-4 border-b border-[var(--border)]">
        <Button 
          className="w-full justify-start font-semibold shadow-none border-[var(--border)] text-[var(--primary-text)] hover:border-[var(--ai-accent)] hover:text-[var(--ai-accent)] transition-all" 
          variant="outline" 
          onClick={() => onSelect(null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {Object.entries(grouped).map(([date, convs]) => (
          <div key={date}>
            <h3 className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider mb-2 px-2">
              {date}
            </h3>
            <div className="space-y-1">
              {convs.map((conv) => {
                const isActive = conv.id === activeId;
                
                return (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => onSelect(conv.id)}
                      className={cn(
                        "w-full text-left flex items-start gap-3 px-2 py-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-[var(--elevated)] text-[var(--ai-accent)] ring-1 ring-[var(--ai-accent)]/20 pr-8" 
                          : "hover:bg-[var(--elevated)] text-[var(--secondary-text)] hover:text-[var(--primary-text)] pr-8"
                      )}
                    >
                      <MessageSquare className={cn(
                        "h-4 w-4 mt-0.5 shrink-0 transition-colors",
                        isActive ? "text-[var(--ai-accent)]" : "text-[var(--muted-text)] group-hover:text-[var(--ai-accent)]"
                      )} />
                      <div className="flex-1 overflow-hidden">
                        <p className={cn("text-sm font-medium truncate", isActive && "text-[var(--primary-text)]")}>{conv.title}</p>
                        <p className="text-[10px] text-[var(--muted-text)] truncate mt-0.5 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {conv.subject}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--muted-text)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors opacity-0 lg:group-hover:opacity-100 focus:opacity-100 [&:not(:hover)]:md:opacity-100 sm:opacity-100"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
