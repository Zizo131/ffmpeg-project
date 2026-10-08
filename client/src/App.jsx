import { useEffect, useState } from "react";
import { Check, Download, LoaderCircle } from "lucide-react";
import { downloadMP3, fetchSuggestions, fetchVideoInfo } from "./api";
import Footer from "./components/Footer";
import Header from "./components/Header";
import InfoCard from "./components/InfoCard";
import QualitySelector from "./components/QualitySelector";
import Stepper from "./components/Stepper";
import Suggestions from "./components/Suggestions";
import Toast from "./components/Toast";
import UrlInput from "./components/UrlInput";

function safeDownloadName(title) {
  return String(title || "audio-youtube")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 180) || "audio-youtube";
}

export default function App() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [quality, setQuality] = useState("standard");
  const [downloaded, setDownloaded] = useState(false);

  const handleSearch = async () => {
    if (!url.trim()) {
      setError("Veuillez entrer un lien YouTube.");
      setState("error");
      return;
    }

    setState("searching");
    setError("");
    setInfo(null);
    try {
      const videoInfo = await fetchVideoInfo(url);
      setInfo(videoInfo);
      setState("ready");
      setSuggestionsLoading(true);
      fetchSuggestions(videoInfo.title)
        .then(({ suggestions: nextSuggestions }) => setSuggestions(nextSuggestions))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionsLoading(false));
    } catch (err) {
      setError(err.message || "Impossible de charger la vidéo.");
      setState("error");
      setSuggestions([]);
    }
  };

  const handleDownload = async () => {
    setState("downloading");
    setDownloaded(false);
    setError("");
    try {
      const blob = await downloadMP3(url, quality);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${safeDownloadName(info?.title)}.mp3`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      setDownloaded(true);
      setState("ready");
    } catch (err) {
      setError(err.message || "Erreur lors du téléchargement.");
      setState("error");
    }
  };

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => {
      setError("");
      if (state === "error") setState(info ? "ready" : "idle");
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, info, state]);

  const activeStep = downloaded ? 3 : state === "idle" || state === "searching" ? 1 : 2;
  const status = state === "searching" ? "searching"
    : state === "downloading" ? "downloading"
      : state === "error" ? "error" : "ready";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#07080f] text-white">
      <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <Header status={status} />
        <main className="mt-10 flex-1 sm:mt-14">
          <Stepper activeStep={activeStep} />

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Source</p>
              <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Quelle vidéo souhaitez-vous écouter ?
              </h2>
            </div>
            <UrlInput url={url} onChange={setUrl} onSearch={handleSearch} isLoading={state === "searching"} />
          </section>

          {state === "searching" && <InfoCard isLoading />}
          {info && state !== "error" && (
            <div className="mt-5 grid gap-5">
              <InfoCard info={info} />
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:p-8">
                <div className="mb-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Téléchargement</p>
                  <h2 className="text-xl font-extrabold tracking-tight text-white">Personnalisez votre audio</h2>
                </div>
                <QualitySelector quality={quality} onChange={setQuality} isLoading={state === "downloading"} />
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={state === "downloading"}
                  className="relative mt-6 flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.01] hover:from-emerald-400 hover:to-teal-300 active:scale-95 disabled:cursor-wait disabled:opacity-70"
                >
                  {state === "downloading" && <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-white/70" />}
                  {downloaded ? <Check size={20} /> : state === "downloading" ? <LoaderCircle className="animate-spin" size={20} /> : <Download size={20} />}
                  <span>{downloaded ? "Téléchargé !" : state === "downloading" ? "Préparation du fichier…" : "Télécharger le MP3"}</span>
                </button>
              </section>
              <Suggestions suggestions={suggestions} isLoading={suggestionsLoading} onSelect={setUrl} />
            </div>
          )}
        </main>
        <Footer />
      </div>
      {error && <Toast message={error} onClose={() => setError("")} />}
    </div>
  );
}
