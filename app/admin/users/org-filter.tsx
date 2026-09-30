"use client";

import { useRouter } from "next/navigation";

export function OrgFilter({
  organisations,
  currentOrgId,
}: {
  organisations: { id: string; name: string }[];
  currentOrgId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentOrgId}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/admin/users?org=${value}` : "/admin/users");
      }}
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
    >
      <option value="">All organisations</option>
      {organisations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
