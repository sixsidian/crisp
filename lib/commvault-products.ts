// Verified Commvault cyber recovery product/capability names, sourced
// directly from https://www.commvault.com/solutions/cyber-recovery on
// 2026-09-29. This exists so the AI report generator can only ever
// recommend real, currently-marketed Commvault products by name,
// instead of inventing plausible-sounding ones.
//
// Commvault's product portfolio and naming change over time - this
// list needs periodic re-verification against commvault.com, not
// assumed to still be accurate indefinitely.
export const COMMVAULT_PRODUCTS = [
  {
    name: "Commvault Cloud",
    description: "The overall Commvault cyber resilience platform.",
  },
  {
    name: "Cleanpoint Identification",
    description:
      "Identifies a verified-clean recovery point (a backup scanned for threats where none were found) rather than assuming the most recent backup is safe to restore.",
  },
  {
    name: "Synthetic Recovery",
    description:
      "Assembles a composite recovery point from the most recent clean version of each file across backups, rather than rolling back everything to one older last-known-good point - optimizing for both recency and cleanliness.",
  },
  {
    name: "Cleanroom Recovery",
    description: "An isolated recovery environment for testing and staging a recovery before reconnecting to production.",
  },
  {
    name: "Threat Scan",
    description: "Scans protected data and virtual machines for threats.",
  },
  {
    name: "Threat Hunting & Response",
    description: "Threat detection and response capabilities across the protected estate.",
  },
  {
    name: "AirGap",
    description: "Creates off-site, air-gapped, immutable backup copies.",
  },
  {
    name: "Identity Resilience",
    description: "Supports identity system recovery and rollback (e.g. Active Directory/Entra ID) after an incident.",
  },
] as const;
