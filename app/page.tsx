import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Channel portal</h1>
      <p className="text-sm text-gray-500">
        Cyber Resilience Readiness assessments for Commvault partners.
      </p>
      <Link href="/login" className="rounded bg-black px-4 py-2 text-white">
        Partner login
      </Link>
    </main>
  );
}
