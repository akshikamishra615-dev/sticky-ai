"use client";

import * as React from "react";
import { StickyNoteCard, type StickyNote } from "./sticky-note-card";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createStickyNote, updateStickyNote, deleteStickyNote, toggleStickyNotePin } from "@/lib/server/sticky-notes";
import { cn } from "@/lib/utils";

interface StickyNotesClientProps {
  initialNotes: StickyNote[];
}

export function StickyNotesClient({ initialNotes }: StickyNotesClientProps) {
  const [notes, setNotes] = React.useState<StickyNote[]>(initialNotes);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterPinned, setFilterPinned] = React.useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<StickyNote | null>(null);
  
  // Form states
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [color, setColor] = React.useState<"yellow" | "purple" | "blue" | "green" | "pink">("yellow");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete states
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterPinned ? note.isPinned : true;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const openCreateModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setColor("yellow");
    setIsModalOpen(true);
  };

  const openEditModal = (note: StickyNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color as "yellow" | "purple" | "blue" | "green" | "pink");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (editingNote) {
        await updateStickyNote(editingNote.id, { title, content, color });
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, title, content, color, updatedAt: new Date() } : n));
        showToast("Sticky note updated.");
      } else {
        const newNote = await createStickyNote({ title, content, color });
        setNotes(prev => [newNote as unknown as StickyNote, ...prev]);
        showToast("Sticky note created.");
      }
      setIsModalOpen(false);
    } catch (e) {
      showToast("Failed to save sticky note.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    // Optimistic UI
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !note.isPinned, updatedAt: new Date() } : n));
    
    try {
      const newStatus = await toggleStickyNotePin(id);
      // Ensure sync
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: newStatus } : n));
    } catch (e) {
      // Revert on failure
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: note.isPinned } : n));
      showToast("Failed to toggle pin status.");
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteStickyNote(noteToDelete);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      showToast("Sticky note deleted.");
    } catch (e) {
      showToast("Failed to delete sticky note.");
      console.error(e);
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  // Keyboard accessibility for modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-y-auto">
      {/* Header and Controls */}
      <div className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary-text)] tracking-tight">Sticky Notes</h1>
              <p className="text-[var(--secondary-text)] text-sm mt-1">Capture quick thoughts, reminders, and important things.</p>
            </div>
            <Button 
              onClick={openCreateModal}
              className="bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90 gap-2 font-semibold shadow-sm w-full md:w-auto"
            >
              <Plus className="w-4 h-4" />
              New Sticky Note
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-text)]" />
              <Input
                type="text"
                placeholder="Search sticky notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--surface)] border-[var(--border)] focus-visible:ring-[var(--ai-accent)]"
              />
            </div>
            <Button
              variant={filterPinned ? "default" : "outline"}
              onClick={() => setFilterPinned(!filterPinned)}
              className={cn(
                "gap-2",
                filterPinned ? "bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90" : "text-[var(--secondary-text)]"
              )}
            >
              <Filter className="w-4 h-4" />
              Pinned
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-dashed border-2 border-[var(--border)] rounded-2xl bg-[var(--surface)]/30">
            <h3 className="text-lg font-bold text-[var(--primary-text)] mb-2">Your sticky board is empty</h3>
            <p className="text-sm text-[var(--secondary-text)] max-w-sm mb-6">Capture a quick thought, reminder, or idea.</p>
            <Button onClick={openCreateModal} className="bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90 gap-2">
              <Plus className="w-4 h-4" />
              Create Sticky Note
            </Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-[var(--border)] rounded-2xl bg-[var(--surface)]/30">
            <h3 className="text-base font-semibold text-[var(--primary-text)] mb-1">No sticky notes found</h3>
            <p className="text-sm text-[var(--secondary-text)] max-w-sm">Try another search or remove filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
            {filteredNotes.map(note => (
              <div key={note.id}>
                <StickyNoteCard 
                  note={note} 
                  onEdit={openEditModal} 
                  onDelete={setNoteToDelete} 
                  onTogglePin={handleTogglePin} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-w-lg w-full p-6 animate-in zoom-in-95 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-[var(--primary-text)]">{editingNote ? "Edit Sticky Note" : "New Sticky Note"}</h2>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--secondary-text)]">Title <span className="text-red-500">*</span></label>
              <Input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Note title" 
                maxLength={100}
                autoFocus
                className="bg-[var(--background)] border-[var(--border)]"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--secondary-text)]">Content <span className="text-red-500">*</span></label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your note here..."
                maxLength={3000}
                rows={5}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--primary-text)] placeholder:text-[var(--muted-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent resize-none"
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-1">
              <label className="text-sm font-medium text-[var(--secondary-text)]">Color</label>
              <div className="flex gap-3">
                {(["yellow", "purple", "blue", "green", "pink"] as const).map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ai-accent)] focus:ring-offset-[var(--surface)]",
                      color === c ? "border-[var(--primary-text)] scale-110 shadow-sm" : "border-transparent opacity-70",
                      c === "yellow" ? "bg-yellow-200 dark:bg-yellow-700/60" :
                      c === "purple" ? "bg-purple-200 dark:bg-purple-700/60" :
                      c === "blue" ? "bg-blue-200 dark:bg-blue-700/60" :
                      c === "green" ? "bg-green-200 dark:bg-green-700/60" :
                      "bg-pink-200 dark:bg-pink-700/60"
                    )}
                    aria-label={`Select ${c} color`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="bg-[var(--ai-accent)] text-[var(--ai-accent-fg)] hover:bg-[var(--ai-accent)]/90"
              >
                {isSubmitting ? "Saving..." : editingNote ? "Save Changes" : "Create Note"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-[var(--primary-text)] mb-2">Delete this sticky note?</h3>
            <p className="text-[var(--secondary-text)] text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setNoteToDelete(null)} disabled={isDeleting}>Cancel</Button>
              <Button className="bg-[var(--error)] text-white hover:bg-[var(--error)]/90" onClick={handleDelete} disabled={isDeleting}>
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
