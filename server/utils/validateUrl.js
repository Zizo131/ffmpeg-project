import { z } from "zod";

const HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const urlInput = z.string().min(1).max(2048);

export function parseYoutubeUrl(value) {
  if (!urlInput.safeParse(value).success) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const authority = value.match(/^https:\/\/([^/?#]+)/i)?.[1] || "";
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || authority.includes(":")) return null;
  if (!HOSTNAMES.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.hash) return null;

  let videoId;
  if (parsed.hostname.toLowerCase().endsWith("youtu.be")) {
    if (parsed.pathname.split("/").filter(Boolean).length !== 1) return null;
    videoId = parsed.pathname.slice(1);
  } else {
    if (parsed.pathname !== "/watch" || parsed.searchParams.has("list") || parsed.searchParams.has("index")) return null;
    videoId = parsed.searchParams.get("v");
    if ([...parsed.searchParams.keys()].some((key) => !["v", "si"].includes(key))) return null;
  }

  if (!videoId || !VIDEO_ID.test(videoId)) return null;
  return {
    id: videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

export function isAllowedThumbnail(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === "i.ytimg.com" && !parsed.username && !parsed.password && !parsed.port;
  } catch {
    return false;
  }
}

export function validateQuality(value) {
  return value === "standard" || value === "hd" ? value : null;
}

export function cleanFilename(title) {
  const cleaned = String(title || "audio-youtube")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 180);
  return cleaned || "audio-youtube";
}
