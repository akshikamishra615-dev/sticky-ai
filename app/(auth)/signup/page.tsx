"use client"

import { useState } from "react";
import { registerUser } from "@/lib/server/users";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await registerUser(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/login?registered=true");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-6 text-center">Create your account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-[var(--error)]/10 text-[var(--error)] p-3 rounded-lg text-sm border border-[var(--error)]/20">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-[var(--primary-text)] mb-2" htmlFor="name">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
            placeholder="John Doe"
          />
        </div>

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
            minLength={6}
            className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--primary-text)] focus:ring-2 focus:ring-[var(--ai-accent)] focus:border-transparent outline-none"
            placeholder="••••••••"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--primary-text)] text-[var(--background)] hover:opacity-90"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign up"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--secondary-text)]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--ai-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
