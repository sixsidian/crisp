export type ScoreBand = "low" | "medium" | "high";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
