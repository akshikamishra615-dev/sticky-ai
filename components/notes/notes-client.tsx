"use client";

import * as React from "react";
import { NotesHeader } from "@/components/notes/notes-header";
import { NotesToolbar } from "@/components/notes/notes-toolbar";
import { NotesGrid } from "@/components/notes/notes-grid";
import { CreateNoteFlow } from "@/components/notes/create-note-flow";
import { NoteViewer } from "@/components/notes/note-viewer";
import { BackButton } from "@/components/ui/back-button";
import { type Note } from "@/lib/mock-notes";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveGeneratedNote, toggleBookmark, deleteNote } from "@/lib/server/notes";

type ViewState = "library" | "create" | "viewer";

interface NotesClientProps {
  initialNotes: Note[];
}

export function NotesClient({ initialNotes }: NotesClientProps) {
  const [view, setView] = React.useState<ViewState>("library");
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  
  // Library filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState("All Subjects");

  // Filtering logic
  const filteredNotes = React.useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            note.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            note.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = subjectFilter === "All Subjects" || note.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, subjectFilter]);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Handlers
  const handleCreateNote = () => {
    setView("create");
  };

  const handleSaveDraft = async (newNote: Note) => {
    try {
      // Exclude id and lastUpdated as they are db-generated
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, lastUpdated: _lastUpdated, ...noteData } = newNote;
      const savedNote = await saveGeneratedNote(noteData);
      setNotes([savedNote as unknown as Note, ...notes]);
      setView("library"); // Return to library to see the new note
    } catch (e) {
      console.error("Failed to save note:", e);
    }
  };

  const handleOpenNote = (id: string) => {
    setActiveNoteId(id);
    setView("viewer");
  };

  const handleBackToLibrary = () => {
    setActiveNoteId(null);
    setView("library");
  };

  const handleToggleBookmark = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isBookmarked: !currentStatus } : n));
    try {
      await toggleBookmark(id, currentStatus);
    } catch (e) {
      // Revert if failed
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isBookmarked: currentStatus } : n));
      console.error("Failed to toggle bookmark:", e);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteNote(noteToDelete);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      setToastMessage("Note deleted successfully.");
      setTimeout(() => setToastMessage(null), 3000);
      if (activeNoteId === noteToDelete) {
        handleBackToLibrary();
      }
    } catch (e) {
      setToastMessage("Failed to delete note.");
      setTimeout(() => setToastMessage(null), 3000);
      console.error("Failed to delete note:", e);
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-y-auto">
      {view === "library" && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
          <NotesHeader onCreateClick={handleCreateNote} />
          
          {notes.length > 0 && (
            <NotesToolbar 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
            />
          )}

          <NotesGrid 
            notes={filteredNotes} 
            onNoteClick={handleOpenNote} 
            onCreateClick={handleCreateNote}
            searchQuery={searchQuery}
            onDeleteNote={(e, id) => {
              e.stopPropagation();
              setNoteToDelete(id);
            }}
          />
        </div>
      )}

      {view === "create" && (
        <CreateNoteFlow 
          onClose={handleBackToLibrary} 
          onSave={handleSaveDraft} 
        />
      )}

      {view === "viewer" && activeNote && (
        <div className="w-full relative h-full">
          {/* Viewer Toolbar */}
          <div className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 sm:px-8 py-4 mb-8">
            <div className="max-w-3xl mx-auto flex justify-between items-center">
              <BackButton 
                fallbackHref="/notes" 
                onClick={handleBackToLibrary} 
                label="Back to Library" 
              />
            </div>
          </div>
          
          <NoteViewer 
            note={activeNote} 
            onToggleBookmark={() => handleToggleBookmark(activeNote.id, activeNote.isBookmarked)} 
            onDelete={() => setNoteToDelete(activeNote.id)}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-[var(--primary-text)] mb-2">Delete this note?</h3>
            <p className="text-[var(--secondary-text)] text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setNoteToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                className="bg-[var(--error)] text-white hover:bg-[var(--error)]/90"
                onClick={handleDeleteNote}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[var(--surface)] border border-[var(--border)] text-[var(--primary-text)] px-4 py-3 rounded-lg shadow-lg font-medium text-sm">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
