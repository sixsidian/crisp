import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="mb-3 text-sm uppercase tracking-[0.2em] text-accent">
        Commvault partner tool
      </p>
      <h1 className="font-display text-4xl text-foreground sm:text-5xl">
        Cyber Resilience Intelligence &amp; Scoring Platform
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Together, we turn customer conversations into Cyber Resilience
        Readiness scores.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        Partner login
      </Link>
    </main>
  );
}
