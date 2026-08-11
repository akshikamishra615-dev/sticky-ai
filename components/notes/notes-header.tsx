import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesHeaderProps {
  onCreateClick: () => void;
}

export function NotesHeader({ onCreateClick }: NotesHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary-text)] tracking-tight">My Notes</h1>
        <p className="text-[var(--secondary-text)] mt-1 text-sm max-w-xl">
          Your personal AI-powered knowledge library. Organize, review, and generate study material instantly.
        </p>
      </div>
      
      <Button 
        onClick={onCreateClick}
        variant="ai" 
        className="font-semibold shadow-md shadow-[var(--ai-accent)]/20 hover:shadow-[var(--ai-accent)]/40 transition-all group"
      >
        <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
        Create AI Note
      </Button>
    </div>
  );
}
