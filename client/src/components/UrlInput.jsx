export default function UrlInput({ url, onChange, onSearch, isLoading }) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Lien YouTube
      </label>
      <input
        type="text"
        placeholder="https://www.youtube.com/watch?v=..."
        value={url}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isLoading ? "Recherche…" : "🔍 Rechercher"}
      </button>
    </div>
  );
}
