"use client";

import * as React from "react";
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
  X,
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

interface MobileDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function MobileDrawer({ open, setOpen }: MobileDrawerProps) {
  const pathname = usePathname();

  // Close drawer on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (!open) return null;

  return (
    <div className="relative z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex">
        <div className="relative mr-16 flex w-full max-w-xs flex-1">
          <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
            <button type="button" className="-m-2.5 p-2.5" onClick={() => setOpen(false)}>
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--surface)] px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <Sparkles className="h-6 w-6 text-[var(--ai-accent)] mr-2" />
              <span className="text-xl font-bold text-[var(--primary-text)] tracking-tight">Sticky AI</span>
            </div>
            <nav className="flex flex-1 flex-col">
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
                    href="/settings"
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
      </div>
    </div>
  );
}
