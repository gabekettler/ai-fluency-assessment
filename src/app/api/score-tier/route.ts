import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { scoreTier } from "@/lib/scoring";
import { TIERS, ADVANCEMENT_THRESHOLD } from "@/lib/rubric";
import type { TierSubmission } from "@/types/assessment";

export async function POST(request: NextRequest) {
  try {
    const body: TierSubmission = await request.json();
    const { assessment_id, tier_number, answers } = body;

    if (!assessment_id || !tier_number || !answers || answers.length !== 3) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Fetch the assessment to get candidate info
    const { data: assessment, error: fetchError } = await serviceClient
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (fetchError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Mark as in_progress if this is the first tier
    if (assessment.status === "pending") {
      await serviceClient
        .from("assessments")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", assessment_id);
    }

    // Find the tier data
    const tier = TIERS.find((t) => t.number === tier_number);
    if (!tier) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Score with Claude (retry once on JSON parse failure)
    let result;
    try {
      result = await scoreTier(
        tier,
        answers,
        assessment.candidate_name,
        assessment.position
      );
    } catch (firstError) {
      console.error("First scoring attempt failed, retrying:", firstError);
      result = await scoreTier(
        tier,
        answers,
        assessment.candidate_name,
        assessment.position
      );
    }

    // Save tier scores to database
    const { error: insertError } = await serviceClient
      .from("tier_scores")
      .insert({
        assessment_id,
        tier_number,
        q1_answer: answers[0],
        q1_score: result.scores[0].score,
        q1_rationale: result.scores[0].rationale,
        q2_answer: answers[1],
        q2_score: result.scores[1].score,
        q2_rationale: result.scores[1].rationale,
        q3_answer: answers[2],
        q3_score: result.scores[2].score,
        q3_rationale: result.scores[2].rationale,
        tier_average: result.tier_average,
      });

    if (insertError) {
      console.error("Tier score insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save scores" },
        { status: 500 }
      );
    }

    // Store behavioral signals (fire-and-forget — never block scoring)
    if (body.behavioral_signals) {
      const bs = body.behavioral_signals;
      serviceClient
        .from("behavioral_signals")
        .insert({
          assessment_id,
          tier_number,
          paste_count: bs.paste_count,
          largest_paste_length: bs.largest_paste_length,
          focus_loss_count: bs.focus_loss_count,
          total_blur_duration_ms: bs.total_blur_duration_ms,
          time_on_tier_ms: bs.tier_submit_time - bs.tier_start_time,
          burst_count: bs.burst_count,
          answer_char_counts: bs.answer_char_counts,
          answer_word_counts: bs.answer_word_counts,
        })
        .then(({ error: bsError }) => {
          if (bsError) {
            console.error("Behavioral signals insert error (non-fatal):", bsError);
          }
        });
    }

    // Update highest tier attempted
    await serviceClient
      .from("assessments")
      .update({ highest_tier_attempted: tier_number })
      .eq("id", assessment_id);

    // Determine if we should continue
    const continueToNext =
      result.tier_average >= ADVANCEMENT_THRESHOLD && tier_number < 5;

    return NextResponse.json({
      tier_number,
      tier_average: result.tier_average,
      continue_to_next: continueToNext,
    });
  } catch (err) {
    console.error("Score tier error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
