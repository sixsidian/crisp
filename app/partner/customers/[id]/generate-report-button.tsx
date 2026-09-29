"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateReportButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/submissions/${submissionId}/generate-report`, {
      method: "POST",
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate report");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate report"}
      </button>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}
