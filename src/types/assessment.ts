export interface Assessment {
  id: string;
  candidate_name: string;
  candidate_email: string;
  position: string;
  hiring_manager_email: string | null;
  created_by: string | null;
  status: "pending" | "in_progress" | "scored";
  highest_tier_attempted: number;
  ceiling_tier: number | null;
  ceiling_label: string | null;
  overall_summary: string | null;
  strengths: string[] | null;
  growth_areas: string[] | null;
  role_fit: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  rubric_version: string;
}

export interface TierScore {
  id: string;
  assessment_id: string;
  tier_number: number;
  q1_answer: string | null;
  q1_score: number | null;
  q1_rationale: string | null;
  q2_answer: string | null;
  q2_score: number | null;
  q2_rationale: string | null;
  q3_answer: string | null;
  q3_score: number | null;
  q3_rationale: string | null;
  tier_average: number | null;
  scored_at: string;
}

export interface TierSubmission {
  assessment_id: string;
  tier_number: number;
  answers: [string, string, string];
  behavioral_signals?: TierBehavioralSignals;
}

export interface ScoreResult {
  tier_number: number;
  scores: Array<{
    question_number: number;
    score: number;
    rationale: string;
  }>;
  tier_average: number;
  continue_to_next: boolean;
}

export interface AssessmentReport {
  assessment: Assessment;
  tier_scores: TierScore[];
}

// --- Behavioral Signal Tracking ---

/** Client-side behavioral data collected per tier */
export interface TierBehavioralSignals {
  tier_number: number;
  paste_count: number;
  largest_paste_length: number;
  focus_loss_count: number;
  total_blur_duration_ms: number;
  tier_start_time: number; // epoch ms
  tier_submit_time: number; // epoch ms
  burst_count: number;
  answer_char_counts: [number, number, number];
  answer_word_counts: [number, number, number];
}

/** Database row shape for behavioral_signals table */
export interface BehavioralRecord {
  id: string;
  assessment_id: string;
  tier_number: number;
  paste_count: number;
  largest_paste_length: number;
  focus_loss_count: number;
  total_blur_duration_ms: number;
  time_on_tier_ms: number;
  burst_count: number;
  answer_char_counts: number[];
  answer_word_counts: number[];
  recorded_at: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceResult {
  score: number; // 0-100
  level: ConfidenceLevel;
  flags: string[]; // human-readable concerns
}
