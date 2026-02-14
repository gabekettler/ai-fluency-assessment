import Anthropic from "@anthropic-ai/sdk";
import { TIERS, type Tier } from "./rubric";
import type { ScoreResult } from "@/types/assessment";

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Score a single tier's answers using Claude.
 * Returns per-question scores (0-4), rationales, and whether to continue.
 */
export async function scoreTier(
  tier: Tier,
  answers: [string, string, string],
  candidateName: string,
  position: string
): Promise<ScoreResult> {
  const questionsBlock = tier.questions
    .map(
      (q, i) =>
        `Question ${i + 1}: "${q.text}"\nCandidate's answer: "${answers[i]}"\nStrong signals: ${q.strongSignals}\nRed flags: ${q.redFlags}`
    )
    .join("\n\n");

  const prompt = `You are scoring an AI fluency assessment for a white-collar candidate at Frontier Door & Cabinet, a construction manufacturing company.

Candidate: ${candidateName}
Position: ${position}
Current Tier: ${tier.number} — ${tier.name}
Tier Description: ${tier.description}

SCORING SCALE (0-4):
0 = Off-topic or no answer — candidate did not address the question
1 = Red flags present — answer shows misconceptions or concerning gaps
2 = Partial understanding — some awareness but lacks specificity or depth
3 = Solid competency — demonstrates clear understanding with concrete examples
4 = Excellent — exceeds expectations with nuanced, specific, experience-based answers

CALIBRATION NOTES:
- Tier 1 should be genuinely easy for anyone with basic AI experience. Do not over-penalize.
- Score based on the SUBSTANCE of the answer, not its length or polish.
- A short, specific answer can score higher than a long, vague one.
- Look for the strong signals and red flags listed for each question.

QUESTIONS AND ANSWERS TO SCORE:

${questionsBlock}

Respond with ONLY valid JSON. Use single-line strings (no newlines in values). Format:
{"scores":[{"question_number":1,"score":3,"rationale":"Brief explanation of score"},{"question_number":2,"score":2,"rationale":"Brief explanation of score"},{"question_number":3,"score":3,"rationale":"Brief explanation of score"}],"tier_average":2.67}`;

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse scoring response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const tierAverage =
    parsed.tier_average ??
    parsed.scores.reduce(
      (sum: number, s: { score: number }) => sum + s.score,
      0
    ) / parsed.scores.length;

  return {
    tier_number: tier.number,
    scores: parsed.scores,
    tier_average: Math.round(tierAverage * 100) / 100,
    continue_to_next: tierAverage >= 2.5 && tier.number < 5,
  };
}

/**
 * Generate the final summary report after all tiers are scored.
 */
export async function generateSummary(
  candidateName: string,
  position: string,
  tierResults: Array<{
    tier_number: number;
    tier_name: string;
    scores: Array<{
      question: string;
      score: number;
      rationale: string;
    }>;
    tier_average: number;
  }>,
  ceilingTier: number
): Promise<{
  overall_summary: string;
  strengths: string[];
  growth_areas: string[];
  role_fit: string;
  ceiling_label: string;
}> {
  const tierSummaries = tierResults
    .map(
      (t) =>
        `Tier ${t.tier_number} (${t.tier_name}): Average ${t.tier_average}/4\n${t.scores.map((s) => `  Q: ${s.question} — Score: ${s.score}/4 — ${s.rationale}`).join("\n")}`
    )
    .join("\n\n");

  const tierLabels: Record<number, string> = {
    1: "Basic Awareness",
    2: "Active User",
    3: "Proficient Practitioner",
    4: "Advanced / Builder",
    5: "Expert / Architect",
  };

  const prompt = `You are generating a summary report for an AI fluency assessment at Frontier Door & Cabinet, a construction manufacturing company.

Candidate: ${candidateName}
Position: ${position}
Ceiling Tier: ${ceilingTier} — ${tierLabels[ceilingTier]}

TIER SCORES:
${tierSummaries}

Generate a concise hiring report. Respond with ONLY valid JSON. Use single-line strings (no newlines in string values, use <br> for line breaks if needed). Format:
{
  "overall_summary": "2-3 sentence executive summary of the candidate's AI fluency level and what it means for the role",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "growth_areas": ["area 1", "area 2"],
  "role_fit": "1-2 sentences comparing the candidate's ceiling tier to typical expectations for their role category. State whether this is above, at, or below expectations."
}`;

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse summary response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    ...parsed,
    ceiling_label: tierLabels[ceilingTier],
  };
}
