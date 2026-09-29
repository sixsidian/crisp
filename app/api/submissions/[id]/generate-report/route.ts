import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { COMMVAULT_PRODUCTS } from "@/lib/commvault-products";
import { getMissingRequiredFields } from "@/lib/assessment-questions";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Placeholder schema - the actual assessment categories, scoring
// weights, and Commvault product list still need to be defined with
// real domain input. Nothing here should be treated as final until
// that's done. See README "Still to define" section.
const REPORT_SCHEMA = {
  type: "object",
  properties: {
    readiness_score: {
      type: "integer",
      description: "Overall Cyber Resilience Readiness score, 0-100",
    },
    summary: {
      type: "string",
      description: "Plain-language summary of the customer's current posture",
    },
    category_breakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          score: { type: "integer" },
          notes: { type: "string" },
        },
        required: ["category", "score", "notes"],
        additionalProperties: false,
      },
    },
    partner_next_steps: {
      type: "array",
      description: "Where the partner should take the conversation next",
      items: { type: "string" },
    },
    suggested_products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          // Constrained to a verified list of real, currently-marketed
          // Commvault products so the model can't invent product names.
          name: { type: "string", enum: COMMVAULT_PRODUCTS.map((p) => p.name) },
          rationale: { type: "string" },
        },
        required: ["name", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "readiness_score",
    "summary",
    "category_breakdown",
    "partner_next_steps",
    "suggested_products",
  ],
  additionalProperties: false,
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS on this select means a partner can only fetch their own
  // submission - a partner_id mismatch just comes back as "not found".
  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, data, customer_id, partner_id")
    .eq("id", submissionId)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // The assessment form allows saving a submission as an incomplete
  // draft across multiple visits, so completeness is only enforced
  // here - an AI-generated score from a mostly-empty submission isn't
  // meaningful.
  const missingFields = getMissingRequiredFields((submission.data as Record<string, unknown>) ?? {});
  if (missingFields.length > 0) {
    const plural = missingFields.length === 1 ? "question" : "questions";
    return NextResponse.json(
      {
        error: `${missingFields.length} required ${plural} still need answering. Edit the submission to finish them before generating a report.`,
      },
      { status: 400 }
    );
  }

  // TODO: the scoring weights/methodology below still need review and
  // sign-off from Stu/Commvault - treat as a reasonable starting point
  // built from published guidance (NIST SP 800-184, CISA's
  // #StopRansomware Guide), not a validated Commvault standard.
  const model = "claude-sonnet-5";
  const productCatalog = COMMVAULT_PRODUCTS.map((p) => `- ${p.name}: ${p.description}`).join("\n");
  const systemPrompt = `You are assessing a company's Cyber Resilience Readiness for a Commvault partner, based on a structured questionnaire submitted about that company. Apply these principles:

1. Disaster recovery (DR) and cyber recovery (CR) are different problems. DR covers accidental/no-malice events (fire, flood, power loss, hardware failure) where the last backup can be trusted. Cyber recovery assumes an adversary was in the environment, so the last backup cannot automatically be trusted - it must be validated as clean before use. Score and discuss these separately; do not treat "has backups" as sufficient for cyber resilience.

2. Recovery speed (RTO) is not the whole story. A fast restore of infected or corrupted data is not a recovery - it's reinfection. Whether the organization can identify a verified-clean recovery point in advance (rather than discovering it during an incident) matters as much as how fast they can restore. Weight this heavily in the cyber recovery score and call it out explicitly in category notes when it's missing.

3. Recovery Time Objective is largely a function of the storage tier data is recovered onto. Recommend tiering: minimum viable company ("crown jewel") systems on faster/higher-performance storage to minimize their RTO, non-critical systems on slower/cheaper storage to control cost. Flag it as a gap if crown-jewel systems aren't currently prioritized this way.

4. When recommending Commvault products, choose ONLY from this verified list - do not invent or guess product names:
${productCatalog}

Produce a readiness score (0-100), a plain-language summary, a category breakdown, concrete next steps for the partner conversation, and product recommendations drawn only from the list above with a rationale tying each one to a specific gap found in the submitted data.`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Assess this company's Cyber Resilience Readiness based on the following submitted information, and recommend next steps for the Commvault partner having this conversation.\n\nSubmitted data:\n${JSON.stringify(submission.data, null, 2)}`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: REPORT_SCHEMA },
    },
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No report generated" }, { status: 502 });
  }

  const report = JSON.parse(textBlock.text);

  // Service-role client: the partner is allowed to trigger report
  // generation but reports are only ever written by the server.
  const serviceClient = createServiceRoleClient();
  const { data: saved, error: saveError } = await serviceClient
    .from("reports")
    .insert({
      submission_id: submissionId,
      readiness_score: report.readiness_score,
      report,
      model,
    })
    .select()
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  await serviceClient
    .from("submissions")
    .update({ status: "complete" })
    .eq("id", submissionId);

  return NextResponse.json(saved);
}
