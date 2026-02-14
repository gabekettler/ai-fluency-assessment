"use client";

import { useEffect, useState } from "react";
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
import type { Assessment } from "@/types/assessment";

type Phase = "loading" | "welcome" | "questions" | "scoring" | "complete";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentTier, setCurrentTier] = useState(1);
  const [answers, setAnswers] = useState<[string, string, string]>(["", "", ""]);
  const [error, setError] = useState("");

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
      const res = await fetch("/api/score-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: id,
          tier_number: currentTier,
          answers,
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
            <div className="text-xs text-muted-foreground">
              Level {currentTier} of 5
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
                    onChange={(e) => {
                      const newAnswers = [...answers] as [string, string, string];
                      newAnswers[qi] = e.target.value;
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
