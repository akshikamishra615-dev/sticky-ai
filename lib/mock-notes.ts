export interface NoteSection {
  title: string;
  content: string; // Markdown or plain text
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  topic: string;
  description: string;
  lastUpdated: string;
  readTime: string; // e.g. "5 min read"
  isAiGenerated: boolean;
  isBookmarked: boolean;
  progress?: number; // Optional progress percentage
  sections: NoteSection[];
  visualLearning?: {
    type: string;
    content: string;
  };
}

export const initialNotes: Note[] = [
  {
    id: "note-1",
    title: "Cell Division & Genetics",
    subject: "Biology 101",
    topic: "Genetics",
    description: "A comprehensive overview of mitosis, meiosis, and basic genetic inheritance principles.",
    lastUpdated: "2 hours ago",
    readTime: "8 min read",
    isAiGenerated: true,
    isBookmarked: true,
    progress: 85,
    sections: [
      {
        title: "Overview",
        content: "Cell division is the process by which a parent cell divides into two or more daughter cells. It is essential for growth, repair, and reproduction in living organisms."
      },
      {
        title: "Key Concepts",
        content: "- **Mitosis**: Somatic cell division resulting in two identical diploid cells.\n- **Meiosis**: Gamete formation resulting in four genetically distinct haploid cells.\n- **Chromosomes**: Thread-like structures of DNA and protein."
      },
      {
        title: "Detailed Explanation",
        content: "### Phases of Mitosis\n1. **Prophase**: Chromatin condenses into visible chromosomes.\n2. **Metaphase**: Chromosomes align at the cell equator.\n3. **Anaphase**: Sister chromatids are pulled apart to opposite poles.\n4. **Telophase**: Nuclear membranes reform around the two sets of chromosomes, followed by cytokinesis."
      },
      {
        title: "Quick Revision",
        content: "Mitosis = Growth/Repair (Identical cells). Meiosis = Reproduction (Diverse cells)."
      },
      {
        title: "Practice Questions",
        content: "1. What is the main purpose of meiosis?\n2. During which phase of mitosis do chromosomes align at the equator?"
      }
    ]
  },
  {
    id: "note-2",
    title: "Dynamic Programming Fundamentals",
    subject: "Computer Science",
    topic: "Algorithms",
    description: "Understanding memoization, tabulation, and breaking down overlapping subproblems.",
    lastUpdated: "Yesterday",
    readTime: "12 min read",
    isAiGenerated: true,
    isBookmarked: false,
    progress: 40,
    sections: [
      {
        title: "Overview",
        content: "Dynamic Programming (DP) is an algorithmic technique for solving an optimization problem by breaking it down into simpler subproblems and utilizing the fact that the optimal solution to the overall problem depends upon the optimal solution to its subproblems."
      },
      {
        title: "Key Concepts",
        content: "- **Overlapping Subproblems**: The problem can be broken down into subproblems which are reused several times.\n- **Optimal Substructure**: An optimal solution can be constructed from optimal solutions of its subproblems.\n- **Memoization**: Top-down caching of results.\n- **Tabulation**: Bottom-up building of results."
      },
      {
        title: "Practice Questions",
        content: "1. Explain the difference between memoization and tabulation.\n2. Write the Fibonacci sequence using a bottom-up DP approach."
      }
    ]
  },
  {
    id: "note-3",
    title: "Database Normalization",
    subject: "Database Systems",
    topic: "Architecture",
    description: "Guide to 1NF, 2NF, 3NF, and BCNF with practical examples of reducing data redundancy.",
    lastUpdated: "Last Week",
    readTime: "6 min read",
    isAiGenerated: false,
    isBookmarked: false,
    sections: [
      {
        title: "Overview",
        content: "Database normalization is the process of structuring a relational database in accordance with a series of so-called normal forms in order to reduce data redundancy and improve data integrity."
      },
      {
        title: "Key Concepts",
        content: "- **1NF**: Atomic values only. No repeating groups.\n- **2NF**: 1NF + every non-prime attribute is fully functionally dependent on the primary key.\n- **3NF**: 2NF + no transitive dependencies."
      }
    ]
  }
];

export const subjects = ["All Subjects", "Biology 101", "Computer Science", "Database Systems", "Physics", "World History"];

