"use client"

import { useState, Suspense } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-6 text-center">Sign in to your account</h2>
      
      {registered && (
        <div className="bg-[var(--success)]/10 text-[var(--success)] p-3 rounded-lg text-sm border border-[var(--success)]/20 mb-6">
          Account created! Please sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[var(--error)]/10 text-[var(--error)] p-3 rounded-lg text-sm border border-[var(--error)]/20">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-[var(--primary-text)] mb-2" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--primary-text)] mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
            placeholder="••••••••"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--primary-text)] text-[var(--background)] hover:opacity-90"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--secondary-text)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-[var(--ai-accent)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--ai-accent)]" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
