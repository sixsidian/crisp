import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

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
          name: { type: "string" },
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

  // TODO: this prompt needs the real assessment framework and current
  // Commvault product/positioning info supplied by Stu - do not ship
  // with only this placeholder text.
  const model = "claude-sonnet-5";
  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
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
