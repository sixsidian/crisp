const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  processing: "Processing",
  complete: "Complete",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}
