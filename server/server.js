import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));
const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const maxDuration = Number(process.env.MAX_DURATION_SECONDS) || 900;
const infoCacheTtl = 60 * 1000;
const infoCache = new Map();
const configuredYtdlpPath = process.env.YTDLP_PATH
  || (process.platform === "win32" ? "bin/yt-dlp.exe" : "bin/yt-dlp");
const ytdlpPath = resolve(__dirname, configuredYtdlpPath);
const clientDistPath = resolve(__dirname, "../client/dist");

app.use(cors({ origin: frontendUrl }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Trop de demandes. Réessayez dans une minute." }
});
app.use("/api", apiLimiter);

function parseYoutubeUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const allowedHost = /^(youtube\.com|m\.youtube\.com|music\.youtube\.com|youtu\.be)$/;
  if (!allowedHost.test(hostname)) return null;
  if (hostname === "youtu.be" && !parsed.pathname.slice(1)) return null;
  if (hostname.endsWith("youtube.com") && !parsed.searchParams.get("v")) return null;
  return parsed.toString();
}

function cleanFilename(title) {
  const cleaned = String(title || "audio-youtube")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 180);
  return cleaned || "audio-youtube";
}

function userFacingError(errorText = "") {
  const text = errorText.toLowerCase();
  if (text.includes("private video") || text.includes("sign in")) {
    return "Cette vidéo est privée ou nécessite une connexion.";
  }
  if (text.includes("video unavailable") || text.includes("not available")) {
    return "Cette vidéo n'est pas disponible.";
  }
  if (text.includes("bot") || text.includes("confirm you")) {
    return "YouTube a temporairement bloqué cette requête. Réessayez plus tard.";
  }
  return "Impossible de récupérer cette vidéo. Vérifiez le lien et réessayez.";
}

function runYtdlp(args) {
  return new Promise((resolvePromise, reject) => {
    if (!existsSync(ytdlpPath)) {
      reject(new Error("Le binaire yt-dlp est introuvable. Lancez npm run build."));
      return;
    }

    const child = spawn(ytdlpPath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(userFacingError(stderr)));
    });
  });
}

async function getVideoInfo(url) {
  const cached = infoCache.get(url);
  if (cached && Date.now() - cached.createdAt < infoCacheTtl) {
    return cached.info;
  }

  const output = await runYtdlp([
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    "--skip-download",
    "--socket-timeout", "10",
    "--retries", "0",
    url
  ]);
  let info;
  try {
    info = JSON.parse(output);
  } catch {
    throw new Error("Réponse inattendue de yt-dlp.");
  }

  if (!Number.isFinite(info.duration) || info.duration > maxDuration) {
    throw new Error(`La vidéo doit durer ${Math.floor(maxDuration / 60)} minutes maximum.`);
  }
  const result = {
    title: info.title || "Vidéo YouTube",
    thumbnail: info.thumbnail || null,
    duration: info.duration,
    channel: info.channel || info.uploader || "Chaîne inconnue"
  };
  infoCache.set(url, { info: result, createdAt: Date.now() });
  return result;
}

async function getSuggestions(query) {
  const output = await runYtdlp([
    "--flat-playlist",
    "--dump-single-json",
    "--no-warnings",
    "--playlist-end", "6",
    "--socket-timeout", "10",
    "--retries", "0",
    `ytsearch6:${query}`
  ]);
  let result;
  try {
    result = JSON.parse(output);
  } catch {
    throw new Error("Réponse inattendue de yt-dlp.");
  }

  return (result.entries || [])
    .filter((entry) => entry.id && entry.title)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
      duration: Number.isFinite(entry.duration) ? entry.duration : null,
      channel: entry.channel || entry.uploader || "Chaîne YouTube",
      url: entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`
    }));
}

function sendApiError(response, error) {
  const message = error instanceof Error ? error.message : "Une erreur est survenue.";
  const status = message.includes("maximum") ? 413 : 502;
  response.status(status).json({ error: message });
}

app.get("/api/info", async (request, response) => {
  const url = parseYoutubeUrl(request.query.url);
  if (!url) {
    response.status(400).json({ error: "Lien YouTube invalide." });
    return;
  }
  try {
    response.json(await getVideoInfo(url));
  } catch (error) {
    sendApiError(response, error);
  }
});

app.get("/api/suggestions", async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 2 || query.length > 200) {
    response.status(400).json({ error: "Le titre doit contenir entre 2 et 200 caractères." });
    return;
  }
  try {
    response.json({ suggestions: await getSuggestions(query) });
  } catch (error) {
    sendApiError(response, error);
  }
});

app.get("/api/download", async (request, response) => {
  const url = parseYoutubeUrl(request.query.url);
  const quality = request.query.quality === "hd" ? "hd" : request.query.quality === "standard" ? "standard" : null;
  if (!url || !quality) {
    response.status(400).json({ error: "Lien ou qualité invalide." });
    return;
  }

  let title;
  try {
    const info = await getVideoInfo(url);
    title = info.title;
  } catch (error) {
    sendApiError(response, error);
    return;
  }

  const bitrate = quality === "hd" ? "320k" : "128k";
  const safeTitle = cleanFilename(title);
  const encodedTitle = encodeURIComponent(`${safeTitle}.mp3`);
  response.status(200);
  response.setHeader("Content-Type", "audio/mpeg");
  response.setHeader("Content-Disposition", `attachment; filename="audio-youtube.mp3"; filename*=UTF-8''${encodedTitle}`);

  const ytdlp = spawn(ytdlpPath, [
    "--no-playlist",
    "--no-warnings",
    "-f", "bestaudio/best",
    "-o", "-",
    url
  ], { windowsHide: true });
  const ffmpeg = spawn(ffmpegPath, [
    "-hide_banner", "-loglevel", "error",
    "-i", "pipe:0",
    "-vn", "-c:a", "libmp3lame", "-b:a", bitrate,
    "-f", "mp3", "pipe:1"
  ], { windowsHide: true });
  let ytdlpError = "";
  let ffmpegError = "";
  let finished = false;
  ytdlp.stderr.on("data", (chunk) => { ytdlpError += chunk; });
  ffmpeg.stderr.on("data", (chunk) => { ffmpegError += chunk; });
  ytdlp.stdout.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(response);

  const stopChildren = () => {
    if (finished) return;
    finished = true;
    ytdlp.stdout.unpipe(ffmpeg.stdin);
    if (!ytdlp.killed) ytdlp.kill();
    if (!ffmpeg.killed) ffmpeg.kill();
  };
  request.on("close", stopChildren);
  ffmpeg.on("close", (code) => {
    if (finished) return;
    finished = true;
    if (code !== 0 && !response.destroyed) {
      response.destroy(new Error(userFacingError(`${ytdlpError} ${ffmpegError}`)));
    }
  });
  ytdlp.on("error", stopChildren);
  ffmpeg.on("error", stopChildren);
});

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (_request, response) => {
    response.sendFile(resolve(clientDistPath, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  if (!response.headersSent) response.status(500).json({ error: "Erreur interne du serveur." });
});

app.listen(port, () => {
  console.log(`Serveur YouTube MP3 démarré sur le port ${port}`);
});
