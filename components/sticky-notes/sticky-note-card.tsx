import { Pin, Trash2, Edit2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  updatedAt: Date;
}

interface StickyNoteCardProps {
  note: StickyNote;
  onEdit: (note: StickyNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const colorStyles: Record<string, string> = {
  yellow: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50",
  purple: "bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50",
  blue: "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50",
  green: "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-700/50",
  pink: "bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700/50",
};

export function StickyNoteCard({ note, onEdit, onDelete, onTogglePin }: StickyNoteCardProps) {
  const bgClass = colorStyles[note.color] || colorStyles.yellow;

  // Format relative time (basic approximation)
  const getRelativeTime = (date: Date) => {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className={cn("relative group rounded-xl border p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-200", bgClass)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-[var(--primary-text)] line-clamp-2 mr-6 leading-tight">
          {note.title}
        </h3>
        <button 
          onClick={() => onTogglePin(note.id)} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={note.isPinned ? "Unpin note" : "Pin note"}
        >
          <Pin className={cn("w-4 h-4 transition-all", note.isPinned ? "fill-current text-[var(--primary-text)]" : "text-[var(--muted-text)] opacity-0 group-hover:opacity-100")} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 mb-4">
        <p className="text-sm text-[var(--secondary-text)] whitespace-pre-wrap line-clamp-6">
          {note.content}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center text-xs text-[var(--muted-text)]">
          <Clock className="w-3 h-3 mr-1" />
          {getRelativeTime(note.updatedAt)}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-md text-[var(--muted-text)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--primary-text)] transition-colors"
            title="Edit note"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-md text-[var(--muted-text)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
