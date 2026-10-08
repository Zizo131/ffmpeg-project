import cors from "cors";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  apiSecurityHeaders,
  apiSlowDown,
  downloadLimiter,
  hashIp,
  infoLimiter,
  logger,
  requestId
} from "./middleware/security.js";
import { cleanFilename, isAllowedThumbnail, parseYoutubeUrl, validateQuality } from "./utils/validateUrl.js";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));
const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const maxDuration = Number(process.env.MAX_DURATION_SECONDS) || 900;
const infoCache = new Map();
const infoCacheTtl = 60_000;
const maxConcurrent = Math.max(1, Number(process.env.MAX_CONCURRENT_CONVERSIONS) || 2);
let activeConversions = 0;
const configuredYtdlpPath = process.env.YTDLP_PATH
  || (process.platform === "win32" ? "bin/yt-dlp.exe" : "bin/yt-dlp");
const ytdlpPath = resolve(__dirname, configuredYtdlpPath);
const clientDistPath = resolve(__dirname, "../client/dist");
const allowedOrigins = new Set([frontendUrl].filter(Boolean));

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "false" ? false : 1);
app.use(requestId);
app.use((request, response, next) => {
  if (request.protocol !== "https" && process.env.NODE_ENV === "production") {
    response.redirect(301, `https://${request.get("host")}${request.originalUrl}`);
    return;
  }
  next();
});
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(null, false);
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-Request-Id", "X-Turnstile-Token"],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "1kb" }));
app.use("/api", apiSecurityHeaders(), apiSlowDown);

function userFacingError(errorText = "") {
  const text = errorText.toLowerCase();
  if (text.includes("private video") || text.includes("sign in")) return "Cette vidéo est privée ou nécessite une connexion.";
  if (text.includes("video unavailable") || text.includes("not available")) return "Cette vidéo n'est pas disponible.";
  if (text.includes("bot") || text.includes("confirm you")) return "YouTube a temporairement bloqué cette requête. Réessayez plus tard.";
  return "Impossible de récupérer cette vidéo. Vérifiez le lien et réessayez.";
}

function childEnvironment() {
  return { PATH: process.env.PATH || "", HOME: process.env.HOME || process.env.USERPROFILE || "", LANG: "C.UTF-8" };
}

function runYtdlp(args, timeoutMs = 120_000) {
  return new Promise((resolvePromise, reject) => {
    if (!existsSync(ytdlpPath)) {
      reject(new Error("yt-dlp indisponible."));
      return;
    }
    const child = spawn(ytdlpPath, args, { windowsHide: true, shell: false, env: childEnvironment() });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolvePromise(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error("Délai de récupération dépassé."));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.on("error", () => child.kill("SIGKILL"));
    child.stderr.on("error", () => child.kill("SIGKILL"));
    child.on("error", (error) => finish(error));
    child.on("close", (code) => code === 0 ? finish(null, stdout) : finish(new Error(userFacingError(stderr))));
  });
}

function ytdlpBaseArgs() {
  return ["--no-playlist", "--no-warnings", "--no-config", "--ignore-config", "--no-exec", "--max-filesize", "100M", "--socket-timeout", "10", "--retries", "0"];
}

async function getVideoInfo(canonicalUrl) {
  const cached = infoCache.get(canonicalUrl);
  if (cached && Date.now() - cached.createdAt < infoCacheTtl) return cached.info;
  const output = await runYtdlp([...ytdlpBaseArgs(), "--dump-single-json", "--skip-download", "--", canonicalUrl]);
  let info;
  try { info = JSON.parse(output); } catch { throw new Error("Réponse inattendue de yt-dlp."); }
  if (!Number.isFinite(info.duration) || info.duration > maxDuration) {
    throw new Error(`La vidéo doit durer ${Math.floor(maxDuration / 60)} minutes maximum.`);
  }
  const result = {
    title: String(info.title || "Vidéo YouTube").slice(0, 200),
    thumbnail: isAllowedThumbnail(info.thumbnail) ? info.thumbnail : null,
    duration: info.duration,
    channel: String(info.channel || info.uploader || "Chaîne inconnue").slice(0, 120)
  };
  infoCache.set(canonicalUrl, { info: result, createdAt: Date.now() });
  return result;
}

async function getSuggestions(query) {
  const output = await runYtdlp([...ytdlpBaseArgs(), "--flat-playlist", "--dump-single-json", "--playlist-end", "6", "--", `ytsearch6:${query}`]);
  let result;
  try { result = JSON.parse(output); } catch { throw new Error("Réponse inattendue de yt-dlp."); }
  return (result.entries || []).filter((entry) => entry.id && entry.title).map((entry) => ({
    id: entry.id,
    title: String(entry.title).slice(0, 200),
    thumbnail: isAllowedThumbnail(entry.thumbnail) ? entry.thumbnail : `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
    duration: Number.isFinite(entry.duration) ? entry.duration : null,
    channel: String(entry.channel || entry.uploader || "Chaîne YouTube").slice(0, 120),
    url: `https://www.youtube.com/watch?v=${entry.id}`
  }));
}

