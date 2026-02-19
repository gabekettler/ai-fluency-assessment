import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TIERS, TIER_LABELS } from "@/lib/rubric";
import { calculateConfidence } from "@/lib/confidence";
import type { Assessment, TierScore, BehavioralRecord, ConfidenceResult } from "@/types/assessment";

export default async function AssessmentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (!assessment) {
    notFound();
  }

  const { data: tierScores } = await supabase
    .from("tier_scores")
    .select("*")
    .eq("assessment_id", id)
    .order("tier_number", { ascending: true });

  const { data: behavioralData } = await supabase
    .from("behavioral_signals")
    .select("*")
    .eq("assessment_id", id)
    .order("tier_number", { ascending: true });

  const a = assessment as Assessment;
  const scores = (tierScores ?? []) as TierScore[];
  const signals = (behavioralData ?? []) as BehavioralRecord[];
  const confidence: ConfidenceResult | null =
    signals.length > 0 ? calculateConfidence(signals) : null;

  // Role fit color
  let fitColorClass = "text-red-600 bg-red-50 border-red-200";
  if ((a.ceiling_tier ?? 0) >= 3)
    fitColorClass = "text-green-700 bg-green-50 border-green-200";
  else if ((a.ceiling_tier ?? 0) >= 2)
    fitColorClass = "text-yellow-700 bg-yellow-50 border-yellow-200";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Assessment Report</h1>
            <p className="text-xs text-muted-foreground">
              {a.candidate_name} — {a.position}
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <InfoCard label="Candidate" value={a.candidate_name} />
          <InfoCard label="Position" value={a.position} />
          <InfoCard
            label="Status"
            value={
              a.status === "scored"
                ? "Scored"
                : a.status === "in_progress"
                  ? "In Progress"
                  : "Pending"
            }
          />
          <InfoCard
            label="Ceiling"
            value={
              a.ceiling_tier
                ? `Tier ${a.ceiling_tier}: ${a.ceiling_label}`
                : "—"
            }
          />
          {confidence ? (
            <ConfidenceBadge confidence={confidence} />
          ) : (
            <InfoCard label="Confidence" value="No data" />
          )}
        </div>

        {a.status !== "scored" && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              This assessment has not been completed yet.
            </CardContent>
          </Card>
        )}

        {a.status === "scored" && (
          <>
            {/* Summary */}
            {a.overall_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{a.overall_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Role fit */}
            {a.role_fit && (
              <div className={`rounded-lg border p-4 ${fitColorClass}`}>
                <h3 className="font-semibold text-sm mb-1">Role Fit</h3>
                <p className="text-sm">{a.role_fit}</p>
              </div>
            )}

            {/* Strengths + Growth */}
            <div className="grid md:grid-cols-2 gap-4">
              {a.strengths && a.strengths.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {a.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {a.growth_areas && a.growth_areas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Growth Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {a.growth_areas.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Detailed tier scores */}
            <h2 className="text-lg font-semibold">Detailed Scores</h2>
            {scores.map((ts) => {
              const tier = TIERS.find((t) => t.number === ts.tier_number);
              if (!tier) return null;

              const questions = [
                {
                  text: tier.questions[0].text,
                  answer: ts.q1_answer,
                  score: ts.q1_score,
                  rationale: ts.q1_rationale,
                },
                {
                  text: tier.questions[1].text,
                  answer: ts.q2_answer,
                  score: ts.q2_score,
                  rationale: ts.q2_rationale,
                },
                {
                  text: tier.questions[2].text,
                  answer: ts.q3_answer,
                  score: ts.q3_score,
                  rationale: ts.q3_rationale,
                },
              ];

              return (
                <Card key={ts.tier_number}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Tier {ts.tier_number}:{" "}
                        {TIER_LABELS[ts.tier_number]}
                      </CardTitle>
                      <Badge variant="outline">
                        Avg: {ts.tier_average}/4
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {questions.map((q, qi) => (
                      <div
                        key={qi}
                        className="bg-muted/50 rounded-lg p-4 space-y-2"
                      >
                        <p className="text-sm font-medium">{q.text}</p>
                        <p className="text-sm text-muted-foreground italic">
                          &ldquo;{q.answer}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <ScoreBadge score={q.score} />
                          <span className="text-muted-foreground">
                            {q.rationale}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {/* Behavioral Signals Section */}
            {signals.length > 0 && confidence && (
              <>
                <Separator />
                <h2 className="text-lg font-semibold">Behavioral Signals</h2>

                {/* Flags list */}
                {confidence.flags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Flags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {confidence.flags.map((flag, i) => (
                          <li
                            key={i}
                            className="text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-1.5"
                          >
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Per-tier metric cards */}
                {signals.map((s) => (
                  <Card key={s.tier_number}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Tier {s.tier_number} Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <MetricCard
                          label="Time on Tier"
                          value={formatDuration(s.time_on_tier_ms)}
                          warn={s.time_on_tier_ms < 60_000}
                        />
                        <MetricCard
                          label="Paste Events"
                          value={String(s.paste_count)}
                          warn={s.paste_count > 0}
                        />
                        <MetricCard
                          label="Tab Switches"
                          value={String(s.focus_loss_count)}
                          warn={s.focus_loss_count > 3}
                        />
                        <MetricCard
                          label="Time Away"
                          value={formatDuration(s.total_blur_duration_ms)}
                          warn={s.total_blur_duration_ms > 60_000}
                        />
                        <MetricCard
                          label="Word Counts"
                          value={(s.answer_word_counts ?? []).join(" / ")}
                          warn={false}
                        />
                        <MetricCard
                          label="Typing Bursts"
                          value={String(s.burst_count)}
                          warn={s.burst_count > 0}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  let color = "bg-red-100 text-red-700";
  if (score >= 3) color = "bg-green-100 text-green-700";
  else if (score >= 2) color = "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {score}/4
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceResult }) {
  const colorMap = {
    high: "bg-green-50 text-green-700 border-green-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-red-50 text-red-700 border-red-200",
  };
  const labelMap = { high: "High", medium: "Medium", low: "Low" };
  return (
    <div className={`rounded-lg border p-3 ${colorMap[confidence.level]}`}>
      <p className="text-xs opacity-70">Confidence</p>
      <p className="text-sm font-medium">
        {labelMap[confidence.level]} ({confidence.score}/100)
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${warn ? "bg-yellow-50 border border-yellow-200" : "bg-muted/50"}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}
