"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TIERS } from "@/lib/rubric";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Assessment, TierBehavioralSignals } from "@/types/assessment";

type Phase = "loading" | "welcome" | "questions" | "scoring" | "complete";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentTier, setCurrentTier] = useState(1);
  const [answers, setAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedTier, setElapsedTier] = useState(currentTier);
  if (elapsedTier !== currentTier) {
    setElapsedTier(currentTier);
    setElapsedSeconds(0);
  }

  // --- Behavioral signal tracking (invisible, no re-renders) ---
  const pasteCountsRef = useRef<[number, number, number]>([0, 0, 0]);
  const largestPasteLenRef = useRef(0);
  const focusLossCountRef = useRef(0);
  const blurStartRef = useRef<number | null>(null);
  const totalBlurDurationRef = useRef(0);
  const tierStartTimeRef = useRef(Date.now());
  const burstCountRef = useRef(0);
  const lastAnswerLengthsRef = useRef<[number, number, number]>([0, 0, 0]);
  const lastInputTimeRef = useRef<[number, number, number]>([0, 0, 0]);

  // Suggested time per tier (minutes) — informational only
  const suggestedMinutes: Record<number, number> = { 1: 5, 2: 8, 3: 10, 4: 12, 5: 15 };

  // Reset tracking when tier changes
  useEffect(() => {
    pasteCountsRef.current = [0, 0, 0];
    largestPasteLenRef.current = 0;
    focusLossCountRef.current = 0;
    blurStartRef.current = null;
    totalBlurDurationRef.current = 0;
    tierStartTimeRef.current = Date.now();
    burstCountRef.current = 0;
    lastAnswerLengthsRef.current = [0, 0, 0];
    lastInputTimeRef.current = [0, 0, 0];
  }, [currentTier]);

  // Visible timer — ticks every second during questions phase
  useEffect(() => {
    if (phase !== "questions") return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Tab focus/blur tracking via visibilitychange
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        // Tab lost focus
        blurStartRef.current = Date.now();
        focusLossCountRef.current += 1;
      } else {
        // Tab regained focus
        if (blurStartRef.current !== null) {
          totalBlurDurationRef.current += Date.now() - blurStartRef.current;
          blurStartRef.current = null;
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  /** Build the behavioral signals object for the current tier */
  function buildBehavioralSignals(): TierBehavioralSignals {
    const now = Date.now();
    // If still blurred at submit time, close out the duration
    if (blurStartRef.current !== null) {
      totalBlurDurationRef.current += now - blurStartRef.current;
      blurStartRef.current = null;
    }
    return {
      tier_number: currentTier,
      paste_count:
        pasteCountsRef.current[0] +
        pasteCountsRef.current[1] +
        pasteCountsRef.current[2],
      largest_paste_length: largestPasteLenRef.current,
      focus_loss_count: focusLossCountRef.current,
      total_blur_duration_ms: totalBlurDurationRef.current,
      tier_start_time: tierStartTimeRef.current,
      tier_submit_time: now,
      burst_count: burstCountRef.current,
      answer_char_counts: [
        answers[0].length,
        answers[1].length,
        answers[2].length,
      ],
      answer_word_counts: [
        answers[0].trim().split(/\s+/).filter(Boolean).length,
        answers[1].trim().split(/\s+/).filter(Boolean).length,
        answers[2].trim().split(/\s+/).filter(Boolean).length,
      ],
    };
  }

  // Load assessment data on mount
  useEffect(() => {
    async function loadAssessment() {
      const res = await fetch(`/api/get-assessment?id=${id}`);
      if (!res.ok) {
        setError("Assessment not found. Please check your link.");
        setPhase("complete");
        return;
      }

      const { assessment: data } = await res.json();
      const a = data as Assessment;

      if (a.status === "scored") {
        // Already completed
        router.replace("/complete");
        return;
      }

      setAssessment(a);

      // If they were mid-assessment, resume at the next tier
      if (a.status === "in_progress" && a.highest_tier_attempted > 0) {
        setCurrentTier(a.highest_tier_attempted + 1);
        if (a.highest_tier_attempted >= 5) {
          // All tiers done, go to submission
          await submitAssessment(a.id);
          return;
        }
      }

      setPhase("welcome");
    }

    loadAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitAssessment(assessmentId: string) {
    setPhase("scoring");
    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
    } catch (err) {
      console.error("Submit error:", err);
    }
    router.replace("/complete");
  }

  async function handleTierSubmit() {
    // Validate all answers have content
    if (answers.some((a) => a.trim().length === 0)) {
      setError("Please answer all three questions before continuing.");
      return;
    }

    setError("");
    setPhase("scoring");

    try {
      const behavioral_signals = buildBehavioralSignals();
      const res = await fetch("/api/score-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: id,
          tier_number: currentTier,
          answers,
          behavioral_signals,
        }),
      });

      if (!res.ok) {
        throw new Error("Scoring failed");
      }

      const result = await res.json();

      if (result.continue_to_next) {
        // Advance to next tier
        setCurrentTier(currentTier + 1);
        setAnswers(["", "", ""]);
        setPhase("questions");
      } else {
        // Assessment is done — either failed to advance or completed tier 5
        await submitAssessment(id);
      }
    } catch (err) {
      console.error("Score error:", err);
      setError("Something went wrong. Please try again.");
      setPhase("questions");
    }
  }

  // Loading state
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  // Error state (invalid link)
  if (phase === "complete" && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Welcome screen
  if (phase === "welcome" && assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="text-xs text-muted-foreground mb-2">
              Frontier Door &amp; Cabinet
            </div>
            <CardTitle className="text-xl">AI Skills Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Hi <strong>{assessment.candidate_name}</strong>, this assessment
              helps us understand your comfort level with AI tools as part of
              the interview process for the{" "}
              <strong>{assessment.position}</strong> role.
            </p>
            <p className="text-sm text-muted-foreground">
              There are no wrong answers. The assessment has multiple levels and
              adapts to your experience. Just answer honestly based on what
              you&apos;ve actually done with AI.
            </p>
            <p className="text-sm text-muted-foreground">
              This typically takes 10-30 minutes.
            </p>
            <p className="text-sm text-muted-foreground border-l-2 border-muted-foreground/30 pl-3">
              This assessment monitors behavioral activity such as copy-paste
              usage, tab switching, and response timing to help ensure the
              integrity of your results.
            </p>
            <Button
              className="w-full mt-4"
              onClick={() => setPhase("questions")}
            >
              Begin Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scoring/loading state
  if (phase === "scoring") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">
            Evaluating your responses...
          </p>
          <p className="text-xs text-muted-foreground">
            This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  // Questions phase
  if (phase === "questions") {
    const tier = TIERS.find((t) => t.number === currentTier);
    if (!tier) {
      return null;
    }

    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Frontier Door &amp; Cabinet
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground tabular-nums">
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
                <span className="text-muted-foreground/50">
                  {" "}/ ~{suggestedMinutes[currentTier]} min
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Level {currentTier} of 5
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentTier - 1) / 5) * 100}%` }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {tier.name}
              </CardTitle>
              <CardDescription>{tier.context}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tier.questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <label className="text-sm font-medium leading-relaxed block">
                    {qi + 1}. {q.text}
                  </label>
                  <Textarea
                    placeholder="Type your answer here..."
                    rows={4}
                    value={answers[qi]}
                    onPaste={() => {
                      pasteCountsRef.current[qi] += 1;
                    }}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      const oldLen = lastAnswerLengthsRef.current[qi];
                      const diff = newVal.length - oldLen;
                      const now = Date.now();
                      const elapsed = now - lastInputTimeRef.current[qi];

                      // Detect typing burst: >50 chars in <500ms
                      if (diff > 50 && elapsed < 500) {
                        burstCountRef.current += 1;
                      }

                      // Track largest paste via size delta
                      if (diff > 0 && diff > largestPasteLenRef.current) {
                        // Only update if this looks like a paste (>50 chars at once)
                        if (diff > 50) {
                          largestPasteLenRef.current = diff;
                        }
                      }

                      lastAnswerLengthsRef.current[qi] = newVal.length;
                      lastInputTimeRef.current[qi] = now;

                      const newAnswers = [...answers] as [string, string, string];
                      newAnswers[qi] = newVal;
                      setAnswers(newAnswers);
                    }}
                  />
                </div>
              ))}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                onClick={handleTierSubmit}
                disabled={answers.some((a) => a.trim().length === 0)}
              >
                Submit Answers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
