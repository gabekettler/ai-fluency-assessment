import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Assessment } from "@/types/assessment";
import LogoutButton from "@/components/logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (assessments ?? []) as Assessment[];

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
          <div className="flex items-center gap-3">
            <Link href="/admin/new">
              <Button size="sm">+ New</Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Recent Assessments
        </h2>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              No assessments yet. Create your first one.
            </p>
            <Link href="/admin/new">
              <Button>+ New Assessment</Button>
            </Link>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ceiling</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/admin/assessment/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.candidate_name}
                      </Link>
                    </TableCell>
                    <TableCell>{a.position}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      {a.ceiling_tier
                        ? `Tier ${a.ceiling_tier}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "scored":
      return (
        <Badge variant="default" className="bg-green-600">
          Scored
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">Pending</Badge>
      );
  }
}
