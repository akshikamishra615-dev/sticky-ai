import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { initialNotes } from '../lib/mock-notes';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Seed Demo User
  // Use upsert to avoid duplicate key errors if the seed runs multiple times
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@sticky.ai' },
    update: {},
    create: {
      email: 'demo@sticky.ai',
      name: 'Demo Student',
      password: hashedPassword,
      profile: {
        create: {
          educationLevel: 'Undergraduate',
          institution: 'Tech University',
          interests: ['Computer Science', 'Biology'],
        }
      }
    },
  });
  
  console.log(`Demo user upserted: ${demoUser.email}`);

  // 2. Seed Notes
  for (const mockNote of initialNotes) {
    // Generate a deterministically unique title/subject combination for upserting,
    // or just check if it exists by title & userId to keep it safe.
    // Prisma doesn't have an easy unique composite for these unless defined in schema,
    // so we'll query first to avoid creating duplicates.
    
    const existingNote = await prisma.note.findFirst({
      where: {
        userId: demoUser.id,
        title: mockNote.title,
      }
    });

    if (!existingNote) {
      await prisma.note.create({
        data: {
          userId: demoUser.id,
          title: mockNote.title,
          subject: mockNote.subject,
          topic: mockNote.topic,
          description: mockNote.description,
          content: JSON.stringify(mockNote.sections),
          isBookmarked: mockNote.isBookmarked,
          isAiGenerated: mockNote.isAiGenerated,
          readingTime: mockNote.readTime,
          progress: mockNote.progress,
        }
      });
      console.log(`Created note: ${mockNote.title}`);
    } else {
      console.log(`Note already exists: ${mockNote.title}`);
    }
  }

  // 3. Seed Conversations
  const mockConversations = [
    { title: "Dynamic Programming Help" },
    { title: "Photosynthesis Explained" }
  ];

  for (const mockConvo of mockConversations) {
    const existingConvo = await prisma.conversation.findFirst({
      where: {
        userId: demoUser.id,
        title: mockConvo.title,
      }
    });

    if (!existingConvo) {
      await prisma.conversation.create({
        data: {
          userId: demoUser.id,
          title: mockConvo.title,
          messages: {
            create: [
              { role: 'USER', content: `Can you explain ${mockConvo.title}?` },
              { role: 'ASSISTANT', content: `Certainly! Here is a detailed explanation of ${mockConvo.title}...` },
            ]
          }
        }
      });
      console.log(`Created conversation: ${mockConvo.title}`);
    } else {
      console.log(`Conversation already exists: ${mockConvo.title}`);
    }
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
