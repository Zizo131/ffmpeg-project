import { useEffect, useRef, useState } from "react";
import { downloadMP3, fetchVideoInfo } from "./api";
import InfoCard from "./components/InfoCard";
import QualitySelector from "./components/QualitySelector";
import UrlInput from "./components/UrlInput";

export default function App() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [quality, setQuality] = useState("standard");
  const downloadLinkRef = useRef(null);

  const handleSearch = async () => {
    if (!url.trim()) {
      setError("Veuillez entrer un lien YouTube.");
      return;
    }
    setState("searching");
    setError("");
    try {
      const videoInfo = await fetchVideoInfo(url);
      setInfo(videoInfo);
      setState("ready");
    } catch (err) {
      setError(err.message || "Impossible de charger la vidéo.");
      setState("error");
      setInfo(null);
    }
  };

  const handleDownload = async () => {
    setState("downloading");
    setError("");
    try {
      const blob = await downloadMP3(url, quality);
      const blobUrl = URL.createObjectURL(blob);
      const link = downloadLinkRef.current || document.createElement("a");
      link.href = blobUrl;
      link.download = `${info?.title || "audio-youtube"}.mp3`;
      if (!downloadLinkRef.current) document.body.appendChild(link);
      downloadLinkRef.current = link;
      link.click();
      setState("ready");
    } catch (err) {
      setError(err.message || "Erreur lors du téléchargement.");
      setState("error");
    }
  };

  // Efface les erreurs après 5 secondes
  useEffect(() => {
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">🎵 YouTube MP3</h1>
          <p className="text-slate-400 text-sm">
            Convertis des vidéos YouTube en MP3 · Utilise uniquement pour du contenu libre de droits
          </p>
        </header>

        <UrlInput
          url={url}
          onChange={setUrl}
          onSearch={handleSearch}
          isLoading={state === "searching"}
        />

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {info && state !== "error" && (
          <>
            <InfoCard info={info} />
            <QualitySelector
              quality={quality}
              onChange={setQuality}
              isLoading={state === "downloading"}
            />
            <button
              onClick={handleDownload}
              disabled={state === "downloading"}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {state === "downloading" ? "Téléchargement en cours…" : "⬇ Télécharger MP3"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
