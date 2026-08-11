import { FileText, FileUp, Users, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

const actions = [
  {
    title: "Generate Notes",
    description: "Create AI study material from syllabus.",
    icon: FileText,
    href: "/notes/generate",
  },
  {
    title: "Upload Document",
    description: "Summarize PDFs or images.",
    icon: FileUp,
    href: "/notes/upload",
  },
  {
    title: "Find a Mentor",
    description: "Connect with experts for doubts.",
    icon: Users,
    href: "/mentors",
  },
];

export function QuickActions() {
  return (
    <div className="mt-2 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className="group cursor-pointer border-[var(--border)] bg-[var(--surface)] hover:border-[var(--ai-accent)]/50 hover:bg-[var(--elevated)] hover:shadow-md hover:shadow-[var(--ai-accent)]/5 transition-all duration-300">
              <CardHeader className="flex flex-row items-center gap-4 p-5">
                <div className="p-2.5 rounded-lg bg-[var(--background)] text-[var(--secondary-text)] group-hover:text-[var(--ai-accent)] group-hover:bg-[var(--ai-accent)]/10 transition-colors">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">{action.title}</CardTitle>
                  <CardDescription className="mt-0.5 text-xs line-clamp-1">{action.description}</CardDescription>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-text)] group-hover:text-[var(--ai-accent)] transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
