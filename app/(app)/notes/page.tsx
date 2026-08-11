import { NotesClient } from "@/components/notes/notes-client";
import { getNotes } from "@/lib/server/notes";
import { type Note } from "@/lib/mock-notes";

export default async function NotesPage() {
  const serverNotes = await getNotes();
  
  return <NotesClient initialNotes={serverNotes as unknown as Note[]} />;
}
