export type Option = { id: string; option_key: string; label: string; is_other: boolean; display_order: number };
export type Question = {
  id: string;
  question_key: string;
  prompt: string;
  help_text: string | null;
  input_type: "single" | "multi";
  section: string;
  required: boolean;
  max_selections: number | null;
  display_order: number;
  condition_json: { any_of?: string[] } | null;
  question_options: Option[];
};
export type Department = { id: string; slug: string; name: string; is_other: boolean };
export type Pick = { selected: string[]; other: string };
export type AnswerMap = Record<string, Pick>;
export type Pkg = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_amount: number | null;
  price_type: "one_time" | "quote";
  included_details: { features?: string[]; workshops?: number | null; max_staff?: number | null; departments?: number | null };
  display_order: number;
};
export type Addon = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  price_amount: number | null;
  price_type: "one_time" | "quote";
};
