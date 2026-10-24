"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Lock } from "lucide-react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error || "Login failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Login failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="pt-16 sm:pt-24 pb-24">
      <div className="mx-auto max-w-md px-5 sm:px-8">
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={18} />
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          </div>
          <p className="text-sm text-[color:var(--color-fg-muted)] mb-6">
            Enter the admin password to manage projects, uploads, and messages.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              aria-label="Admin password"
              maxLength={1024}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Password"
              className="input"
            />
            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in
                </>
              ) : (
                "Sign in"
              )}
            </button>
            {error && (
              <p className="text-sm text-rose-300 flex items-center gap-1.5">
                <AlertCircle size={14} /> {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
