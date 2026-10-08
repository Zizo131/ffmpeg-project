function formatDuration(duration) {
  if (!Number.isFinite(duration)) return "Durée inconnue";
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;
}

export default function Suggestions({ suggestions, isLoading, onSelect }) {
  if (!isLoading && suggestions.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:p-8">
      <div className="mb-5 flex items-start justify-between">
        <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Explorer</p><h2 className="text-xl font-extrabold tracking-tight text-white">Suggestions similaires</h2></div>
        <span className="text-xs text-slate-500">{suggestions.length || "…"}</span>
      </div>
      {isLoading ? <div className="animate-pulse rounded-xl bg-white/5 py-6 text-center text-xs text-slate-500">Recherche de vidéos similaires…</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {suggestions.map((suggestion) => <button type="button" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/50 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-indigo-400" key={suggestion.id} onClick={() => onSelect(suggestion.url)}>
          <div className="relative aspect-video bg-white/10"><img src={suggestion.thumbnail} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white">{formatDuration(suggestion.duration)}</span></div>
          <div className="p-3"><strong className="line-clamp-2 block text-xs leading-snug text-white">{suggestion.title}</strong><small className="mt-1 block truncate text-[10px] text-slate-500">{suggestion.channel}</small></div>
        </button>)}
      </div>}
    </section>
  );
}
