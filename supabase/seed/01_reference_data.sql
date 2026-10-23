-- >>> EDIT HERE: ASSESSMENT QUESTIONS + ANSWER OPTIONS + PACKAGES + ADD-ONS live in this file.
-- After changing anything, re-run this file in Supabase -> SQL Editor (it is safe to re-run).
-- =====================================================================
-- Reference data: departments, questions + options, packages, add-ons.
-- Run AFTER 001_schema.sql. Safe to re-run (it updates, never duplicates).
-- NOTE: all prices below are PLACEHOLDER prices made up for the MVP
-- (Uzoma confirmed on the call that the team may invent them).
-- =====================================================================

-- ---------- Departments ----------------------------------------------
insert into public.departments (slug, name, is_other) values
  ('finance','Finance / accounting',false),
  ('customer_service','Customer service',false),
  ('marketing_sales','Marketing / sales',false),
  ('hr','HR / people operations',false),
  ('operations','Operations / administration',false),
  ('it','IT / software',false),
  ('legal_compliance','Legal / compliance',false),
  ('supply_chain','Supply chain / purchasing',false),
  ('leadership','Leadership / management',false),
  ('field_services','Field / front-line services',false),
  ('other','Other',true)
on conflict (slug) do update set name = excluded.name, is_other = excluded.is_other;

-- ---------- Helper to seed one question with its options --------------
-- option format:  'key|Label'   or   'key|Label|other'  (other = shows a text box)
create or replace function public.seed_question(
  p_key text, p_prompt text, p_help text, p_type text, p_section text,
  p_order int, p_cond jsonb, p_max int, p_required boolean, p_opts text[]
) returns void language plpgsql as $$
declare qid uuid; i int := 0; o text; parts text[];
begin
  insert into public.questions (question_key, prompt, help_text, input_type, section, display_order, condition_json, max_selections, required)
  values (p_key, p_prompt, p_help, p_type, p_section, p_order, p_cond, p_max, p_required)
  on conflict (question_key) do update set
    prompt = excluded.prompt, help_text = excluded.help_text, input_type = excluded.input_type,
    section = excluded.section, display_order = excluded.display_order,
    condition_json = excluded.condition_json, max_selections = excluded.max_selections,
    required = excluded.required
  returning id into qid;

  foreach o in array p_opts loop
    i := i + 1;
    parts := string_to_array(o, '|');
    insert into public.question_options (question_id, option_key, label, is_other, display_order)
    values (qid, parts[1], parts[2], coalesce(parts[3], '') = 'other', i)
    on conflict (question_id, option_key) do update set
      label = excluded.label, is_other = excluded.is_other, display_order = excluded.display_order;
  end loop;
end $$;

-- ---------- Section: about --------------------------------------------
select public.seed_question('industry','What industry are you in?','Pick the closest match.','single','about',10,null,null,true, array[
  'retail|Retail / e-commerce','healthcare|Healthcare / wellness','construction|Construction / trades',
  'nonprofit|Non-profit / community','education|Education / training','real_estate|Real estate / property',
  'hospitality|Hospitality / food service','professional_services|Professional services (legal, consulting)',
  'finance_insurance|Finance / insurance','manufacturing|Manufacturing','energy|Energy / utilities',
  'tech|Technology / software','transportation|Transportation / logistics','agriculture|Agriculture / food production',
  'government|Government / public sector','other|Something else|other']);

select public.seed_question('employee_range','How many people work in your organization?',null,'single','about',20,null,null,true, array[
  'r_1_5|1 to 5','r_6_20|6 to 20','r_21_50|21 to 50','r_51_100|51 to 100','r_101_250|101 to 250','r_250_plus|More than 250']);

-- ---------- Section: ai_use -------------------------------------------
select public.seed_question('current_ai_use','Where is your team with AI today?',null,'single','ai_use',30,null,null,true, array[
  'not_using|Not using AI yet','exploring|A few people are experimenting','some_teams|Some teams use it regularly','embedded|AI is part of how we work']);

select public.seed_question('tools_used','Which tools does your team already use?','Pick all that apply.','multi','ai_use',40,null,null,true, array[
  'chatgpt|ChatGPT','copilot|Microsoft Copilot','gemini|Google Gemini','claude|Claude',
  'excel|Excel / Google Sheets','power_bi|Power BI / dashboards','crm|A CRM (HubSpot, Salesforce...)',
  'accounting|Accounting software (QuickBooks, Xero...)','workspace|Microsoft 365 / Google Workspace','other|Something else|other']);

select public.seed_question('ai_concerns','What worries you most about AI at work?','Pick up to three.','multi','ai_use',50,null,3,true, array[
  'privacy|Privacy and data security','no_policy|We have no written AI policy','accuracy|Wrong or made-up answers',
  'staff_resistance|Staff are nervous or resistant','unclear_value|Unclear return on investment','limited_time|No time to learn',
  'none|Nothing in particular','other|Something else|other']);

