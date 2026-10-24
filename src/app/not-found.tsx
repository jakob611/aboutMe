import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <section className="pt-24 pb-20 min-h-[70vh] flex items-center">
      <div className="mx-auto max-w-xl px-5 sm:px-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-rose-500 shadow-lg shadow-rose-500/30 mb-5">
          <AlertTriangle size={28} className="text-white" />
        </div>
        <h1 className="text-6xl sm:text-8xl font-bold text-gradient">404</h1>
        <p className="mt-4 text-lg text-[color:var(--color-fg-muted)]">
          This page doesn&apos;t exist — or hasn&apos;t been built yet.
        </p>
        <div className="mt-8">
          <Link href="/" className="btn-primary">
            <Home size={16} /> Back home
          </Link>
        </div>
      </div>
    </section>
  );
}
