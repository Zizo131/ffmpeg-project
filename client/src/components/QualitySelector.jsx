export default function QualitySelector({ quality, onChange, isLoading }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Qualité audio
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onChange("standard")}
          disabled={isLoading}
          className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
            quality === "standard"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Standard (128 kbps)
        </button>
        <button
          onClick={() => onChange("hd")}
          disabled={isLoading}
          className={`py-2 px-3 rounded-lg font-semibold transition-colors ${
            quality === "hd"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          HD (320 kbps) 🎧
        </button>
      </div>
    </div>
  );
}
