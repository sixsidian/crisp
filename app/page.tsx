import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <span className="chip">Commvault partner tool</span>
      <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Cyber Resilience Intelligence &amp; Scoring Platform
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Turn a customer conversation into a scored Cyber Resilience Readiness report.
      </p>
      <Link href="/login" className="btn btn-primary mt-8">
        Partner login
      </Link>
    </main>
  );
}
