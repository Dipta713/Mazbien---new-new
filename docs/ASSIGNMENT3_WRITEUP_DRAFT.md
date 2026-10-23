# ENTR 3360 Assignment 3: Technical Foundation (DRAFT)

> This is a starting draft in plain language. Rewrite it in your own voice, fix anything that does not match what you actually built, and delete the notes in [brackets]. Your professor said he is marking your decisions, so make sure you can explain each one out loud.

**Live URL:** https://mazbien.vercel.app
**Test account (consultant, so you can see everything):** [email] / [throwaway password]
**Screenshots to add:** Supabase table editor or schema visualizer, signed-in screen, consultant dashboard with data.

## 1. Authentication
People can create an account with an email and password or with Google, sign in, sign out, and stay signed in after a refresh. Three things change when you are signed in: the assessment, "My assessments" and the consultant dashboard all need an account. "My assessments" shows only the signed-in person's own records. The consultant dashboard only opens for accounts with the consultant role.

## 2. What I changed from the AI-proposed schema
My planning draft (generated with AI) proposed 15 tables. I kept most of it and changed these things:
- **Removed `internal_delivery_plan` from `recommendations`.** A client can read their own recommendation, so anything in that row is visible to them. Private consultant text now lives only in `consultant_notes`, which clients cannot read.
- **Added `assessment_addons`.** The draft only had add-ons attached to the recommendation. Uzoma said clients can pick add-ons on their own, so I needed a table for what the client actually chose.
- **Added `profiles` with a `role` column** (client or consultant) so the database itself can tell consultants apart from clients.
- **Dropped `activity_metrics`.** It was optional and not needed for the MVP.
- **Dropped `selected_by_client` from `recommendation_addons`.** That job moved to `assessment_addons`.
- **Added `payment_preference` to `assessment_package_choices`** for the "How would you like to pay?" step, and `contact_messages` for the contact form.
- **Added `is_demo` to `organizations`** so I can wipe only the fake data.
- **Rule for status:** a client can only set an assessment to draft or submitted. Only a consultant can set approved.

## 3. Schema walkthrough (for someone who has never seen a database)
A database is a set of tables, like spreadsheets. Each row has an ID, and tables point to each other using those IDs.

- **profiles:** one row per person who signs up. Holds their email and whether they are a client or a consultant. *Example: a row for jordan@example.com with role "client".*
- **organizations:** one row per client business, with its name, industry and size. *Example: "Foothills Builders", construction, 6 to 20 people, owned by Jordan.*
- **assessments:** one row each time a business fills in the assessment. Holds the status (draft, submitted, approved) and a few headline answers. *Example: Foothills Builders' assessment, submitted on Oct 12.*
- **departments** and **assessment_departments:** the list of departments, and which ones a business picked. *Example: Finance and Operations for the assessment above.*
- **questions** and **question_options:** the question bank. Each option is its own row, and one option per question is marked "Other". Because questions live in tables, I can change wording or options without changing the app code.
- **assessment_answers:** one row per option a client picked. If they picked "Other", their typed words are stored here too.
- **packages** and **addons:** Bronze, Silver, Gold, Premium and the optional extras, with placeholder prices. Premium has no price because it is quoted.
- **recommendations**, **recommendation_items**, **recommendation_addons:** what the rules suggested, and the plain-language reason for each suggestion.
- **assessment_package_choices** and **assessment_addons:** what the client actually chose, plus their payment preference. Kept separate from the suggestions so the system never silently picks for them.
- **consultant_notes:** private notes from consultants.
- **contact_messages:** messages from the contact form.

**How they connect:** organization -> assessments -> answers, departments, recommendation and choices. Answers point back to a question and an option. Everything hangs off the assessment.

**Who can see or change what (Row Level Security):** a client can read and write only their own organization and everything under it. A consultant can read all submitted assessments, change the chosen package and add-ons, write notes and approve. Clients cannot read notes or approve anything. Anyone can read the packages and add-ons list. Only signed-in users can read the questions. This is enforced in the database, not by hiding buttons.

**A decision I can defend:** I stored questions and options in tables instead of hard-coding them in the page. Mazbien will keep changing the questions (that was the feedback on Project 1: more options, wider tiles, an "Other" choice). With tables, one row change updates the app. The tradeoff is more tables and joins, but it avoids rebuilding every time Uzoma wants a new option.

## 4. Synthetic-data note
- **How it was generated:** one SQL script (`supabase/seed/02_demo_data.sql`) run in the Supabase SQL Editor. It uses a fixed random seed, so it produces the same data every time. I wrote the prompt for the first version with an AI tool and then edited it.
- **Row counts:** [run the query at the bottom of the script and paste the counts here].
- **What is invented:** all 40 organizations, their answers, recommendations, choices, payment preferences and consultant notes. Business names are random mixes of Alberta-style words and industry words (like "Cedar Ridge Builders"). A match with a real business would be a coincidence. Package contents and prices are invented too, with Uzoma's OK.
- **What is from a public source:** nothing in the data. The question wording follows Mazbien's planning draft and the follow-up question lists I wrote in Project 1.
- **What I checked:** that answers vary between organizations, that follow-up answers only appear when the matching department or answer was chosen, that submitted dates are spread over about 60 days, that statuses are a mix of draft, submitted and approved, and that no real names or emails appear. [Add anything else you actually checked.]
- **Wipe and reload:** run `03_reset_demo_data.sql` (deletes only rows marked `is_demo`), then run `02_demo_data.sql` again.
- **Screenshot to add:** the consultant dashboard, which is driven by the seeded data.

## 5. Feedback Response 1
[Fill in the exact points from Studio Review 1. Based on what you told me, it covers:]
- **Wider tiles:** all assessment options are now full-width tiles in a two-column layout.
- **More choices for business types:** industries went from [old number] to 16 and departments to 11.
- **Less typing:** every question is a tap-to-choose option. If none fit, the "Something else" tile opens a short text box. The only required typed field is the business name.
- **What I did not do:** [for example, real payments are still out of scope because Mazbien said choosing a tier is informational.]
