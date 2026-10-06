export default function InfoCard({ info }) {
  const { title, thumbnail, duration, channel } = info;
  const minutes = Math.floor(duration / 60);
  const seconds = (duration % 60).toString().padStart(2, "0");

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4 space-y-3">
        <h2 className="font-bold text-lg text-white line-clamp-2">
          {title}
        </h2>
        <div className="space-y-1 text-sm text-slate-400">
          <p>📺 <span className="text-slate-300">{channel}</span></p>
          <p>⏱️ <span className="text-slate-300">{minutes}:{seconds}</span></p>
        </div>
      </div>
    </div>
  );
}
