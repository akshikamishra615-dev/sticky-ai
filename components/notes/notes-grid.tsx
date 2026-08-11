import { type Note } from "@/lib/mock-notes";
import { NoteCard } from "./note-card";
import { BookOpen, SearchX } from "lucide-react";

interface NotesGridProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
  onCreateClick: () => void;
  searchQuery?: string;
  onDeleteNote?: (e: React.MouseEvent, id: string) => void;
}

export function NotesGrid({ notes, onNoteClick, onCreateClick, searchQuery, onDeleteNote }: NotesGridProps) {
  if (notes.length === 0) {
    if (searchQuery) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-[var(--border)] rounded-2xl bg-[var(--surface)]/30">
          <div className="bg-[var(--background)] p-4 rounded-full mb-4 ring-1 ring-[var(--border)]">
            <SearchX className="h-6 w-6 text-[var(--muted-text)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--primary-text)] mb-1">No matches found</h3>
          <p className="text-sm text-[var(--secondary-text)] max-w-sm">
            Try adjusting your search or filters to find what you&apos;re looking for.
          </p>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 border-[var(--border)] rounded-2xl bg-[var(--surface)]/30">
        <div className="bg-[var(--ai-accent)]/10 p-5 rounded-full mb-5 ring-1 ring-[var(--ai-accent)]/20 shadow-[0_0_30px_rgba(var(--ai-accent-rgb),0.1)]">
          <BookOpen className="h-8 w-8 text-[var(--ai-accent)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--primary-text)] mb-2">No notes yet</h3>
        <p className="text-sm text-[var(--secondary-text)] max-w-sm mb-6">
          Create your first AI-powered study note to start building your personal knowledge library.
        </p>
        <button 
          onClick={onCreateClick}
          className="bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90 px-6 py-2.5 rounded-lg font-semibold shadow-md transition-all"
        >
          Create AI Note
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onClick={onNoteClick} onDelete={onDeleteNote} />
      ))}
    </div>
  );
}
