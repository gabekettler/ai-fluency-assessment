"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function NewAssessmentPage() {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [position, setPosition] = useState("");
  const [hiringManagerEmail, setHiringManagerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/create-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          position,
          hiring_manager_email: hiringManagerEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assessment");
      }

      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">AI Fluency Assessment</h1>
            <p className="text-xs text-muted-foreground">
              Frontier Door &amp; Cabinet
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>New Assessment</CardTitle>
            <CardDescription>
              Create a new AI fluency assessment. The candidate will receive an
              email invitation with their unique assessment link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name</Label>
                <Input
                  id="candidateName"
                  placeholder="Jane Smith"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateEmail">Candidate Email</Label>
                <Input
                  id="candidateEmail"
                  type="email"
                  placeholder="jane.smith@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Project Manager"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hiringManagerEmail">
                  Hiring Manager Email{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="hiringManagerEmail"
                  type="email"
                  placeholder="manager@frontierdoor.com"
                  value={hiringManagerEmail}
                  onChange={(e) => setHiringManagerEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The scored report will be emailed here. Defaults to your email
                  if blank.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create & Send"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
