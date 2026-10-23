-- =====================================================================
-- Synthetic demo data (40 invented Calgary-area organizations).
-- Run AFTER 001_schema.sql and 01_reference_data.sql.
-- Everything here is made up. Names are random combinations and any match
-- with a real business is a coincidence. No real people, no confidential data.
--
-- OPTIONAL: put the email of your test account below. The first 3 demo
-- organizations will then belong to that account, so its "My assessments"
-- screen is not empty.
-- =====================================================================
do $$
declare
  test_email   text := 'reviewer@example.com';   -- <-- change me
  test_uid     uuid;
  prefixes     text[] := array['Prairie','Foothills','Bow River','Northgate','Summit','Maple Leaf','Redwood','Blackfoot','Harvest','Chinook','Glacier','Tamarack','Kensington','Beacon','Ironwood','Cascade','Sundial','Alder','Cedar Ridge','Pinecrest'];
  v_org        uuid;  v_asm uuid;  v_rec uuid;
  v_name       text;  v_status text; v_when timestamptz;
  keys         text[];
  q            record; o record; d record; pk record; ad record;
  n int;  v_industry_label text; v_industry_key text; v_range text;
  v_ai text; v_conf text; v_start text; v_dept_names text[]; v_pkg uuid; v_pay text;
  suffix text;
