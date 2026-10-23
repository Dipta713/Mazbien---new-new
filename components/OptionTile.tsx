import { Check } from "lucide-react";

export default function OptionTile({
  label, selected, onClick, multi,
}: { label: string; selected: boolean; onClick: () => void; multi: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-[15px] font-semibold transition ${
        selected ? "border-brand bg-brand-soft shadow-tile" : "border-ink/10 bg-white hover:border-brand/40"
      }`}
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center border-2 transition ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "border-brand bg-brand text-white" : "border-ink/25"
        }`}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}
