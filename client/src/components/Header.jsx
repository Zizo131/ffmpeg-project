import { Music2 } from "lucide-react";

const labels = { searching: "Analyse…", downloading: "Préparation…", ready: "", error: "Erreur" };
const colors = { searching: "text-orange-300", downloading: "text-orange-300", ready: "text-emerald-300", error: "text-red-300" };

export default function Header({ status }) {
  return <header className="relative flex items-start justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25"><Music2 size={22} /></div>
      <div><p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Convertisseur audio</p><h1 className="text-2xl font-extrabold leading-none tracking-tight"><span className="text-white">Zi</span><span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">tube</span></h1></div>
    </div>
    {status !== "ready" && <div className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold ${colors[status]}`} aria-live="polite"><span className={`h-2 w-2 rounded-full bg-current ${status === "searching" || status === "downloading" ? "animate-pulse" : ""}`} />{labels[status]}</div>}
    <p className="absolute left-0 top-full mt-5 max-w-md text-sm leading-relaxed text-slate-400">Collez un lien, récupérez le son. Simple, rapide, gratuit.</p>
  </header>;
}
