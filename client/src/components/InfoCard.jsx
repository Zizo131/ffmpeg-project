export default function InfoCard({ info, isLoading = false }) {
  if (isLoading) {
    return <div className="mt-5 animate-pulse rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl sm:flex sm:gap-5"><div className="aspect-video rounded-2xl bg-white/10 sm:w-56" /><div className="mt-4 flex-1 space-y-3 sm:mt-2"><div className="h-3 w-28 rounded bg-white/10" /><div className="h-6 w-4/5 rounded bg-white/10" /><div className="h-3 w-1/3 rounded bg-white/10" /></div></div>;
  }

  const minutes = Math.floor(info.duration / 60);
  const seconds = (info.duration % 60).toString().padStart(2, "0");
  return (
    <article className="animate-[slide-up_300ms_ease-out] overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:flex">
      <div className="relative aspect-video shrink-0 sm:aspect-auto sm:w-56">
        <img src={info.thumbnail} alt="" className="h-full w-full object-cover" />
        <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-xs font-bold text-white">{minutes}:{seconds}</span>
      </div>
      <div className="p-5 sm:p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Aperçu</p>
        <h2 className="line-clamp-2 text-lg font-extrabold leading-tight tracking-tight text-white">{info.title}</h2>
        <div className="mt-4 flex gap-3 text-xs text-slate-400"><span>{info.channel}</span><span className="text-white/20">•</span><span>{minutes}:{seconds}</span></div>
      </div>
    </article>
  );
}
