#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function parseArgs(argv) {
  const args = {
    audioDir: "audio",
    syncDir: "sync",
    catalog: "catalog/canciones.json"
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--audio-dir") args.audioDir = String(argv[i + 1] || "audio").trim(), i++;
    else if (token === "--sync-dir") args.syncDir = String(argv[i + 1] || "sync").trim(), i++;
    else if (token === "--catalog") args.catalog = String(argv[i + 1] || "catalog/canciones.json").trim(), i++;
    else if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Uso:
  node scripts/validate-catalog.mjs [opciones]

Opciones:
  --audio-dir  Carpeta de audios (default: audio)
  --sync-dir   Carpeta de sincronización JSON (default: sync)
  --catalog    Ruta del catálogo generado (default: catalog/canciones.json)`);
}

async function listFilesRecursive(rootDir) {
  const out = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else out.push(absolute);
    }
  }

  await walk(rootDir);
  return out;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeParagraphs(payload) {
  if (Array.isArray(payload?.paragraphs)) {
    return payload.paragraphs.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const lyrics = String(payload?.lyricsOriginal || payload?.lyrics || "");
  return lyrics
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTimes(payload, key) {
  if (Array.isArray(payload?.times?.[key])) return payload.times[key];
  if (Array.isArray(payload?.[`${key}Times`])) return payload[`${key}Times`];
  return [];
}

function collectAudioNames(audioFilesAbs) {
  const names = new Set();

  for (const filePath of audioFilesAbs) {
    const ext = path.extname(filePath).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) continue;
    names.add(path.basename(filePath).toLowerCase());
  }

  return names;
}

function validateStringField(errors, value, label) {
  if (!isNonEmptyString(value)) {
    errors.push(`${label}: debe ser un texto no vacío`);
  }
}

function validateOptionalStringField(errors, value, label) {
  if (value == null || value === "") return;
  if (!isNonEmptyString(value)) {
    errors.push(`${label}: si existe, debe ser un texto válido`);
  }
}

function validateTimes(errors, warnings, times, label, paragraphsCount) {
  if (!Array.isArray(times)) {
    errors.push(`${label}: debe ser un array`);
    return;
  }

  let previous = -Infinity;
  for (let index = 0; index < times.length; index++) {
    const value = times[index];
    if (!Number.isFinite(value)) {
      errors.push(`${label}[${index}]: debe ser un número finito`);
      continue;
    }
    if (value < 0) {
      errors.push(`${label}[${index}]: no puede ser negativo`);
    }
    if (value < previous) {
      errors.push(`${label}: debe estar ordenado ascendentemente`);
      break;
    }
    previous = value;
  }

  if (paragraphsCount > 0 && times.length > paragraphsCount) {
    errors.push(`${label}: tiene más marcas (${times.length}) que párrafos (${paragraphsCount})`);
  } else if (paragraphsCount > 0 && times.length > 0 && times.length !== paragraphsCount) {
    warnings.push(`${label}: número de marcas (${times.length}) distinto a párrafos (${paragraphsCount})`);
  }
}

function getAudioUrl(payload) {
  return String(payload?.audioUrl || payload?.audio || "").trim();
}

function validateDetector(errors, detector, label) {
  if (detector == null) return;
  if (typeof detector !== "object" || Array.isArray(detector)) {
    errors.push(`${label}: debe ser un objeto`);
    return;
  }

  const numericFields = [
    ["threshold", 0, 1],
    ["minSilenceMs", 1, Number.POSITIVE_INFINITY],
    ["windowMs", 1, Number.POSITIVE_INFINITY]
  ];

  for (const [field, min, max] of numericFields) {
    if (detector[field] == null) continue;
    const value = Number(detector[field]);
    if (!Number.isFinite(value)) {
      errors.push(`${label}.${field}: debe ser numérico`);
      continue;
    }
    if (value < min || value > max) {
      errors.push(`${label}.${field}: fuera de rango`);
    }
  }
}

function validateAudioMeta(errors, audioMeta, label) {
  if (audioMeta == null) return;
  if (typeof audioMeta !== "object" || Array.isArray(audioMeta)) {
    errors.push(`${label}: debe ser un objeto`);
    return;
  }

  validateOptionalStringField(errors, audioMeta.name, `${label}.name`);
  validateOptionalStringField(errors, audioMeta.type, `${label}.type`);
}

function validateSongLike(payload, context, audioNames) {
  const errors = [];
  const warnings = [];
  const paragraphs = normalizeParagraphs(payload);
  const audioUrl = getAudioUrl(payload);

  validateStringField(errors, payload?.title, `${context}.title`);
  validateOptionalStringField(errors, payload?.id, `${context}.id`);
  validateOptionalStringField(errors, payload?.category, `${context}.category`);
  validateOptionalStringField(errors, payload?.categoryId, `${context}.categoryId`);
  validateOptionalStringField(errors, payload?.categoryTitle, `${context}.categoryTitle`);

  if (!audioUrl) {
    const audioMetaName = String(payload?.audioMeta?.name || "").trim().toLowerCase();
    if (!audioMetaName || !audioNames.has(audioMetaName)) {
      errors.push(`${context}: requiere audioUrl o audio local reconocible en audioMeta.name`);
    }
  }

  if (!paragraphs.length) {
    errors.push(`${context}: requiere paragraphs o lyricsOriginal con al menos un bloque`);
  }

  validateTimes(errors, warnings, getTimes(payload, "auto"), `${context}.times.auto`, paragraphs.length);
  validateTimes(errors, warnings, getTimes(payload, "calibrated"), `${context}.times.calibrated`, paragraphs.length);
  validateDetector(errors, payload?.detector, `${context}.detector`);
  validateAudioMeta(errors, payload?.audioMeta, `${context}.audioMeta`);

  const offsetSeconds = payload?.offsetSeconds;
  if (offsetSeconds != null && !Number.isFinite(Number(offsetSeconds))) {
    errors.push(`${context}.offsetSeconds: debe ser numérico`);
  }

  return { errors, warnings, paragraphs, audioUrl };
}

async function validateSyncFiles(syncDirAbs, audioNames) {
  const syncFiles = (await listFilesRecursive(syncDirAbs))
    .filter((filePath) => path.extname(filePath).toLowerCase() === ".json")
    .sort((a, b) => a.localeCompare(b));

  const errors = [];
  const warnings = [];

  for (const filePath of syncFiles) {
    const relative = path.relative(process.cwd(), filePath);
    let payload;

    try {
      payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      errors.push(`${relative}: JSON inválido (${error.message})`);
      continue;
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      errors.push(`${relative}: el contenido debe ser un objeto JSON`);
      continue;
    }

    const result = validateSongLike(payload, relative, audioNames);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { errors, warnings, count: syncFiles.length };
}

async function validateCatalogFile(catalogAbs, audioNames) {
  const relative = path.relative(process.cwd(), catalogAbs);
  const errors = [];
  const warnings = [];
  let payload;

  try {
    payload = JSON.parse(await fs.readFile(catalogAbs, "utf8"));
  } catch (error) {
    return {
      errors: [`${relative}: JSON inválido (${error.message})`],
      warnings,
      songsCount: 0
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      errors: [`${relative}: el catálogo debe ser un objeto JSON`],
      warnings,
      songsCount: 0
    };
  }

  const songs = Array.isArray(payload.songs) ? payload.songs : null;
  if (!songs) {
    errors.push(`${relative}: falta songs[]`);
    return { errors, warnings, songsCount: 0 };
  }

  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const categoryIds = new Set();
  const songIds = new Set();

  for (let index = 0; index < categories.length; index++) {
    const category = categories[index];
    const label = `${relative}.categories[${index}]`;
    if (!category || typeof category !== "object" || Array.isArray(category)) {
      errors.push(`${label}: debe ser un objeto`);
      continue;
    }
    validateStringField(errors, category.id, `${label}.id`);
    validateStringField(errors, category.title, `${label}.title`);

    const categoryId = String(category.id || "").trim();
    if (categoryId) {
      if (categoryIds.has(categoryId)) errors.push(`${label}.id: duplicado (${categoryId})`);
      categoryIds.add(categoryId);
    }
  }

  for (let index = 0; index < songs.length; index++) {
    const song = songs[index];
    const label = `${relative}.songs[${index}]`;
    if (!song || typeof song !== "object" || Array.isArray(song)) {
      errors.push(`${label}: debe ser un objeto`);
      continue;
    }

    const result = validateSongLike(song, label, audioNames);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    const songId = String(song.id || "").trim();
    if (!songId) {
      errors.push(`${label}.id: obligatorio en catálogo`);
    } else if (songIds.has(songId)) {
      errors.push(`${label}.id: duplicado (${songId})`);
    } else {
      songIds.add(songId);
    }

    const categoryId = String(song.category || song.categoryId || "").trim();
    if (categoryId && categories.length && !categoryIds.has(categoryId)) {
      warnings.push(`${label}: referencia category/categoryId no declarada en categories (${categoryId})`);
    }
  }

  return { errors, warnings, songsCount: songs.length };
}

function printMessages(messages, prefix) {
  for (const message of messages) {
    console.log(`${prefix} ${message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const audioDirAbs = path.resolve(cwd, args.audioDir);
  const syncDirAbs = path.resolve(cwd, args.syncDir);
  const catalogAbs = path.resolve(cwd, args.catalog);

  const audioFilesAbs = await listFilesRecursive(audioDirAbs).catch(() => []);
  const audioNames = collectAudioNames(audioFilesAbs);

  const syncResult = await validateSyncFiles(syncDirAbs, audioNames);
  const catalogResult = await validateCatalogFile(catalogAbs, audioNames);

  printMessages(syncResult.warnings, "WARN");
  printMessages(catalogResult.warnings, "WARN");
  printMessages(syncResult.errors, "ERROR");
  printMessages(catalogResult.errors, "ERROR");

  if (syncResult.errors.length || catalogResult.errors.length) {
    console.log(`Validación fallida: ${syncResult.errors.length + catalogResult.errors.length} error(es), ${syncResult.warnings.length + catalogResult.warnings.length} warning(s).`);
    process.exit(1);
  }

  console.log(`Validación correcta: ${syncResult.count} sync JSON, ${catalogResult.songsCount} canción(es) en catálogo, ${syncResult.warnings.length + catalogResult.warnings.length} warning(s).`);
}

main().catch((error) => {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
});
