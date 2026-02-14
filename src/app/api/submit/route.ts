import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateSummary } from "@/lib/scoring";
import { sendScoredReport } from "@/lib/email";
import { TIERS, TIER_LABELS } from "@/lib/rubric";
import type { Assessment, TierScore } from "@/types/assessment";

export async function POST(request: NextRequest) {
  try {
    const { assessment_id } = await request.json();

    if (!assessment_id) {
      return NextResponse.json(
        { error: "Missing assessment_id" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Fetch assessment and all tier scores
    const { data: assessment, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    const { data: tierScores, error: scoresError } = await serviceClient
      .from("tier_scores")
      .select("*")
      .eq("assessment_id", assessment_id)
      .order("tier_number", { ascending: true });

    if (scoresError) {
      return NextResponse.json(
        { error: "Failed to fetch tier scores" },
        { status: 500 }
      );
    }

    // Determine ceiling tier (highest tier with average >= 2.5, or highest attempted if none pass)
    const passingTiers = (tierScores as TierScore[]).filter(
      (ts) => (ts.tier_average ?? 0) >= 2.5
    );
    const ceilingTier =
      passingTiers.length > 0
        ? Math.max(...passingTiers.map((t) => t.tier_number))
        : Math.max(...(tierScores as TierScore[]).map((t) => t.tier_number));

    // Build tier results for summary generation
    const tierResults = (tierScores as TierScore[]).map((ts) => {
      const tier = TIERS.find((t) => t.number === ts.tier_number)!;
      return {
        tier_number: ts.tier_number,
        tier_name: TIER_LABELS[ts.tier_number],
        scores: [
          {
            question: tier.questions[0].text,
            score: ts.q1_score ?? 0,
            rationale: ts.q1_rationale ?? "",
          },
          {
            question: tier.questions[1].text,
            score: ts.q2_score ?? 0,
            rationale: ts.q2_rationale ?? "",
          },
          {
            question: tier.questions[2].text,
            score: ts.q3_score ?? 0,
            rationale: ts.q3_rationale ?? "",
          },
        ],
        tier_average: Number(ts.tier_average ?? 0),
      };
    });

    // Generate summary with Claude
    let summary;
    try {
      summary = await generateSummary(
        assessment.candidate_name,
        assessment.position,
        tierResults,
        ceilingTier
      );
    } catch (firstError) {
      console.error("First summary attempt failed, retrying:", firstError);
      summary = await generateSummary(
        assessment.candidate_name,
        assessment.position,
        tierResults,
        ceilingTier
      );
    }

    // Update assessment with final results
    const { error: updateError } = await serviceClient
      .from("assessments")
      .update({
        status: "scored",
        ceiling_tier: ceilingTier,
        ceiling_label: summary.ceiling_label,
        overall_summary: summary.overall_summary,
        strengths: summary.strengths,
        growth_areas: summary.growth_areas,
        role_fit: summary.role_fit,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assessment_id);

    if (updateError) {
      console.error("Assessment update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update assessment" },
        { status: 500 }
      );
    }

    // Fetch the updated assessment for email
    const { data: updatedAssessment } = await serviceClient
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    // Send report email to hiring manager
    const recipientEmail =
      assessment.hiring_manager_email ||
      process.env.DEFAULT_HIRING_MANAGER_EMAIL;

    if (recipientEmail && updatedAssessment) {
      try {
        await sendScoredReport(
          updatedAssessment as Assessment,
          tierScores as TierScore[],
          recipientEmail
        );
      } catch (emailError) {
        console.error("Report email send error:", emailError);
        // Don't fail — the assessment is already scored and saved
      }
    }

    return NextResponse.json({
      status: "scored",
      ceiling_tier: ceilingTier,
      ceiling_label: summary.ceiling_label,
    });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
