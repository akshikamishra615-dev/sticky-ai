import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  Users, 
  Library,
  Settings,
  StickyNote as StickyNoteIcon
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Notes", href: "/notes", icon: BookOpen },
  { name: "Sticky Notes", href: "/sticky-notes", icon: StickyNoteIcon },
  { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { name: "AI Assistant", href: "/ai", icon: Sparkles },
  { name: "Mentors", href: "/mentors", icon: Users },
  { name: "Resources", href: "/resources", icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-6 pb-4 pt-6">
        <div className="flex h-8 shrink-0 items-center">
          <Sparkles className="h-6 w-6 text-[var(--ai-accent)] mr-2" />
          <span className="text-xl font-bold text-[var(--primary-text)] tracking-tight">Sticky AI</span>
        </div>
        <nav className="flex flex-1 flex-col mt-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-[var(--elevated)] text-[var(--ai-accent)]"
                            : "text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--elevated)]",
                          "group flex gap-x-3 rounded-lg p-2.5 text-sm font-semibold leading-6 transition-colors"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive ? "text-[var(--ai-accent)]" : "text-[var(--muted-text)] group-hover:text-[var(--primary-text)]",
                            "h-5 w-5 shrink-0 transition-colors"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <Link
                href="/profile"
                className="group -mx-2 flex gap-x-3 rounded-lg p-2.5 text-sm font-semibold leading-6 text-[var(--secondary-text)] hover:bg-[var(--elevated)] hover:text-[var(--primary-text)] transition-colors"
              >
                <Settings
                  className="h-5 w-5 shrink-0 text-[var(--muted-text)] group-hover:text-[var(--primary-text)] transition-colors"
                  aria-hidden="true"
                />
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
