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
      className="field w-auto py-1.5 text-sm"
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
