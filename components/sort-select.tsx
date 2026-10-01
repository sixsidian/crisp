"use client";

import { useRouter } from "next/navigation";

export function SortSelect({
  current,
  options,
  basePath,
}: {
  current: string;
  options: { value: string; label: string }[];
  basePath: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Sort by
      <select
        value={current}
        onChange={(e) => router.push(`${basePath}?sort=${e.target.value}`)}
        className="field w-auto py-1.5"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
