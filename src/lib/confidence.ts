import type {
  BehavioralRecord,
  ConfidenceLevel,
  ConfidenceResult,
} from "@/types/assessment";

/**
 * Calculate a confidence score based on behavioral signals.
 *
 * Starts at 100 and deducts points for suspicious patterns.
 * Conservative: a single paste or tab switch won't drop below "High."
 * Takes a pattern of multiple signals across tiers to flag "Low."
 */
export function calculateConfidence(
  records: BehavioralRecord[]
): ConfidenceResult {
  let score = 100;
  const flags: string[] = [];

  for (const r of records) {
    const tierLabel = `Tier ${r.tier_number}`;

    // Paste events: -5 per paste, -10 extra for large pastes (>200 chars)
    if (r.paste_count > 0) {
      const pasteDeduction = r.paste_count * 5;
      score -= pasteDeduction;
      flags.push(
        `${tierLabel}: ${r.paste_count} paste event${r.paste_count > 1 ? "s" : ""} detected`
      );
    }
    if (r.largest_paste_length > 200) {
      score -= 10;
      flags.push(
        `${tierLabel}: Large paste detected (${r.largest_paste_length} chars)`
      );
    }

    // Tab switches: -3 each if >3 per tier (cap -20 per tier)
    if (r.focus_loss_count > 3) {
      const switchDeduction = Math.min((r.focus_loss_count - 3) * 3, 20);
      score -= switchDeduction;
      flags.push(
        `${tierLabel}: Left the tab ${r.focus_loss_count} times`
      );
    }

    // Time away: -10 if >60s away from tab in a tier
    if (r.total_blur_duration_ms > 60_000) {
      score -= 10;
      const secsAway = Math.round(r.total_blur_duration_ms / 1000);
      flags.push(
        `${tierLabel}: Spent ${secsAway}s away from the assessment tab`
      );
    }

    // Fast completion: -15 if <60s, -5 if <120s
    const timeOnTierSec = r.time_on_tier_ms / 1000;
    if (timeOnTierSec < 60) {
      score -= 15;
      flags.push(
        `${tierLabel}: Completed in ${Math.round(timeOnTierSec)}s (very fast)`
      );
    } else if (timeOnTierSec < 120) {
      score -= 5;
      flags.push(
        `${tierLabel}: Completed in ${Math.round(timeOnTierSec)}s (fast)`
      );
    }

    // Typing bursts: -5 each
    if (r.burst_count > 0) {
      score -= r.burst_count * 5;
      flags.push(
        `${tierLabel}: ${r.burst_count} rapid text burst${r.burst_count > 1 ? "s" : ""} (paste-like typing)`
      );
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  let level: ConfidenceLevel;
  if (score >= 80) {
    level = "high";
  } else if (score >= 50) {
    level = "medium";
  } else {
    level = "low";
  }

  return { score, level, flags };
}
