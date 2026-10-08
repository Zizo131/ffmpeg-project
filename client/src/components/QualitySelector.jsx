import { Check } from "lucide-react";

const options = [
  { id: "standard", title: "Standard", detail: "128 kbps", size: "~3–5 MB" },
  { id: "hd", title: "HD", detail: "320 kbps", size: "~7–10 MB" },
];

export default function QualitySelector({ quality, onChange, isLoading }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-slate-300">Qualité audio</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = quality === option.id;
          return <button type="button" key={option.id} onClick={() => onChange(option.id)} disabled={isLoading} className={`relative rounded-2xl border p-4 text-left transition-all duration-200 hover:bg-white/10 disabled:opacity-60 ${selected ? "border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/10" : "border-white/10 bg-white/[0.03]"}`} aria-pressed={selected}>
            <span className={`absolute right-4 top-4 grid h-5 w-5 place-items-center rounded-full border ${selected ? "border-indigo-300 bg-indigo-500 text-white" : "border-white/20 text-transparent"}`}><Check size={13} /></span>
            <span className="block font-bold text-white">{option.title} <span className="font-normal text-slate-400">{option.detail}</span></span>
            <span className="mt-1 block text-xs text-slate-500">Taille estimée {option.size}</span>
          </button>;
        })}
      </div>
    </fieldset>
  );
}
