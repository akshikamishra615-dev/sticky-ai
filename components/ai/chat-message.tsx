"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import { cn } from "@/lib/utils";
import { type Message } from "@/lib/mock-data";
import { Sparkles, Copy, RotateCcw, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: (id: string) => void;
  userName?: string;
  userImage?: string;
}

export function ChatMessage({ message, onRegenerate, userName = "User", userImage }: ChatMessageProps) {
  const isAi = message.role === "ai";
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex w-full py-6", isAi ? "bg-[var(--surface)] border-y border-[var(--border)]" : "")}>
      <div className="mx-auto flex w-full max-w-4xl gap-4 px-4 sm:px-6">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isAi ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] shadow-sm shadow-[var(--ai-accent)]/20 ring-2 ring-[var(--ai-accent)]/20">
              <Sparkles className="h-4 w-4" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="h-8 w-8 rounded-full bg-[var(--elevated)]"
              src={userImage || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`}
              alt={userName}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-[var(--primary-text)]">
              {isAi ? "Sticky AI" : userName}
            </span>
            <span className="text-xs text-[var(--muted-text)]">{message.timestamp}</span>
          </div>
          
          <div className="text-[var(--primary-text)] leading-relaxed whitespace-pre-wrap text-sm sm:text-base w-full overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({children}: any) {
                  return (
                    <pre className="overflow-x-auto bg-[#1e1e1e] rounded-md my-4 p-4 text-sm font-mono text-gray-300 w-full max-w-full">
                      {children}
                    </pre>
                  );
                },
                code({className, children, ...props}: React.ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
                  const isBlock = /language-(\w+)/.exec(className || '');
                  return (
                    <code className={isBlock ? className : "bg-[var(--elevated)] px-1.5 py-0.5 rounded-md font-mono text-sm break-words"} {...props}>
                      {children}
                    </code>
                  );
                },
                p({children, ...props}: any) {
                  return <div className="mb-4 last:mb-0 leading-relaxed" {...props}>{children}</div>;
                },
                ul({children}: any) {
                  return <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>;
                },
                ol({children}: any) {
                  return <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>;
                },
                a({children, href}: any) {
                  return <a href={href} className="text-[var(--ai-accent)] hover:underline">{children}</a>;
                },
                h1({children}: any) {
                  return <h1 className="text-xl font-bold mt-6 mb-4">{children}</h1>;
                },
                h2({children}: any) {
                  return <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>;
                },
                h3({children}: any) {
                  return <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* AI Affordances */}
          {isAi && (
            <div className="flex items-center gap-2 pt-2 opacity-80 hover:opacity-100 transition-opacity">
              <button 
                onClick={handleCopy}
                className="p-1.5 text-[var(--muted-text)] hover:text-[var(--ai-accent)] hover:bg-[var(--ai-accent)]/10 rounded-md transition-colors" 
                title="Copy"
              >
                {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
              </button>
              
              {onRegenerate && (
                <button 
                  onClick={() => onRegenerate(message.id)}
                  className="p-1.5 text-[var(--muted-text)] hover:text-[var(--ai-accent)] hover:bg-[var(--ai-accent)]/10 rounded-md transition-colors" 
                  title="Regenerate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              
              <div className="w-px h-4 bg-[var(--border)] mx-1" />
              
              <button 
                onClick={() => setFeedback(feedback === "up" ? null : "up")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  feedback === "up" 
                    ? "text-[var(--success)] bg-[var(--success)]/10" 
                    : "text-[var(--muted-text)] hover:text-[var(--success)] hover:bg-[var(--success)]/10"
                )}
                title="Good response"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setFeedback(feedback === "down" ? null : "down")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  feedback === "down" 
                    ? "text-[var(--error)] bg-[var(--error)]/10" 
                    : "text-[var(--muted-text)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                )}
                title="Bad response"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
