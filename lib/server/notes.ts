"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Note } from "@/lib/mock-notes";

export async function getNotes() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' }
  });

  // Convert to frontend Note format
  return notes.map(note => {
    let parsedContent;
    try {
      parsedContent = JSON.parse(note.content);
    } catch {
      parsedContent = [];
    }
    
    const isArray = Array.isArray(parsedContent);
    
    return {
      ...note,
      sections: isArray ? parsedContent : (parsedContent.sections || []),
      visualLearning: isArray ? undefined : parsedContent.visualLearning,
      readTime: note.readingTime || "5 min read",
      lastUpdated: note.updatedAt.toLocaleDateString(),
    };
  });
}

export async function saveGeneratedNote(noteData: Omit<Note, 'id' | 'lastUpdated'>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const newNote = await prisma.note.create({
    data: {
      userId: session.user.id,
      title: noteData.title,
      subject: noteData.subject,
      topic: noteData.topic,
      description: noteData.description,
      content: JSON.stringify({
        sections: noteData.sections,
        visualLearning: noteData.visualLearning
      }),
      isBookmarked: noteData.isBookmarked,
      isAiGenerated: noteData.isAiGenerated,
      readingTime: noteData.readTime,
      progress: noteData.progress,
    }
  });

  const parsedContent = JSON.parse(newNote.content);

  return {
    ...newNote,
    sections: parsedContent.sections || [],
    visualLearning: parsedContent.visualLearning,
    readTime: newNote.readingTime || "5 min read",
    lastUpdated: newNote.updatedAt.toLocaleDateString(),
  };
}

export async function deleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Prisma deleteMany ensures we only delete if the user owns it
  const result = await prisma.note.deleteMany({
    where: {
      id: noteId,
      userId: session.user.id
    }
  });

  if (result.count === 0) {
    throw new Error("Note not found or unauthorized");
  }

  return true;
}

export async function toggleBookmark(noteId: string, currentStatus: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const updatedNote = await prisma.note.updateMany({
    where: { 
      id: noteId,
      userId: session.user.id // Ensure they own the note
    },
    data: {
      isBookmarked: !currentStatus
    }
  });

  if (updatedNote.count === 0) {
    throw new Error("Note not found or unauthorized");
  }

  return !currentStatus;
}
