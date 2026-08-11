export const studentProfile = {
  name: "Bhupendra",
  fullName: "Bhupendra",
  email: "alex@example.com",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  major: "Computer Science",
  streak: 12,
};

export const recentNotes = [
  {
    id: "note-1",
    title: "Introduction to Cellular Respiration",
    subject: "Biology 101",
    lastAccessed: "2 hours ago",
    progress: 85,
  },
  {
    id: "note-2",
    title: "Derivatives and Rates of Change",
    subject: "Calculus I",
    lastAccessed: "5 hours ago",
    progress: 40,
  },
  {
    id: "note-3",
    title: "The Roman Republic vs Empire",
    subject: "World History",
    lastAccessed: "Yesterday",
    progress: 100,
  },
];

export const suggestedPrompts = [
  "Summarize my Cellular Respiration notes",
  "Quiz me on Calculus derivatives",
  "Explain Big O notation simply",
  "Create a study plan for History midterms",
];

export type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  subject: string;
  date: string;
  messages: Message[];
};

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    title: "Biology — Cell Division",
    subject: "Biology 101",
    date: "Today",
    messages: [
      { id: "m1", role: "user", content: "Can you explain the difference between mitosis and meiosis?", timestamp: "10:30 AM" },
      { id: "m2", role: "ai", content: "Of course! **Mitosis** and **meiosis** are two different types of cell division.\n\n1. **Mitosis** results in two identical daughter cells, each with the same number of chromosomes as the parent cell. It's used for growth and repair.\n2. **Meiosis** results in four genetically different daughter cells, each with half the number of chromosomes. It's strictly used for producing gametes (sperm and egg cells).\n\nWould you like a quick quiz on this?", timestamp: "10:30 AM" },
      { id: "m3", role: "user", content: "Yes, please!", timestamp: "10:31 AM" },
      { id: "m4", role: "ai", content: "Great! Here is a question:\n\n*Which process involves two rounds of cell division?*\nA) Mitosis\nB) Meiosis", timestamp: "10:31 AM" }
    ]
  },
  {
    id: "conv-2",
    title: "DSA — Dynamic Programming",
    subject: "Computer Science",
    date: "Yesterday",
    messages: [
      { id: "m1", role: "user", content: "I'm struggling to understand memoization in dynamic programming. Could you explain it like I'm 5?", timestamp: "2:15 PM" },
      { id: "m2", role: "ai", content: "Imagine you have to calculate `5 + 5 + 5 + 5`. You figure out it's `20`. \n\nNow, if I immediately ask you what `5 + 5 + 5 + 5` is again, you don't recount it. You just remember that the answer was `20`. \n\n**Memoization** in code is exactly that: storing the results of expensive function calls and returning the cached result when the same inputs occur again. It saves the computer from doing repetitive work!", timestamp: "2:15 PM" }
    ]
  },
  {
    id: "conv-3",
    title: "DBMS — Normalization",
    subject: "Database Systems",
    date: "Last Week",
    messages: []
  },
  {
    id: "conv-4",
    title: "Operating Systems — Process Scheduling",
    subject: "OS",
    date: "Last Week",
    messages: []
  }
];
