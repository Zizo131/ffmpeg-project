import { Clipboard, Link2, LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

function isYoutubeUrl(value) {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export default function UrlInput({ url, onChange, onSearch, isLoading }) {
  const [invalid, setInvalid] = useState(false);

  const updateUrl = (value) => {
    onChange(value);
    setInvalid(Boolean(value.trim()) && !isYoutubeUrl(value));
  };

  const pasteUrl = async () => {
    try {
      const value = await navigator.clipboard.readText();
      updateUrl(value);
    } catch {
      setInvalid(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") onSearch();
  };

  return (
    <div>
      <label htmlFor="youtube-url" className="sr-only">Lien YouTube</label>
      <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white/5 px-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/50 ${invalid ? "border-red-400/70" : "border-white/10 focus-within:border-indigo-400/60"}`}>
        <Link2 className="shrink-0 text-slate-400" size={19} aria-hidden="true" />
        <input
          id="youtube-url"
          type="url"
          value={url}
          onChange={(event) => updateUrl(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://youtube.com/watch?v=..."
          aria-invalid={invalid}
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button type="button" onClick={pasteUrl} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400" aria-label="Coller un lien">
          <Clipboard size={15} /> <span className="hidden sm:inline">Coller</span>
        </button>
        <span className="hidden h-6 w-px bg-white/10 sm:block" />
        <button type="button" onClick={onSearch} disabled={isLoading || invalid || !url.trim()} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-[1.02] hover:from-indigo-400 hover:to-violet-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50" >
          {isLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Search size={16} />}
          <span className="hidden sm:inline">{isLoading ? "Analyse…" : "Analyser"}</span>
        </button>
      </div>
      {invalid && <p className="mt-2 text-xs text-red-300" role="status">Ce lien ne semble pas être une URL YouTube valide.</p>}
      <p className="mt-3 text-xs text-slate-500">Appuyez sur Entrée pour analyser · Ctrl + V pour coller automatiquement</p>
    </div>
  );
}
