import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendCandidateInvitation } from "@/lib/email";
import type { Assessment } from "@/types/assessment";

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated (HR admin)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { candidate_name, candidate_email, position, hiring_manager_email } =
      body;

    if (!candidate_name || !candidate_email || !position) {
      return NextResponse.json(
        { error: "Missing required fields: candidate_name, candidate_email, position" },
        { status: 400 }
      );
    }

    // Use service client to insert (bypasses RLS for clean insert)
    const serviceClient = createServiceClient();

    const { data: assessment, error } = await serviceClient
      .from("assessments")
      .insert({
        candidate_name,
        candidate_email,
        position,
        hiring_manager_email:
          hiring_manager_email ||
          process.env.DEFAULT_HIRING_MANAGER_EMAIL ||
          null,
        created_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create assessment" },
        { status: 500 }
      );
    }

    // Build the assessment URL
    const origin =
      request.headers.get("origin") ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const assessmentUrl = `${origin}/assess/${assessment.id}`;

    // Send invitation email
    try {
      await sendCandidateInvitation(assessment as Assessment, assessmentUrl);
    } catch (emailError) {
      console.error("Email send error:", emailError);
      // Don't fail the whole request — assessment was created, email can be retried
    }

    return NextResponse.json({ assessment, assessmentUrl });
  } catch (err) {
    console.error("Create assessment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
