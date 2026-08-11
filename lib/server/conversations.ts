"use server"

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function getConversations() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return conversations.map(c => ({
    id: c.id,
    title: c.title,
    messages: c.messages.map(m => ({
      id: m.id,
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }))
  }));
}

export async function createConversation(title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      title
    }
  });

  return {
    id: conversation.id,
    title: conversation.title,
    messages: []
  };
}

export async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify conversation belongs to user
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation || conversation.userId !== session.user.id) {
    throw new Error("Unauthorized or not found");
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      role: role === 'user' ? 'USER' : 'ASSISTANT',
      content
    }
  });

  return {
    id: message.id,
    role: role,
    content: message.content,
    timestamp: message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

export async function deleteConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Security: use deleteMany to ensure we only delete if the user owns the conversation
  // Because Message has onDelete: Cascade in schema.prisma, messages will be deleted automatically.
  const result = await prisma.conversation.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  });

  if (result.count === 0) {
    throw new Error("Conversation not found or unauthorized");
  }

  return true;
}
