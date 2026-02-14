import { Resend } from "resend";
import type { Assessment, TierScore } from "@/types/assessment";
import { TIERS, TIER_LABELS } from "./rubric";

const FROM_EMAIL = "AI Assessment <onboarding@resend.dev>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Send candidate invitation email with assessment link.
 */
export async function sendCandidateInvitation(
  assessment: Assessment,
  assessmentUrl: string
) {
  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + 7);
  const deadline = deadlineDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: assessment.candidate_email,
    subject: "AI Skills Assessment — Frontier Door & Cabinet",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; margin: 0; color: #1a1a1a;">Frontier Door &amp; Cabinet</h1>
    <p style="font-size: 13px; color: #666; margin: 4px 0 0;">AI Skills Assessment</p>
  </div>

  <p>Hi ${assessment.candidate_name},</p>

  <p>As part of the interview process for the <strong>${assessment.position}</strong> role at Frontier Door &amp; Cabinet, we'd like you to complete a brief AI skills assessment.</p>

  <p>This assessment has multiple levels and adapts to your experience. There are no wrong answers — we're looking for honest responses about your comfort level with AI tools.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${assessmentUrl}" style="background-color: #1a1a1a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Assessment</a>
  </div>

  <p style="color: #666; font-size: 14px;">This typically takes 10–30 minutes. Please complete it before <strong>${deadline}</strong>.</p>

  <div style="border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 16px;">
    <p style="font-size: 13px; color: #999; margin: 0;">Frontier Door &amp; Cabinet — Human Resources</p>
  </div>
</body>
</html>`,
  });
}

/**
 * Send scored report to hiring manager.
 */
export async function sendScoredReport(
  assessment: Assessment,
  tierScores: TierScore[],
  recipientEmail: string
) {
  const sortedScores = [...tierScores].sort(
    (a, b) => a.tier_number - b.tier_number
  );

  // Color-code role fit
  const ceilingTier = assessment.ceiling_tier ?? 0;
  let fitColor = "#dc2626"; // red
  if (ceilingTier >= 3) fitColor = "#16a34a"; // green
  else if (ceilingTier >= 2) fitColor = "#ca8a04"; // yellow

  const tierScoreRows = sortedScores
    .map((ts) => {
      const tier = TIERS.find((t) => t.number === ts.tier_number);
      if (!tier) return "";

      const questions = [
        {
          q: tier.questions[0].text,
          score: ts.q1_score,
          rationale: ts.q1_rationale,
        },
        {
          q: tier.questions[1].text,
          score: ts.q2_score,
          rationale: ts.q2_rationale,
        },
        {
          q: tier.questions[2].text,
          score: ts.q3_score,
          rationale: ts.q3_rationale,
        },
      ];

      return `
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px; color: #1a1a1a;">Tier ${ts.tier_number}: ${TIER_LABELS[ts.tier_number]} — Average: ${ts.tier_average}/4</h3>
        ${questions
          .map(
            (q) => `
          <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 0 0 4px; font-weight: 600; font-size: 14px;">${q.q}</p>
            <p style="margin: 0; font-size: 14px;">Score: <strong>${q.score}/4</strong> — ${q.rationale}</p>
          </div>`
          )
          .join("")}
      </div>`;
    })
    .join("");

  const strengthsList = (assessment.strengths ?? [])
    .map((s) => `<li>${s}</li>`)
    .join("");
  const growthList = (assessment.growth_areas ?? [])
    .map((g) => `<li>${g}</li>`)
    .join("");

  const completedDate = assessment.completed_at
    ? new Date(assessment.completed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject: `AI Assessment Report: ${assessment.candidate_name} — ${assessment.position}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; margin: 0; color: #1a1a1a;">AI Fluency Assessment Report</h1>
    <p style="font-size: 13px; color: #666; margin: 4px 0 0;">Frontier Door &amp; Cabinet</p>
  </div>

  <table style="width: 100%; margin-bottom: 24px; font-size: 14px;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Candidate:</td><td>${assessment.candidate_name}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Position:</td><td>${assessment.position}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Completed:</td><td>${completedDate}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Ceiling Tier:</td><td><strong>Tier ${assessment.ceiling_tier}: ${assessment.ceiling_label}</strong></td></tr>
  </table>

  <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
    <h3 style="margin: 0 0 8px; font-size: 15px;">Summary</h3>
    <p style="margin: 0; font-size: 14px;">${assessment.overall_summary}</p>
  </div>

  <div style="background: #f0fdf4; border-left: 4px solid ${fitColor}; padding: 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
    <h3 style="margin: 0 0 8px; font-size: 15px;">Role Fit</h3>
    <p style="margin: 0; font-size: 14px;">${assessment.role_fit}</p>
  </div>

  <div style="display: flex; gap: 24px; margin-bottom: 24px;">
    <div style="flex: 1;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Strengths</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">${strengthsList}</ul>
    </div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Growth Areas</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">${growthList}</ul>
    </div>
  </div>

  <h2 style="font-size: 18px; margin: 32px 0 16px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px;">Detailed Scores</h2>
  ${tierScoreRows}

  <div style="border-top: 1px solid #e5e5e5; margin-top: 32px; padding-top: 16px;">
    <p style="font-size: 12px; color: #999; margin: 0;">This report was generated automatically by the Frontier AI Fluency Assessment system. Scores are produced by Claude AI based on structured rubrics. For questions, contact HR.</p>
  </div>
</body>
</html>`,
  });
}
