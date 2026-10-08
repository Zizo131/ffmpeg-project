import { Check } from "lucide-react";

export default function Stepper({ activeStep }) {
  return <nav aria-label="Progression" className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 sm:gap-4">
    {[["Source", 1], ["Aperçu", 2], ["Télécharger", 3]].map(([label, step], index) => <div className="flex items-center gap-2" key={label}>
      <span className={`grid h-8 w-8 place-items-center rounded-full border ${step < activeStep ? "border-indigo-400 bg-indigo-500 text-white" : step === activeStep ? "border-transparent bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white" : "border-white/10 bg-white/5"}`}>{step < activeStep ? <Check size={14} /> : step}</span><span className={step === activeStep ? "text-white" : ""}>{label}</span>{index < 2 && <span className="mx-1 h-px w-5 bg-white/10 sm:w-12" />}
    </div>)}
  </nav>;
}