select public.seed_question('confidence','How confident is your team using AI right now?',null,'single','ai_use',60,null,null,true, array[
  'low|Low: most people are unsure where to start','medium|Medium: comfortable with the basics','high|High: we want advanced skills']);

-- ---------- Section: work ---------------------------------------------
select public.seed_question('repetitive_tasks','Which tasks repeat every week?','Pick up to four. These matter more than job titles.','multi','work',70,null,4,true, array[
  'emails|Writing and answering emails','reports|Building reports','spreadsheets|Cleaning up spreadsheets','data_entry|Entering data by hand',
  'research|Researching customers or markets','doc_drafting|Drafting documents and proposals','customer_questions|Answering the same customer questions',
  'scheduling|Scheduling and coordination','meeting_notes|Meeting notes and follow-ups','social_content|Social media and content','other|Something else|other']);

select public.seed_question('challenges','What slows your team down the most?','Pick up to three.','multi','work',80,null,3,true, array[
  'slow_turnaround|Work takes too long','inconsistent_quality|Quality is inconsistent','too_many_tools|Too many tools',
  'skills_gap|Skills gap on the team','manual_errors|Manual errors','no_time_to_learn|No time to learn new things','other|Something else|other']);

select public.seed_question('outcome','What result do you want in six months?','Pick up to two.','multi','work',90,null,2,true, array[
  'save_time|Save hours every week','cut_errors|Make fewer mistakes','better_service|Better customer experience','grow_revenue|Grow revenue',
  'upskill_team|Build team confidence','stay_compliant|Use AI safely and stay compliant','other|Something else|other']);

select public.seed_question('desired_start','When would you like to start?',null,'single','work',100,null,null,true, array[
  'asap|As soon as possible','1_3_months|In 1 to 3 months','3_6_months|In 3 to 6 months','exploring|Just exploring for now']);

-- ---------- Section: followup (shown only when the condition matches) --
select public.seed_question('fu_finance','Finance: which tasks matter most?','Pick up to three.','multi','followup',200,'{"any_of":["departments:finance"]}',3,false, array[
  'invoices|Invoice and receipt processing','spreadsheet_cleanup|Spreadsheet cleanup','monthly_reporting|Monthly reporting','forecasting|Forecasting and budgeting',
  'reconciliation|Reconciliation','trends|Explaining financial trends','other|Something else|other']);

select public.seed_question('fu_cs','Customer service: where does the team need support?','Pick up to three.','multi','followup',210,'{"any_of":["departments:customer_service"]}',3,false, array[
  'drafting_replies|Drafting replies','policy_answers|Finding policy and product answers','summarizing_cases|Summarizing cases','categorizing|Sorting requests',
  'consistency|More consistent responses','escalating|Escalating complex cases','other|Something else|other']);

select public.seed_question('fu_marketing','Marketing and sales: which work would benefit most?','Pick up to three.','multi','followup',220,'{"any_of":["departments:marketing_sales"]}',3,false, array[
  'content_drafts|Content drafts','campaign_ideas|Campaign ideas','market_research|Audience and market research','lead_research|Lead research',
  'crm_updates|CRM updates','proposals|Proposals and follow-ups','performance_reports|Performance reporting','other|Something else|other']);

select public.seed_question('fu_hr','HR: which activities are relevant?','Pick up to three.','multi','followup',230,'{"any_of":["departments:hr"]}',3,false, array[
  'job_descriptions|Job descriptions','onboarding|Onboarding materials','policy_search|Policy and document search','learning_content|Learning content',
  'survey_summaries|Survey summaries','internal_comms|Internal communications','other|Something else|other']);

select public.seed_question('fu_ops','Operations: which processes are repetitive?','Pick up to three.','multi','followup',240,'{"any_of":["departments:operations"]}',3,false, array[
  'forms|Forms and document processing','scheduling|Scheduling','sops|Writing SOPs','process_reporting|Inventory and process reporting','handoffs|Handoffs',
  'quality_checks|Quality checks','other|Something else|other']);

select public.seed_question('fu_it','IT and software: what support is useful?','Pick up to three.','multi','followup',250,'{"any_of":["departments:it"]}',3,false, array[
  'code_explain|Code explanation','debugging|Debugging help','documentation|Documentation','test_cases|Test-case ideas','data_queries|Data queries',
  'knowledge_search|Internal knowledge search','automation|Workflow automation','other|Something else|other']);

select public.seed_question('fu_adoption','What has held back AI adoption so far?','Pick up to two.','multi','followup',260,'{"any_of":["current_ai_use:not_using","current_ai_use:exploring"]}',2,false, array[
  'not_sure_start|Not sure where to start','lack_training|Lack of training','privacy|Privacy or security concerns','no_tools|No approved tools',
  'unclear_value|Unclear value','limited_time|Limited time','other|Something else|other']);

