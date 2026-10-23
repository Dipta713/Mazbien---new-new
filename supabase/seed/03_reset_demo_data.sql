-- Wipes ONLY the synthetic rows (organizations flagged is_demo). Real client data is untouched.
-- Child rows (assessments, answers, recommendations, choices, notes) are removed by ON DELETE CASCADE.
-- To reload: run this file, then run 02_demo_data.sql again.
delete from public.organizations where is_demo = true;
