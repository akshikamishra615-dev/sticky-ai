"use client";

import * as React from "react";
import { Paperclip, Mic, Send } from "lucide-react";
import { suggestedPrompts } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiPrompter() {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 my-10 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ai-accent)]/10 to-[var(--ai-accent)]/5 blur-3xl -z-10 rounded-full" />
      
      <div 
        className={cn(
          "relative flex flex-col rounded-3xl border bg-[var(--surface)] p-3 shadow-lg transition-all duration-500",
          isFocused 
            ? "border-[var(--ai-accent)] shadow-[var(--ai-accent)]/20 ring-4 ring-[var(--ai-accent)]/10" 
            : "border-[var(--border)] hover:border-[var(--muted-text)] shadow-black/5 dark:shadow-white/5"
        )}
      >
        <div className="flex px-4 pt-4 pb-4">
          <input
            type="text"
            placeholder="What do you want to learn today?"
            className="flex-1 bg-transparent text-lg md:text-xl text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
        
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="text-[var(--secondary-text)] rounded-full h-10 w-10 hover:bg-[var(--elevated)] hover:text-[var(--primary-text)]">
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            <Button variant="ghost" size="icon" className="text-[var(--secondary-text)] rounded-full h-10 w-10 hover:bg-[var(--elevated)] hover:text-[var(--primary-text)]">
              <Mic className="h-5 w-5" />
              <span className="sr-only">Voice input</span>
            </Button>
          </div>
          
          <Button 
            variant="ai" 
            size="icon" 
            className="rounded-full h-11 w-11 transition-all duration-300"
            disabled={!query.trim()}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Ask Sticky AI</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-widest">Try asking</span>
        <div className="flex flex-wrap justify-center items-center gap-2 px-2 max-w-2xl">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(prompt)}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--secondary-text)] transition-all duration-300 hover:border-[var(--ai-accent)] hover:text-[var(--ai-accent)] hover:shadow-sm hover:shadow-[var(--ai-accent)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
