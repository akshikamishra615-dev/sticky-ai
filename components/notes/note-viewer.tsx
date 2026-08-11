import * as React from "react";
import { type Note } from "@/lib/mock-notes";
import { Clock, BookOpen, Bookmark, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteViewerProps {
  note: Note;
  isPreview?: boolean;
  onToggleBookmark?: () => void;
  onDelete?: () => void;
}

export function NoteViewer({ note, isPreview = false, onToggleBookmark, onDelete }: NoteViewerProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full animate-in fade-in slide-in-from-bottom-4 pb-20">
      {/* Header Area */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-medium uppercase tracking-wider text-xs">
            {note.subject}
          </Badge>
          {note.isAiGenerated && (
            <Badge className="bg-[var(--ai-accent)]/10 text-[var(--ai-accent)] border-transparent font-medium uppercase tracking-wider text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Generated
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--primary-text)] tracking-tight leading-tight">
          {note.title}
        </h1>
        
        <p className="text-lg text-[var(--secondary-text)] leading-relaxed">
          {note.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-[var(--muted-text)] pt-2 border-t border-[var(--border)]">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5" />
            {note.lastUpdated}
          </div>
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1.5" />
            {note.readTime}
          </div>
          {!isPreview && onToggleBookmark && (
            <button 
              onClick={onToggleBookmark}
              className={cn(
                "flex items-center gap-1.5 transition-colors group px-2 py-1 -ml-2 rounded-md",
                note.isBookmarked 
                  ? "text-[var(--ai-accent)] hover:bg-[var(--ai-accent)]/10" 
                  : "text-[var(--muted-text)] hover:text-[var(--primary-text)] hover:bg-[var(--surface)]"
              )}
            >
              <Bookmark className={cn(
                "w-4 h-4 transition-all group-hover:scale-110",
                note.isBookmarked && "fill-current"
              )} />
              {note.isBookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          )}
          
          {!isPreview && onDelete && (
            <button 
              onClick={onDelete}
              className="flex items-center gap-1.5 transition-colors group px-2 py-1 rounded-md text-[var(--muted-text)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4 transition-all group-hover:scale-110" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Visual Learning Area */}
      {note.visualLearning && (
        <div className="mb-12 bg-gradient-to-br from-[var(--surface)] to-[var(--background)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-[var(--ai-accent)]/10 text-[var(--ai-accent)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--primary-text)] capitalize">Visual Overview: {note.visualLearning.type.replace('_', ' ')}</h2>
          </div>
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none w-full overflow-hidden text-[var(--primary-text)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table({children}: React.HTMLAttributes<HTMLTableElement>) {
                  return <div className="overflow-x-auto w-full"><table className="w-full text-left border-collapse">{children}</table></div>;
                },
                th({children}: React.HTMLAttributes<HTMLTableCellElement>) {
                  return <th className="border-b border-[var(--border)] p-3 bg-[var(--elevated)] font-semibold">{children}</th>;
                },
                td({children}: React.HTMLAttributes<HTMLTableCellElement>) {
                  return <td className="border-b border-[var(--border)] p-3">{children}</td>;
                },
                pre({children}: React.HTMLAttributes<HTMLPreElement>) {
                  return <pre className="overflow-x-auto bg-[var(--background)] rounded-md p-4 text-sm font-mono border border-[var(--border)] max-w-full">{children}</pre>;
                },
                code({className, children, ...props}: React.ComponentPropsWithoutRef<"code"> & { node?: unknown }) {
                  const isBlock = /language-(\w+)/.exec(className || '');
                  return <code className={isBlock ? className : "bg-[var(--background)] px-1.5 py-0.5 rounded-md font-mono text-sm break-words border border-[var(--border)]"} {...props}>{children}</code>;
                }
              }}
            >
              {note.visualLearning.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Structured Content Area */}
      <div className="space-y-12">
        {note.sections.map((section, index) => (
          <section key={index} className="scroll-mt-20">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-4 pb-2 border-b border-[var(--border)] flex items-center">
              {section.title}
            </h2>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--primary-text)] leading-relaxed">
              {/* Very basic markdown rendering for prototype */}
              {section.content.split('\n').map((paragraph, i) => {
                if (!paragraph.trim()) return <br key={i} />;
                
                // Bold handling
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                const formatted = parts.map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j} className="font-bold text-[var(--primary-text)]">{part.slice(2, -2)}</strong>;
                  }
                  return part;
                });

                // List handling
                if (paragraph.trim().startsWith("- ")) {
                  const cleaned = formatted.map((item, index) => {
                    if (index === 0 && typeof item === "string") {
                      return item.replace(/^\s*-\s*/, "");
                    }
                    return item;
                  });
                  // Defensive rendering: only render if there's actual content
                  const hasContent = cleaned.some(item => typeof item === "string" ? item.trim() : item);
                  if (!hasContent) return null;
                  
                  return <li key={i} className="ml-4 list-disc marker:text-[var(--muted-text)] mb-1">{cleaned}</li>;
                }
                if (paragraph.trim().match(/^\d+\.\s/)) {
                  const cleaned = formatted.map((item, index) => {
                    if (index === 0 && typeof item === "string") {
                      return item.replace(/^\s*\d+\.\s*/, "");
                    }
                    return item;
                  });
                  // Defensive rendering
                  const hasContent = cleaned.some(item => typeof item === "string" ? item.trim() : item);
                  if (!hasContent) return null;
                  
                  return <li key={i} className="ml-4 list-decimal marker:text-[var(--muted-text)] mb-1 font-medium">{cleaned}</li>;
                }

                // Header handling
                if (paragraph.trim().startsWith("### ")) {
                  return <h3 key={i} className="text-lg font-bold mt-6 mb-3 text-[var(--primary-text)]">{formatted.map((item, index) => index === 0 && typeof item === "string" ? item.replace(/^###\s*/, "") : item)}</h3>;
                }

                return <p key={i} className="mb-4 text-[var(--secondary-text)]">{formatted}</p>;
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
