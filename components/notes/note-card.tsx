import { type Note } from "@/lib/mock-notes";
import { Sparkles, Clock, Bookmark, BookOpen, Trash2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: Note;
  onClick: (id: string) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
}

export function NoteCard({ note, onClick, onDelete }: NoteCardProps) {
  return (
    <Card 
      onClick={() => onClick(note.id)}
      className="flex flex-col border-[var(--border)] hover:border-[var(--ai-accent)]/40 hover:shadow-md hover:shadow-[var(--ai-accent)]/5 transition-all duration-300 cursor-pointer group bg-[var(--surface)] overflow-hidden relative h-full"
    >
      {/* Top subtle gradient bar if AI generated */}
      {note.isAiGenerated && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--ai-accent)]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      
      <CardHeader className="p-5 pb-3">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2">
            <Badge variant="secondary" className="font-medium text-[10px] uppercase tracking-wider bg-[var(--background)]">
              {note.subject}
            </Badge>
            {note.isAiGenerated && (
              <Badge className="bg-[var(--ai-accent)]/10 text-[var(--ai-accent)] hover:bg-[var(--ai-accent)]/20 border-transparent font-medium text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {note.isBookmarked && (
              <Bookmark className="w-4 h-4 text-[var(--ai-accent)] fill-[var(--ai-accent)]" />
            )}
            {onDelete && (
              <button 
                onClick={(e) => onDelete(e, note.id)}
                className="p-1 rounded-md text-[var(--muted-text)] opacity-0 group-hover:opacity-100 hover:text-[var(--error)] hover:bg-[var(--error)]/10 transition-all"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <CardTitle className="text-base leading-snug line-clamp-2 group-hover:text-[var(--ai-accent)] transition-colors">
          {note.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="mt-auto p-5 pt-0 flex flex-col flex-1 justify-between">
        <p className="text-xs text-[var(--secondary-text)] line-clamp-2 mb-4 leading-relaxed">
          {note.description}
        </p>
        
        <div className="flex flex-col gap-3 mt-auto">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-[10px] font-medium text-[var(--muted-text)] uppercase tracking-wider">
            <div className="flex items-center">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              {note.lastUpdated}
            </div>
            <div className="flex items-center">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              {note.readTime}
            </div>
          </div>
          
          {/* Optional Progress Bar (Only shown if progress exists and is meaningful) */}
          {note.progress !== undefined && (
            <div className="w-full bg-[var(--background)] rounded-full h-1 overflow-hidden mt-1">
              <div 
                className={cn(
                  "h-1 rounded-full transition-all duration-1000 ease-out",
                  note.progress === 100 ? "bg-[var(--success)]" : "bg-[var(--ai-accent)]"
                )} 
                style={{ width: `${note.progress}%` }} 
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
