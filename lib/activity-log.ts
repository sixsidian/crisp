// Labels for activity_log.action - kept in sync with the values
// written by the server actions/routes that call this. Deliberately
// only ever record that a change happened and who made it, never the
// actual data entered (see migration 0003 for why).
export const ACTIVITY_LABELS: Record<string, string> = {
  customer_created: "Customer created",
  assessment_updated: "Assessment updated",
  report_generated: "Report generated",
};

export function describeActivity(action: string): string {
  return ACTIVITY_LABELS[action] ?? action;
}
