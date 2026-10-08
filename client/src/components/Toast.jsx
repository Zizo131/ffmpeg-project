import { AlertCircle, X } from "lucide-react";

export default function Toast({ message, onClose }) {
  return <div className="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-red-400/20 bg-red-950/80 p-4 text-sm text-red-100 shadow-2xl backdrop-blur-xl" role="alert"><AlertCircle className="mt-0.5 shrink-0 text-red-300" size={18} /><span className="flex-1">{message}</span><button type="button" onClick={onClose} aria-label="Fermer" className="text-red-300 transition-colors hover:text-white"><X size={17} /></button><span className="absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[toast-timer_5s_linear]" /></div>;
}
