"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess(data.message);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <BackButton fallbackHref="/login" />
      </div>
      
      <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2 text-center">Forgot your password?</h2>
      <p className="text-sm text-[var(--muted-text)] text-center mb-8">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {success ? (
        <div className="text-center space-y-6">
          <div className="bg-[var(--success)]/10 text-[var(--success)] p-4 rounded-xl border border-[var(--success)]/20">
            {success}
          </div>
          <Link href="/login" className="inline-block font-medium text-[var(--ai-accent)] hover:underline">
            Return to Login
          </Link>
        </div>
      ) : (
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

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--primary-text)] text-[var(--background)] hover:opacity-90"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
