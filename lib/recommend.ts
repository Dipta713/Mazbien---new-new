// Simple rule-based recommendations (no AI model, as the MVP scope says).
// Every suggestion carries a plain-language "why" tied to what the client picked.

export type AddonRef = { id: string; slug: string; name: string };
type Rule = { addon: string; triggers: string[]; why: string };

// >>> EDIT HERE: RECOMMENDATION RULES (which answers trigger which add-on, plus the 'why' text) <<<
const RULES: Rule[] = [
  { addon: "finance-automation-lab", triggers: ["departments:finance"], why: "this lab covers invoices, reconciliation and monthly reporting with AI help." },
  { addon: "customer-service-playbook", triggers: ["departments:customer_service"], why: "this playbook covers reply drafting, case summaries and consistent answers." },
  { addon: "marketing-content-studio", triggers: ["departments:marketing_sales"], why: "this studio covers content drafts, campaign ideas and lead research." },
  { addon: "hr-onboarding-with-ai", triggers: ["departments:hr"], why: "this add-on covers job descriptions, onboarding kits and policy search." },
  { addon: "ops-sop-automation", triggers: ["departments:operations"], why: "this add-on turns repeat processes into clear SOPs and checklists." },
  { addon: "it-dev-assistant", triggers: ["departments:it"], why: "this workshop covers code explanation, debugging help and documentation." },
  { addon: "ai-use-policy-pack", triggers: ["ai_concerns:no_policy", "ai_concerns:privacy", "fu_guidance:approved_use", "fu_guidance:no_enter"], why: "a written AI policy tells your team what is allowed and what must never be typed into AI tools." },
  { addon: "verification-human-review", triggers: ["ai_concerns:accuracy", "fu_guidance:verification", "fu_guidance:human_review"], why: "your team will learn how to check AI answers and when a person must review them." },
  { addon: "excel-skills", triggers: ["fu_data:excel", "tools_used:excel", "repetitive_tasks:spreadsheets"], why: "spreadsheet cleanup and AI-assisted analysis can save hours every week." },
  { addon: "sql-data-queries", triggers: ["fu_data:sql"], why: "SQL skills let your team ask better questions of your data." },
  { addon: "power-bi-dashboards", triggers: ["fu_data:power_bi", "tools_used:power_bi"], why: "dashboards make recurring reports faster and easier to explain." },
  { addon: "leadership-ai-strategy", triggers: ["current_ai_use:not_using", "current_ai_use:exploring"], why: "a short leadership session sets priorities and guardrails before the team starts." },
  { addon: "coaching-1on1", triggers: ["confidence:low", "ai_concerns:staff_resistance"], why: "personal coaching helps nervous teams build confidence faster." },
];

export type RecommendInput = {
  orgName: string;
  industry: string;
  deptNames: string[];
  keys: Set<string>;
  labels: Map<string, string>; // "question_key:option_key" -> label
  taskKeys: string[]; // option keys from repetitive_tasks
  addons: AddonRef[];
};

export function recommend(input: RecommendInput) {
  const { orgName, industry, deptNames, keys, labels, taskKeys, addons } = input;

  const addonRecs: { addon_id: string; rationale: string }[] = [];
  for (const rule of RULES) {
    const hit = rule.triggers.find((t) => keys.has(t));
    const addon = addons.find((a) => a.slug === rule.addon);
    if (!hit || !addon) continue;
    const label = labels.get(hit) ?? hit;
    addonRecs.push({ addon_id: addon.id, rationale: `Because you chose “${label}”, ${rule.why}` });
  }

  const items: { title: string; rationale: string; priority: "high" | "medium"; sequence_order: number }[] = [];
  deptNames.forEach((name, i) =>
    items.push({
      title: `AI for ${name}`,
      rationale: `You picked ${name}, so training should use real ${name} tasks instead of generic examples.`,
      priority: i < 2 ? "high" : "medium",
      sequence_order: items.length + 1,
    })
  );
  taskKeys.slice(0, 3).forEach((k) => {
    const label = labels.get(`repetitive_tasks:${k}`) ?? k;
    items.push({
      title: `Workflow focus: ${label}`,
      rationale: `You said “${label}” repeats every week. Repeat work is where AI usually saves the most time.`,
      priority: "medium",
      sequence_order: items.length + 1,
    });
  });

  const where = deptNames.length ? deptNames.join(", ") : "the areas you selected";
  const client_summary = `${orgName}${industry ? ` (${industry.toLowerCase()})` : ""} would get the most value from training built around ${where}. Your answers point to repeat weekly tasks where practical, hands-on AI help can save time. Pick the package that fits, then add any extras below. A Mazbien consultant will review everything before it is final.`;

  return { client_summary, items, addonRecs: addonRecs.slice(0, 8) };
}
