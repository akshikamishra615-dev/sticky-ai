import { Search, SlidersHorizontal } from "lucide-react";
import { subjects } from "@/lib/mock-notes";

interface NotesToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
}

export function NotesToolbar({
  searchQuery,
  setSearchQuery,
  subjectFilter,
  setSubjectFilter
}: NotesToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[var(--muted-text)]" />
        </div>
        <input
          type="text"
          placeholder="Search notes, topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-xl leading-5 bg-[var(--surface)] text-[var(--primary-text)] placeholder-[var(--muted-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent transition-all text-sm"
        />
      </div>

      {/* Filter Dropdown */}
      <div className="relative shrink-0 sm:w-48">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SlidersHorizontal className="h-4 w-4 text-[var(--muted-text)]" />
        </div>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="block w-full pl-10 pr-10 py-2 border border-[var(--border)] rounded-xl leading-5 bg-[var(--surface)] text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
        >
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
        {/* Custom arrow since appearance is none */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-[var(--muted-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