// Mock AI Note Generation Utility
export async function generateMockNote(subject: string, topic: string, config: { style?: string; level?: string }): Promise<Note> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let sections: NoteSection[] = [];
      const lowerTopic = topic.toLowerCase();
      
      if (lowerTopic.includes("python")) {
        sections = [
          {
            title: "Overview",
            content: "Python is a high-level, interpreted programming language known for its readability and versatile applications, from web development to data science."
          },
          {
            title: "Key Concepts",
            content: "- **Variables and Data Types**: Integers, floats, strings, booleans.\n- **Conditional Statements and Loops**: if, elif, else, for, while.\n- **Functions and Scope**: def keyword, local vs global variables.\n- **Lists, Tuples, Sets and Dictionaries**: Built-in data structures."
          },
          {
            title: "Detailed Explanation",
            content: "### Syntax and Semantics\nPython uses indentation to define code blocks instead of curly braces. This enforces a clean, readable coding style.\n### Dynamic Typing\nYou don't need to declare variable types explicitly. Python determines the type at runtime, which allows for faster prototyping."
          },
          {
            title: "Important Points",
            content: "- Python is dynamically typed.\n- It has a massive ecosystem of libraries (e.g., NumPy, Pandas, Django).\n- Interpreted languages are generally slower than compiled ones like C++."
          },
          {
            title: "Quick Revision",
            content: "Python = High-level, readable, dynamically typed, heavily used in AI and web dev."
          },
          {
            title: "Practice Questions",
            content: "1. How do you define a function in Python?\n2. What is the difference between a list and a tuple?"
          }
        ];
      } else if (lowerTopic.includes("photosynthesis")) {
        sections = [
          {
            title: "Overview",
            content: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water."
          },
          {
            title: "Key Concepts",
            content: "- **Light-dependent Reactions**: Convert light energy into chemical energy (ATP and NADPH).\n- **Calvin Cycle (Light-independent)**: Uses ATP and NADPH to convert CO2 into sugar.\n- **Chloroplasts**: The organelles where photosynthesis takes place.\n- **Chlorophyll**: The green pigment responsible for capturing light."
          },
          {
            title: "Detailed Explanation",
            content: "### The Equation\n6CO2 + 6H2O + Light Energy → C6H12O6 + 6O2\n### Stages\nThe process occurs in two main stages: the light-dependent reactions in the thylakoid membrane, and the Calvin cycle in the stroma."
          },
          {
            title: "Important Points",
            content: "- Oxygen is released as a byproduct.\n- Without photosynthesis, the Earth's atmosphere would lack oxygen.\n- It forms the base of almost all food chains."
          },
          {
            title: "Quick Revision",
            content: "Photosynthesis: Sunlight + Water + CO2 = Glucose + Oxygen. Happens in chloroplasts."
          },
          {
            title: "Practice Questions",
            content: "1. What are the two main stages of photosynthesis?\n2. Where in the chloroplast does the Calvin cycle take place?"
          }
        ];
      } else if (lowerTopic.includes("cell division") || lowerTopic.includes("genetics")) {
        sections = [
          {
            title: "Overview",
            content: "Cell division is the biological process by which a parent cell divides into two or more daughter cells, essential for growth, repair, and reproduction."
          },
          {
            title: "Key Concepts",
            content: "- **Mitosis**: Somatic cell division producing two identical diploid cells.\n- **Meiosis**: Gamete formation producing four unique haploid cells.\n- **Cytokinesis**: The physical separation of the cytoplasm.\n- **Chromatin vs Chromosomes**: Different states of DNA packaging."
          },
          {
            title: "Detailed Explanation",
            content: "### The Cell Cycle\nThe cell cycle consists of Interphase (G1, S, G2) and the Mitotic (M) phase. During the S phase, DNA replication occurs to ensure each daughter cell receives a complete genome."
          },
          {
            title: "Important Points",
            content: "- Cancer can result from unregulated cell division.\n- Mitosis maintains the chromosome number, meiosis halves it.\n- Crossing over in meiosis increases genetic diversity."
          },
          {
            title: "Quick Revision",
            content: "Mitosis = identical copies (growth/repair). Meiosis = distinct gametes (reproduction)."
          },
          {
            title: "Practice Questions",
            content: "1. Name the four phases of mitosis in order.\n2. What is the significance of the S phase in the cell cycle?"
          }
        ];
      } else {
        sections = [
          {
            title: "Overview",
            content: `This note covers the fundamental concepts of ${topic}. It has been optimized for ${config.style || "deep understanding"} at a ${config.level || "standard"} level.`
          },
          {
            title: "Key Concepts",
            content: `- Core principle of ${topic}\n- Important terminology and definitions\n- How it connects to the broader subject of ${subject}`
          },
          {
            title: "Detailed Explanation",
            content: `### Introduction\nWhen studying ${topic}, it's crucial to understand the underlying mechanics. \n\nFirstly, the primary theory suggests that systems interact in predictable ways. Secondly, by isolating the variables, we can observe the direct effects.\n\n*This is a mock detailed explanation generated by Sticky AI.*`
          },
          {
            title: "Important Points",
            content: `- The context of ${subject} is highly relevant.\n- Variables must be isolated to prove causation.\n- Foundational theories support the advanced applications.`
          },
          {
            title: "Quick Revision",
            content: `Remember: ${topic} is all about understanding the core mechanism and applying it to problem-solving.`
          },
          {
            title: "Practice Questions",
            content: `1. Define the main concept of ${topic}.\n2. How does this apply to real-world scenarios in ${subject}?`
          }
        ];
      }

      // Defensive filtering for robust frontend rendering
      sections = sections.filter(s => s.content && s.content.trim().length > 0);

      resolve({
        id: `note-${Date.now()}`,
        title: `${topic} Masterclass`,
        subject: subject,
        topic: topic,
        description: `AI-generated study material focusing on ${topic}, customized for ${config.style || "general study"}.`,
        lastUpdated: "Just now",
        readTime: "5 min read",
        isAiGenerated: true,
        isBookmarked: false,
        sections
      });
    }, 2500); // 2.5 second simulated generation delay
  });
}
