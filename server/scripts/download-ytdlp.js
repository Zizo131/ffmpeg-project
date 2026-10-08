import { createWriteStream, chmodSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const binDir = resolve(root, "bin");
const isWindows = process.platform === "win32";
const assetName = isWindows ? "yt-dlp.exe" : "yt-dlp_linux";
const destination = resolve(binDir, isWindows ? "yt-dlp.exe" : "yt-dlp");
mkdirSync(binDir, { recursive: true });

const download = (url, target) => new Promise((resolvePromise, reject) => {
  https.get(url, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      download(response.headers.location, target).then(resolvePromise, reject);
      return;
    }
    if (response.statusCode !== 200) {
      reject(new Error(`Téléchargement yt-dlp impossible (HTTP ${response.statusCode}).`));
      return;
    }
    pipeline(response, createWriteStream(target)).then(resolvePromise, reject);
  }).on("error", reject);
});

await download(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetName}`, destination);
if (!isWindows) chmodSync(destination, 0o755);
console.log(`yt-dlp installé dans ${destination}`);
