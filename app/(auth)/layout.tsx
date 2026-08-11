import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center items-center gap-2">
          <Sparkles className="w-8 h-8 text-[var(--ai-accent)]" />
          <span className="text-2xl font-bold text-[var(--primary-text)] tracking-tight">Sticky AI</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface)] py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-[var(--border)]">
          {children}
        </div>
      </div>
    </div>
  );
}
