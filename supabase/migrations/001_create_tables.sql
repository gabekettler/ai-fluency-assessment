-- Assessment sessions (created by HR, completed by candidate)
create table assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  candidate_email text not null,
  position text not null,
  hiring_manager_email text,
  created_by uuid references auth.users(id),
  status text default 'pending',
  highest_tier_attempted int default 0,
  ceiling_tier int,
  ceiling_label text,
  overall_summary text,
  strengths text[],
  growth_areas text[],
  role_fit text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  rubric_version text default '1.0'
);

-- Individual tier scores
create table tier_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  tier_number int not null,
  q1_answer text,
  q1_score int,
  q1_rationale text,
  q2_answer text,
  q2_score int,
  q2_rationale text,
  q3_answer text,
  q3_score int,
  q3_rationale text,
  tier_average numeric(3,2),
  scored_at timestamptz default now()
);

-- Index for fast lookups
create index idx_tier_scores_assessment on tier_scores(assessment_id);
create index idx_assessments_status on assessments(status);
create index idx_assessments_created_by on assessments(created_by);

-- Row-level security
alter table assessments enable row level security;
alter table tier_scores enable row level security;

-- Authenticated HR users can see all assessments
create policy "HR users can view all assessments"
  on assessments for select
  to authenticated
  using (true);

create policy "HR users can insert assessments"
  on assessments for insert
  to authenticated
  with check (true);

create policy "HR users can update assessments"
  on assessments for update
  to authenticated
  using (true);

-- Tier scores follow same pattern
create policy "HR users can view all tier scores"
  on tier_scores for select
  to authenticated
  using (true);

create policy "HR users can insert tier scores"
  on tier_scores for insert
  to authenticated
  with check (true);
