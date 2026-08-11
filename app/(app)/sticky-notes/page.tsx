import { StickyNotesClient } from "@/components/sticky-notes/sticky-notes-client";
import { getStickyNotes } from "@/lib/server/sticky-notes";
import { type StickyNote } from "@/components/sticky-notes/sticky-note-card";

export const metadata = {
  title: "Sticky Notes | Sticky AI",
  description: "Capture quick personal notes and reminders.",
};

export default async function StickyNotesPage() {
  const dbNotes = await getStickyNotes();
  
  // Pass to client component
  // Prisma returns dates which Next.js App Router can pass directly to client components
  return <StickyNotesClient initialNotes={dbNotes as StickyNote[]} />;
}
