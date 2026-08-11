import { Sparkles } from "lucide-react";

export function Greeting({ userName }: { userName: string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="py-6 sm:py-10 text-center flex flex-col items-center">
      <div className="inline-flex items-center justify-center space-x-2 bg-[var(--ai-accent)]/10 text-[var(--ai-accent)] px-3 py-1 rounded-full text-sm font-medium mb-4 ring-1 ring-[var(--ai-accent)]/20">
        <Sparkles className="w-4 h-4" />
        <span>Sticky AI</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--primary-text)] sm:text-5xl mb-2">
        {getGreeting()}, {userName.split(" ")[0]} <span className="inline-block origin-[70%_70%] hover:animate-wave">👋</span>
      </h1>
      <p className="mt-2 text-lg text-[var(--secondary-text)] max-w-2xl text-center">
        Your personal AI learning companion. Ask a doubt, summarize notes, create a quiz, or build a study plan.
      </p>
    </div>
  );
}
