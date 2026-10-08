import { createWriteStream, chmodSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const binDir = resolve(root, "bin");
const isWindows = process.platform === "win32";
const version = process.env.YTDLP_VERSION || "2026.08.19";
const assetName = isWindows ? "yt-dlp.exe" : "yt-dlp_linux";
const destination = resolve(binDir, isWindows ? "yt-dlp.exe" : "yt-dlp");
const checksumFile = resolve(binDir, "SHA256SUMS");
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

await download(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${assetName}`, destination);
await download(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/SHA2-256SUMS`, checksumFile);
const expected = readFileSync(checksumFile, "utf8").split(/\r?\n/).find((line) => line.endsWith(`  ${assetName}`))?.split(/\s+/)[0];
if (!expected) throw new Error(`Checksum yt-dlp introuvable pour ${assetName}.`);
const { createHash } = await import("node:crypto");
const actual = createHash("sha256").update(readFileSync(destination)).digest("hex");
if (actual.toLowerCase() !== expected.toLowerCase()) {
  unlinkSync(destination);
  throw new Error("Vérification SHA-256 de yt-dlp échouée.");
}
unlinkSync(checksumFile);
if (!isWindows) chmodSync(destination, 0o755);
console.log(`yt-dlp ${version} vérifié et installé dans ${destination}`);