begin
  perform setseed(0.42);            -- same random numbers every run
  select id into test_uid from auth.users where email = test_email limit 1;

  for i in 1..40 loop
    keys := array[]::text[];
    v_dept_names := array[]::text[];

    -- pick industry first so the name fits
    select option_key, label into v_industry_key, v_industry_label
      from question_options where question_id = (select id from questions where question_key='industry') and not is_other
      order by random() limit 1;
    suffix := case v_industry_key
      when 'retail' then 'Outfitters' when 'healthcare' then 'Health Clinic' when 'construction' then 'Builders'
      when 'nonprofit' then 'Community Society' when 'education' then 'Learning Centre' when 'real_estate' then 'Realty'
      when 'hospitality' then 'Hospitality Group' when 'professional_services' then 'Consulting'
      when 'finance_insurance' then 'Insurance Brokers' when 'manufacturing' then 'Fabrication'
      when 'energy' then 'Energy Services' when 'tech' then 'Software' when 'transportation' then 'Logistics'
      when 'agriculture' then 'Farms' else 'Municipal Services' end;
    v_name := prefixes[1 + floor(random()*array_length(prefixes,1))::int] || ' ' || suffix;

    select label into v_range from question_options
      where question_id = (select id from questions where question_key='employee_range') order by random() limit 1;

    v_status := case when i % 20 = 0 then 'draft' when i % 3 = 0 then 'approved' else 'submitted' end;
    v_when := now() - (random()*60 || ' days')::interval - (random()*20 || ' hours')::interval;

    insert into organizations (owner_user_id, name, industry, employee_range, is_demo, created_at)
      values (case when i <= 3 then test_uid else null end, v_name, v_industry_label, v_range, true, v_when - interval '1 day')
      returning id into v_org;
    insert into assessments (organization_id, status, submitted_at, created_at)
      values (v_org, v_status, case when v_status = 'draft' then null else v_when end, v_when - interval '1 hour')
      returning id into v_asm;

    -- industry + size answers
    insert into assessment_answers (assessment_id, question_id, option_id)
      select v_asm, question_id, id from question_options
      where (question_id = (select id from questions where question_key='industry') and option_key = v_industry_key)
         or (question_id = (select id from questions where question_key='employee_range') and label = v_range);

    -- departments (1 to 4)
    for d in select id, slug, name from departments where not is_other order by random() limit (1 + floor(random()*4))::int loop
      insert into assessment_departments (assessment_id, department_id) values (v_asm, d.id);
      keys := keys || ('departments:' || d.slug);
      v_dept_names := v_dept_names || d.name;
    end loop;

    -- general questions
    for q in select * from questions where section in ('ai_use','work') order by display_order loop
      n := case when q.input_type = 'single' then 1 else 1 + floor(random()*least(coalesce(q.max_selections,3),3))::int end;
      for o in select * from question_options where question_id = q.id and not is_other order by random() limit n loop
        insert into assessment_answers (assessment_id, question_id, option_id) values (v_asm, q.id, o.id);
        keys := keys || (q.question_key || ':' || o.option_key);
        if q.question_key = 'current_ai_use' then v_ai := o.option_key; end if;
        if q.question_key = 'confidence'     then v_conf := o.option_key; end if;
        if q.question_key = 'desired_start'  then v_start := o.option_key; end if;
      end loop;
    end loop;

    -- follow-ups only when their condition matches
    for q in select * from questions where section = 'followup' order by display_order loop
      if q.condition_json->'any_of' ?| keys then
        for o in select * from question_options where question_id = q.id and not is_other order by random() limit 1 + floor(random()*2)::int loop
          insert into assessment_answers (assessment_id, question_id, option_id) values (v_asm, q.id, o.id);
          keys := keys || (q.question_key || ':' || o.option_key);
        end loop;
      end if;
    end loop;

    update assessments set current_ai_use = v_ai, confidence_level = v_conf, desired_start = v_start where id = v_asm;

    -- recommendation, items and suggested add-ons
    insert into recommendations (assessment_id, client_summary, status, approved_at, created_at)
      values (v_asm,
        v_name || ' would get the most from training built around ' || array_to_string(v_dept_names, ', ') || '. Your answers point to repeat weekly tasks where AI can save time.',
        case when v_status = 'approved' then 'approved' else 'draft' end,
        case when v_status = 'approved' then v_when + interval '1 day' end, v_when)
      returning id into v_rec;

    insert into recommendation_items (recommendation_id, title, rationale, priority, sequence_order)
      select v_rec, 'AI for ' || dn, 'You picked ' || dn || ', so training should use real ' || dn || ' tasks instead of generic examples.',
             case when ord <= 2 then 'high' else 'medium' end, ord
      from unnest(v_dept_names) with ordinality as t(dn, ord);

    for ad in select id, name from addons order by random() limit 2 + floor(random()*3)::int loop
      insert into recommendation_addons (recommendation_id, addon_id, rationale, approved_by_consultant)
        values (v_rec, ad.id, 'Suggested because of your answers about ' || lower(coalesce(v_industry_label,'your work')) || ' and your weekly tasks.', v_status = 'approved');
    end loop;

    -- client's package + add-on choices + payment preference (not for drafts)
    if v_status <> 'draft' then
      select id into v_pkg from packages
        order by case slug when 'bronze' then random()*0.9 when 'silver' then random()*1.4 when 'gold' then random()*1.1 else random()*0.5 end desc limit 1;
      v_pay := (array['invoice','card_on_consultation','pay_later','not_sure'])[1 + floor(random()*4)::int];
      insert into assessment_package_choices (assessment_id, package_id, payment_preference, chosen_at) values (v_asm, v_pkg, v_pay, v_when);
      insert into assessment_addons (assessment_id, addon_id)
        select v_asm, addon_id from recommendation_addons where recommendation_id = v_rec order by random() limit floor(random()*3)::int;
      if v_status = 'approved' then
        insert into consultant_notes (assessment_id, body, created_at)
          values (v_asm, (array[
            'Called the owner. Team is keen but nervous about privacy. Lead with the AI policy add-on.',
            'Chosen tier fits. Suggest starting with the busiest department first.',
            'Size is on the small side for this tier. Confirmed they still want it.',
            'Strong fit. Offer a 90-day check-in once training is done.'])[1 + floor(random()*4)::int], v_when + interval '1 day');
      end if;
    end if;
  end loop;
end $$;

-- Row counts for your synthetic-data note
select 'organizations' as table_name, count(*) from organizations union all
select 'assessments', count(*) from assessments union all
select 'assessment_answers', count(*) from assessment_answers union all
select 'assessment_departments', count(*) from assessment_departments union all
select 'recommendations', count(*) from recommendations union all
select 'recommendation_items', count(*) from recommendation_items union all
select 'recommendation_addons', count(*) from recommendation_addons union all
select 'assessment_package_choices', count(*) from assessment_package_choices union all
select 'assessment_addons', count(*) from assessment_addons union all
select 'consultant_notes', count(*) from consultant_notes union all
select 'questions', count(*) from questions union all
select 'question_options', count(*) from question_options union all
select 'packages', count(*) from packages union all
select 'addons', count(*) from addons union all
select 'departments', count(*) from departments;
