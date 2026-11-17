-- Run once in Supabase -> SQL Editor. Safe to run twice.
-- Stores the AI-written summary next to the assessment it describes.
alter table public.assessments add column if not exists ai_summary text;
alter table public.assessments add column if not exists ai_summary_at timestamptz;
