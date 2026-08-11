export function generateMockResponse(query: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let response = "";

      if (lowerQuery.includes("quiz")) {
        response = "Here is a quick quiz for you:\n\n**Question 1:** What is the powerhouse of the cell?\n\nA) Nucleus\nB) Mitochondria\nC) Ribosome\n\nTake your best guess!";
      } else if (lowerQuery.includes("summary") || lowerQuery.includes("summarize")) {
        response = "Here is a summary of your recent notes:\n\n- **Cellular Respiration** involves Glycolysis, the Krebs Cycle, and the Electron Transport Chain.\n- **Mitosis** is used for growth and repair, producing two identical cells.\n\nLet me know if you want to dive deeper into any of these topics.";
      } else if (lowerQuery.includes("explain") || lowerQuery.includes("what is")) {
        response = "I can explain that! It's essentially a way to break down a complex problem into smaller, more manageable pieces. \n\nFor example, in Computer Science, we use algorithms to step through problems logically. Does that make sense, or would you like a more specific example?";
      } else if (lowerQuery.includes("plan") || lowerQuery.includes("study plan")) {
        response = "Great idea! Here is a suggested study plan for this week:\n\n- **Monday:** Review biology notes for 30 mins.\n- **Wednesday:** Practice 5 calculus problems.\n- **Friday:** Take a mock history quiz.\n\nYou've got this!";
      } else {
        response = "That's a great question. As your AI learning companion, I'm here to help you understand these concepts better. Could you provide a bit more context on what specific part you're struggling with?";
      }

      resolve(response);
    }, 1500 + Math.random() * 1000); // Simulate network delay (1.5s - 2.5s)
  });
}