function sendApiError(response, request, error) {
  const status = error?.message?.includes("maximum") ? 413 : error?.message?.includes("Délai") ? 504 : 502;
  logger.warn({ requestId: request.id, status, ip: hashIp(request) }, "API request failed");
  response.status(status).json({ error: process.env.NODE_ENV === "production" ? "La requête n'a pas pu être traitée." : error.message });
}

function originGuard(request, response, next) {
  const origin = request.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    response.status(403).json({ error: "Origine non autorisée." });
    return;
  }
  next();
}

async function verifyTurnstile(request) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  const token = request.get("x-turnstile-token");
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.ip });
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return result.ok && (await result.json()).success === true;
}

app.get("/health", (_request, response) => response.status(200).json({ status: "ok" }));

app.get("/api/info", infoLimiter, originGuard, async (request, response) => {
  const parsed = parseYoutubeUrl(request.query.url);
  if (!parsed) return response.status(400).json({ error: "Lien YouTube invalide." });
  try { response.json(await getVideoInfo(parsed.canonicalUrl)); } catch (error) { sendApiError(response, request, error); }
});

app.get("/api/suggestions", infoLimiter, originGuard, async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 2 || query.length > 200 || /[\u0000-\u001f\u007f]/.test(query)) {
    return response.status(400).json({ error: "Recherche invalide." });
  }
  try { response.json({ suggestions: await getSuggestions(query) }); } catch (error) { sendApiError(response, request, error); }
});

app.get("/api/download", downloadLimiter, originGuard, async (request, response) => {
  const parsed = parseYoutubeUrl(request.query.url);
  const quality = validateQuality(request.query.quality);
  if (!parsed || !quality) return response.status(400).json({ error: "Lien ou qualité invalide." });
  if (activeConversions >= maxConcurrent) return response.status(503).json({ error: "Service momentanément occupé. Réessayez dans quelques instants." });
  if (!(await verifyTurnstile(request))) return response.status(403).json({ error: "Vérification anti-abus requise." });

  activeConversions += 1;
  let finished = false;
  let ytdlp;
  let ffmpeg;
  const release = () => { if (!finished) { finished = true; activeConversions -= 1; } };
  try {
    const info = await getVideoInfo(parsed.canonicalUrl);
    const bitrate = quality === "hd" ? "320k" : "128k";
    const encodedTitle = encodeURIComponent(`${cleanFilename(info.title)}.mp3`);
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Content-Disposition", `attachment; filename="audio-youtube.mp3"; filename*=UTF-8''${encodedTitle}`);
    ytdlp = spawn(ytdlpPath, [...ytdlpBaseArgs(), "-f", "bestaudio/best", "-o", "-", "--", parsed.canonicalUrl], { windowsHide: true, shell: false, env: childEnvironment() });
    ffmpeg = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-c:a", "libmp3lame", "-b:a", bitrate, "-f", "mp3", "pipe:1"], { windowsHide: true, shell: false, env: childEnvironment() });
    const killChildren = () => { if (ytdlp && !ytdlp.killed) ytdlp.kill("SIGKILL"); if (ffmpeg && !ffmpeg.killed) ffmpeg.kill("SIGKILL"); release(); };
    const timer = setTimeout(killChildren, 120_000);
    for (const child of [ytdlp, ffmpeg]) child.on("error", killChildren);
    ytdlp.stdout.on("error", killChildren);
    ytdlp.stderr.on("error", killChildren);
    ffmpeg.stdin.on("error", killChildren);
    ffmpeg.stdout.on("error", killChildren);
    ffmpeg.stderr.on("error", killChildren);
    ytdlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(response);
    request.on("close", killChildren);
    ffmpeg.on("close", () => { clearTimeout(timer); release(); });
  } catch (error) {
    release();
    if (!response.headersSent) sendApiError(response, request, error);
  }
});

if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, { index: "index.html" }));
  app.get("*", (_request, response) => response.sendFile(resolve(clientDistPath, "index.html")));
}

app.use((error, request, response, _next) => {
  logger.warn({ requestId: request.id, ip: hashIp(request) }, "Unhandled request error");
  if (!response.headersSent) {
    const status = error?.type === "entity.too.large" ? 413 : 500;
    response.status(status).json({ error: status === 413 ? "Payload trop volumineux." : "Erreur interne du serveur." });
  }
});
process.on("unhandledRejection", (error) => logger.error({ error: String(error) }, "Unhandled rejection"));

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => logger.info({ port }, "Zitube server started"));
}

export { app, parseYoutubeUrl };
