import { recentNotes } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

export function ContinueLearning() {
  return (
    <div className="mt-12 mb-20">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-lg font-bold text-[var(--primary-text)] flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-[var(--ai-accent)]" />
          Continue Learning
        </h2>
        <Link href="/notes" className="text-sm font-semibold text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors inline-flex items-center group">
          View all <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {recentNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentNotes.map((note) => (
            <Card key={note.id} className="flex flex-col border-[var(--border)] hover:border-[var(--ai-accent)]/30 hover:shadow-md hover:shadow-[var(--ai-accent)]/5 transition-all duration-300 cursor-pointer group bg-[var(--surface)] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--ai-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="secondary" className="font-medium text-[10px] uppercase tracking-wider bg-[var(--background)]">
                    {note.subject}
                  </Badge>
                </div>
                <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-[var(--ai-accent)] transition-colors">{note.title}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto p-5 pt-0">
                <div className="flex items-center text-xs text-[var(--muted-text)] mb-4">
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {note.lastAccessed}
                </div>
                <div className="w-full bg-[var(--background)] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[var(--ai-accent)] to-[var(--ai-accent)]/70 h-1.5 rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ width: `${note.progress}%` }} 
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30" />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--secondary-text)] mt-2 font-medium uppercase tracking-wider text-right">{note.progress}% mastered</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-[var(--surface)]/50">
          <div className="bg-[var(--background)] p-4 rounded-full mb-4 ring-1 ring-[var(--border)]">
            <BookOpen className="h-6 w-6 text-[var(--muted-text)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--primary-text)] mb-1">No recent notes</h3>
          <p className="text-xs text-[var(--secondary-text)] max-w-sm">
            You haven&apos;t started any study sessions yet. Ask Sticky AI to generate some notes for you!
          </p>
        </Card>
      )}
    </div>
  );
}