select public.seed_question('fu_guidance','What guidance would help most?','Pick up to two.','multi','followup',270,'{"any_of":["ai_concerns:privacy","ai_concerns:no_policy"]}',2,false, array[
  'approved_use|Approved-use guidelines','no_enter|What must never be typed into AI tools','verification|How to check AI answers','human_review|When a human must review',
  'team_examples|Examples for our team','other|Something else|other']);

select public.seed_question('fu_data','Data and reporting: which skills are most relevant?','Pick up to three.','multi','followup',280,'{"any_of":["repetitive_tasks:reports","repetitive_tasks:spreadsheets","repetitive_tasks:data_entry"]}',3,false, array[
  'excel|Excel / spreadsheets','power_bi|Power BI / dashboards','sql|SQL','data_cleaning|Data cleaning','data_viz|Data visualization','basic_stats|Basic statistics',
  'ai_analysis|AI-assisted analysis','other|Something else|other']);

-- ---------- Packages (PLACEHOLDER prices) -------------------------------
insert into public.packages (slug, name, tagline, description, price_amount, price_type, included_details, display_order) values
('bronze','Bronze','Start with the essentials',
 'A focused starter program for one team that wants safe, practical AI basics.',
 1200,'one_time',
 '{"workshops":2,"session_length":"90 min","max_staff":10,"departments":1,"features":["2 live workshops (online or at our Calgary centre)","AI basics and safe-use rules","Prompt cheat sheet for your department","Recordings for 30 days","Email support for 30 days"]}',1),
('silver','Silver','Build real habits across teams',
 'Hands-on training tied to the actual tasks of up to three departments.',
 3400,'one_time',
 '{"workshops":4,"session_length":"2 hrs","max_staff":25,"departments":3,"features":["4 hands-on workshops","Up to 3 departments","Department prompt playbooks","Practice labs using your own sample tasks","Monthly office hours for 2 months","Recordings for 90 days"]}',2),
('gold','Gold','Full coverage with follow-through',
 'Complete program for the whole organization, with coaching after the training ends.',
 7500,'one_time',
 '{"workshops":8,"session_length":"2 hrs","max_staff":60,"departments":99,"features":["8 workshops across all departments","Custom use-case labs from your real work","AI use policy template included","90 days of follow-up coaching","Progress report for leadership","Priority scheduling"]}',3),
('premium','Premium','Built around your organization',
 'A fully custom program with a dedicated trainer. Priced by quote after a consultation.',
 null,'quote',
 '{"workshops":null,"session_length":"custom","max_staff":null,"departments":99,"features":["Everything in Gold","Dedicated trainer","Custom curriculum and materials","On-site delivery option","Quarterly progress reviews","Custom quote after consultation"]}',4)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  price_amount = excluded.price_amount, price_type = excluded.price_type,
  included_details = excluded.included_details, display_order = excluded.display_order;

-- ---------- Add-ons (PLACEHOLDER prices) --------------------------------
insert into public.addons (slug, name, category, description, price_amount, price_type) values
('finance-automation-lab','Finance Automation Lab','Department','Invoices, reconciliation and monthly reporting with AI help.',650,'one_time'),
('customer-service-playbook','Customer Service AI Playbook','Department','Reply drafting, case summaries and consistent answers.',500,'one_time'),
('marketing-content-studio','Marketing Content Studio','Department','Content drafts, campaign ideas and lead research.',550,'one_time'),
('hr-onboarding-with-ai','HR and Onboarding with AI','Department','Job descriptions, onboarding kits and policy search.',500,'one_time'),
('ops-sop-automation','Operations and SOP Automation','Department','Turn repeat processes into clear SOPs and checklists.',550,'one_time'),
('it-dev-assistant','IT and Developer Assistant Workshop','Department','Code explanation, debugging help and documentation.',650,'one_time'),
('ai-use-policy-pack','AI Use Policy Pack','Governance','A written AI policy for your team, with what never to enter.',450,'one_time'),
('verification-human-review','Verification and Human Review','Governance','How to check AI answers and when a person must sign off.',400,'one_time'),
('excel-skills','Excel and Spreadsheet Skills','Data','Cleanup, formulas and AI-assisted analysis in spreadsheets.',600,'one_time'),
('sql-data-queries','SQL and Data Queries','Data','Ask better questions of your data with SQL and AI help.',750,'one_time'),
('power-bi-dashboards','Power BI Dashboards','Data','Build and explain dashboards your team will actually use.',850,'one_time'),
('leadership-ai-strategy','Leadership AI Strategy Session','Strategy','A half-day session to set priorities, guardrails and goals.',350,'one_time'),
('coaching-1on1','1:1 Coaching (3 sessions)','Coaching','Personal coaching for managers or champions on your team.',500,'one_time')
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, description = excluded.description,
  price_amount = excluded.price_amount, price_type = excluded.price_type;

drop function public.seed_question(text,text,text,text,text,int,jsonb,int,boolean,text[]);
