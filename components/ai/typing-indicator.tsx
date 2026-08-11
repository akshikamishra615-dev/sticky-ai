import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex w-full py-6 bg-[var(--surface)] border-y border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-4xl gap-4 px-4 sm:px-6">
        <div className="flex-shrink-0 mt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] shadow-sm shadow-[var(--ai-accent)]/20 ring-2 ring-[var(--ai-accent)]/20">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        
        <div className="flex flex-col flex-1 space-y-2 justify-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-[var(--primary-text)]">Sticky AI</span>
            <span className="text-xs text-[var(--muted-text)]">typing...</span>
          </div>
          
          <div className="flex items-center space-x-1 pt-1 h-5">
            <div className="w-1.5 h-1.5 bg-[var(--ai-accent)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-[var(--ai-accent)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-[var(--ai-accent)] rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
