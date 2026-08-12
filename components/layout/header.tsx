"use client";

import Link from "next/link";
import { Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ onMenuClick, userName, userImage }: { onMenuClick: () => void, userName: string, userImage?: string | null }) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-[var(--secondary-text)] lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Search or other header tools could go here */}
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Button variant="ghost" size="icon" className="text-[var(--secondary-text)]">
            <span className="sr-only">View notifications</span>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-[var(--border)]" aria-hidden="true" />

          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <Link href="/profile" className="-m-1.5 flex items-center p-1.5 hover:bg-[var(--background)] rounded-full transition-colors pr-3">
              <span className="sr-only">Open user profile</span>
              {userImage ? (
                <img src={userImage} alt="" className="h-8 w-8 rounded-full bg-[var(--surface)] object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--ai-accent)]/20 flex items-center justify-center text-[var(--ai-accent)] font-bold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-[var(--primary-text)]" aria-hidden="true">
                  {userName}
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
