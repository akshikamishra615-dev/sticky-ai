"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const stickyNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  content: z.string().min(1, "Content is required").max(3000, "Content is too long"),
  color: z.enum(["yellow", "purple", "blue", "green", "pink"]).default("yellow"),
});

export async function getStickyNotes() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const notes = await prisma.stickyNote.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' }
    ]
  });

  return notes;
}

export async function createStickyNote(data: z.infer<typeof stickyNoteSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedData = stickyNoteSchema.parse(data);

  return await prisma.stickyNote.create({
    data: {
      userId: session.user.id,
      title: validatedData.title,
      content: validatedData.content,
      color: validatedData.color,
    }
  });
}

export async function updateStickyNote(id: string, data: z.infer<typeof stickyNoteSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const validatedData = stickyNoteSchema.parse(data);

  // Security: use updateMany to ensure we only update if the user owns the note
  const result = await prisma.stickyNote.updateMany({
    where: {
      id,
      userId: session.user.id
    },
    data: {
      title: validatedData.title,
      content: validatedData.content,
      color: validatedData.color,
      updatedAt: new Date(),
    }
  });

  if (result.count === 0) {
    throw new Error("Note not found or unauthorized");
  }

  return true;
}

export async function deleteStickyNote(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: use deleteMany to ensure we only delete if the user owns the note
  const result = await prisma.stickyNote.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  });

  if (result.count === 0) {
    throw new Error("Note not found or unauthorized");
  }

  return true;
}

export async function toggleStickyNotePin(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Fetch the current note securely
  const currentNote = await prisma.stickyNote.findFirst({
    where: {
      id,
      userId: session.user.id
    },
    select: { isPinned: true }
  });

  if (!currentNote) {
    throw new Error("Note not found or unauthorized");
  }

  // Toggle the value
  const result = await prisma.stickyNote.updateMany({
    where: {
      id,
      userId: session.user.id
    },
    data: {
      isPinned: !currentNote.isPinned,
      updatedAt: new Date(),
    }
  });

  if (result.count === 0) {
    throw new Error("Failed to update pin status");
  }

  return !currentNote.isPinned;
}
