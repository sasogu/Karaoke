#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function parseArgs(argv) {
  const args = {
    baseUrl: "",
    audioUrlMode: "relative",
    audioDir: "audio",
    syncDir: "sync",
    output: "catalog/canciones.json"
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--base-url") args.baseUrl = String(argv[i + 1] || "").trim(), i++;
    else if (token === "--audio-url-mode") args.audioUrlMode = String(argv[i + 1] || "relative").trim().toLowerCase(), i++;
    else if (token === "--audio-dir") args.audioDir = String(argv[i + 1] || "audio").trim(), i++;
    else if (token === "--sync-dir") args.syncDir = String(argv[i + 1] || "sync").trim(), i++;
    else if (token === "--output") args.output = String(argv[i + 1] || "catalog/canciones.json").trim(), i++;
    else if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!["relative", "absolute"].includes(args.audioUrlMode)) {
    console.error("Valor inválido para --audio-url-mode. Usa: relative | absolute");
    process.exit(1);
  }

  if (args.audioUrlMode === "absolute" && !args.baseUrl) {
    console.error("Con --audio-url-mode absolute debes indicar --base-url. Ejemplo: --base-url https://raw.githubusercontent.com/usuario/repo/main");
    process.exit(1);
  }

  return args;
}

function printHelp() {
  console.log(`Uso:\n  node scripts/generate-catalog.mjs [opciones]\n\nOpciones:\n  --audio-url-mode Modo de audioUrl: relative | absolute (default: relative)\n  --base-url       URL base para construir audioUrl absoluto (requerido con --audio-url-mode absolute)\n  --audio-dir      Carpeta de audios (default: audio)\n  --sync-dir       Carpeta de sincronización JSON (default: sync)\n  --output         Ruta de salida del catálogo (default: catalog/canciones.json)`);
}

async function listFilesRecursive(rootDir) {
  const out = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else {
        out.push(absolute);
      }
    }
  }
  await walk(rootDir);
  return out;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function sanitizeId(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "song";
}

function parseParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function readJsonIfExists(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildAudioUrl(audioUrlMode, baseUrl, relativeAudioPath) {
  const rel = toPosixPath(relativeAudioPath).replace(/^\/+/, "");
  if (audioUrlMode === "relative") return rel;

  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${rel}`;
}

function getAudioIdentity(song) {
  const byMeta = String(song?.audioMeta?.name || "").trim().toLowerCase();
  const byUrl = String(song?.audioUrl || "").trim();

  if (byUrl) {
    try {
      const parsed = new URL(byUrl, "https://catalog.local/");
      const lastSegment = decodeURIComponent(parsed.pathname.split("/").pop() || "").trim().toLowerCase();
      if (lastSegment) return lastSegment;
    } catch {
      const normalized = byUrl.split(/[?#]/)[0].split("/").pop();
      const lastSegment = decodeURIComponent(String(normalized || "")).trim().toLowerCase();
      if (lastSegment) return lastSegment;
    }
  }

  return byMeta || String(song?.id || "").trim().toLowerCase();
}

function getSongQualityScore(song) {
  const paragraphsCount = Array.isArray(song?.paragraphs) ? song.paragraphs.length : 0;
  const calibratedCount = Array.isArray(song?.times?.calibrated) ? song.times.calibrated.length : 0;
  const autoCount = Array.isArray(song?.times?.auto) ? song.times.auto.length : 0;
  const lyricsLength = String(song?.lyricsOriginal || "").trim().length;
  return (paragraphsCount * 1000) + (calibratedCount * 100) + (autoCount * 10) + lyricsLength;
}

function ensureUniqueSongIds(songs) {
  const used = new Set();

  return songs.map((song) => {
    const baseId = sanitizeId(song?.id || song?.title || getAudioIdentity(song) || "song");
    let nextId = baseId;
    let counter = 2;

    while (used.has(nextId)) {
      nextId = `${baseId}-${counter}`;
      counter += 1;
    }

    used.add(nextId);
    return { ...song, id: nextId };
  });
}

function normalizeSongFromSync(syncJson, fallback) {
  const explicitAudioUrl = String(syncJson?.audioUrl || syncJson?.audio || "").trim();
  const category = String(syncJson?.category || syncJson?.categoryId || fallback.category || "general").trim() || "general";
  const categoryTitle = String(syncJson?.categoryTitle || fallback.categoryTitle || "").trim();
  const lyricsOriginal = String(syncJson?.lyricsOriginal || syncJson?.lyrics || "");
  const paragraphs = Array.isArray(syncJson?.paragraphs) && syncJson.paragraphs.length
    ? syncJson.paragraphs.map((p) => String(p || "")).filter(Boolean)
    : parseParagraphs(lyricsOriginal);

  const autoTimes = Array.isArray(syncJson?.times?.auto)
    ? syncJson.times.auto
    : (Array.isArray(syncJson?.autoTimes) ? syncJson.autoTimes : []);
  const calibratedTimes = Array.isArray(syncJson?.times?.calibrated)
    ? syncJson.times.calibrated
    : (Array.isArray(syncJson?.calibratedTimes) ? syncJson.calibratedTimes : []);

  return {
    id: String(syncJson?.id || fallback.id),
    title: String(syncJson?.title || fallback.title),
    category,
    categoryTitle,
    audioUrl: explicitAudioUrl || fallback.audioUrl,
    lyricsOriginal,
    paragraphs,
    times: {
      auto: autoTimes,
      calibrated: calibratedTimes
    },
    offsetSeconds: Number(syncJson?.offsetSeconds ?? 0),
    detector: {
      threshold: Number(syncJson?.detector?.threshold ?? 0.02),
      minSilenceMs: Number(syncJson?.detector?.minSilenceMs ?? 320),
      windowMs: Number(syncJson?.detector?.windowMs ?? 80)
    },
    audioMeta: {
      name: String(syncJson?.audioMeta?.name || fallback.audioName),
      type: String(syncJson?.audioMeta?.type || fallback.audioType)
    }
  };
}

function inferAudioTypeFromExt(ext) {
  switch (ext.toLowerCase()) {
    case ".mp3": return "audio/mpeg";
    case ".wav": return "audio/wav";
    case ".ogg": return "audio/ogg";
    case ".m4a": return "audio/mp4";
    case ".aac": return "audio/aac";
    case ".flac": return "audio/flac";
    default: return "audio/mpeg";
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const audioDirAbs = path.resolve(repoRoot, args.audioDir);
  const syncDirAbs = path.resolve(repoRoot, args.syncDir);
  const outputAbs = path.resolve(repoRoot, args.output);

  const audioFiles = await listFilesRecursive(audioDirAbs);
  const songs = [];
  const usedSyncJson = new Set();

  for (const audioAbs of audioFiles) {
    const ext = path.extname(audioAbs).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;

    const relAudio = path.relative(repoRoot, audioAbs);
    const relFromAudioRoot = path.relative(audioDirAbs, audioAbs);
    const baseName = path.basename(audioAbs, ext);

    const fallback = {
      id: sanitizeId(baseName),
      title: baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(),
      category: "general",
      categoryTitle: "General",
      audioUrl: buildAudioUrl(args.audioUrlMode, args.baseUrl, relAudio),
      audioName: path.basename(audioAbs),
      audioType: inferAudioTypeFromExt(ext)
    };

    const syncCandidate = path.join(syncDirAbs, relFromAudioRoot).replace(new RegExp(`${ext}$`, "i"), ".json");
    const syncJson = await readJsonIfExists(syncCandidate);
    if (syncJson) usedSyncJson.add(path.resolve(syncCandidate));

    const song = normalizeSongFromSync(syncJson, fallback);
    songs.push(song);
  }

  const syncFiles = await listFilesRecursive(syncDirAbs);
  for (const syncAbs of syncFiles) {
    if (path.extname(syncAbs).toLowerCase() !== ".json") continue;
    if (usedSyncJson.has(path.resolve(syncAbs))) continue;

    const syncJson = await readJsonIfExists(syncAbs);
    if (!syncJson || typeof syncJson !== "object") continue;

    const audioUrl = String(syncJson.audioUrl || syncJson.audio || "").trim();
    const title = String(syncJson.title || "").trim();
    if (!audioUrl || !title) continue;

    const fallback = {
      id: sanitizeId(path.basename(syncAbs, ".json")),
      title,
      category: String(syncJson.category || syncJson.categoryId || "general").trim() || "general",
      categoryTitle: String(syncJson.categoryTitle || "").trim(),
      audioUrl,
      audioName: path.basename(audioUrl.split("?")[0] || "audio-remoto.mp3"),
      audioType: "audio/mpeg"
    };

    songs.push(normalizeSongFromSync(syncJson, fallback));
  }

  const dedupedByAudio = new Map();
  for (const song of songs) {
    if (!song || !song.audioUrl || !song.title) continue;
    const identity = getAudioIdentity(song);
    if (!identity) continue;

    if (!dedupedByAudio.has(identity)) {
      dedupedByAudio.set(identity, song);
      continue;
    }

    const current = dedupedByAudio.get(identity);
    if (getSongQualityScore(song) > getSongQualityScore(current)) {
      dedupedByAudio.set(identity, song);
    }
  }

  const finalSongs = ensureUniqueSongIds(Array.from(dedupedByAudio.values()));

  finalSongs.sort((a, b) => a.title.localeCompare(b.title, "es"));

  const categoriesMap = new Map();
  finalSongs.forEach((song) => {
    const id = String(song.category || "general").trim() || "general";
    const title = String(song.categoryTitle || "").trim() || (id === "general" ? "General" : id.replace(/[-_]+/g, " "));
    if (!categoriesMap.has(id)) {
      categoriesMap.set(id, { id, title });
    }
  });

  const categories = Array.from(categoriesMap.values())
    .sort((a, b) => a.title.localeCompare(b.title, "es"));

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      audioDir: toPosixPath(path.relative(repoRoot, audioDirAbs) || args.audioDir),
      syncDir: toPosixPath(path.relative(repoRoot, syncDirAbs) || args.syncDir)
    },
    categories,
    songs: finalSongs
  };

  await fs.mkdir(path.dirname(outputAbs), { recursive: true });
  await fs.writeFile(outputAbs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Catálogo generado: ${toPosixPath(path.relative(repoRoot, outputAbs))}`);
  console.log(`Canciones: ${finalSongs.length}`);
}

main().catch((error) => {
  console.error("Error generando catálogo:", error.message);
  process.exit(1);
});
