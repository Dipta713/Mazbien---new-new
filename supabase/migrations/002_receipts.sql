-- Run once in Supabase -> SQL Editor. Safe to run twice.
-- Stores the Stripe receipt link and the payment time next to the deposit status.
alter table public.assessment_package_choices add column if not exists receipt_url text;
alter table public.assessment_package_choices add column if not exists paid_at timestamptz;
