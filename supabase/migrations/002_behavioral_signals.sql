-- Behavioral signal tracking for anti-cheating confidence scoring.
-- Separate table from tier_scores to keep scoring schema clean.
-- Can be dropped without affecting core assessment functionality.

create table behavioral_signals (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  tier_number int not null,
  paste_count int default 0,
  largest_paste_length int default 0,
  focus_loss_count int default 0,
  total_blur_duration_ms int default 0,
  time_on_tier_ms int default 0,
  burst_count int default 0,
  answer_char_counts int[] default '{}',
  answer_word_counts int[] default '{}',
  recorded_at timestamptz default now()
);

create index idx_behavioral_signals_assessment on behavioral_signals(assessment_id);

-- Row-level security matching existing tier_scores pattern
alter table behavioral_signals enable row level security;

create policy "HR users can view all behavioral signals"
  on behavioral_signals for select
  to authenticated
  using (true);

create policy "HR users can insert behavioral signals"
  on behavioral_signals for insert
  to authenticated
  with check (true);
