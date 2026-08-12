"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!token) {
      setError("Reset token is missing from the URL.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess("Password reset successfully.");
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
      
      <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2 text-center">Set new password</h2>
      <p className="text-sm text-[var(--muted-text)] text-center mb-8">
        Please enter your new password below.
      </p>

      {success ? (
        <div className="text-center space-y-6">
          <div className="bg-[var(--success)]/10 text-[var(--success)] p-4 rounded-xl border border-[var(--success)]/20">
            {success}
          </div>
          <Link href="/login" className="inline-block font-medium text-[var(--ai-accent)] hover:underline">
            Back to Login
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
            <label className="block text-sm font-medium text-[var(--primary-text)] mb-2" htmlFor="password">
              New Password
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

          <div>
            <label className="block text-sm font-medium text-[var(--primary-text)] mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset password"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--ai-accent)]" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
