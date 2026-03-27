(() => {
  "use strict";

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function markdownToPlainText(text) {
    const source = String(text || "").replace(/\r\n?/g, "\n");
    const lines = source.split("\n");
    let inCodeFence = false;

    return lines
      .map((rawLine) => {
        if (/^\s*```/.test(rawLine)) {
          inCodeFence = !inCodeFence;
          return "";
        }

        let line = rawLine.trimEnd();
        if (!line.trim()) return "";
        if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) return "";

        if (!inCodeFence) {
          line = line
            .replace(/^\s{0,3}(?:>\s*)+/, "")
            .replace(/^\s{0,3}#{1,6}\s+/, "")
            .replace(/^\s{0,3}(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "")
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/(\*\*|__)(.*?)\1/g, "$2")
            .replace(/(\*|_)(.*?)\1/g, "$2")
            .replace(/~~(.*?)~~/g, "$1")
            .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, "$1");
        }

        return line.trim();
      })
      .join("\n");
  }

  function parseParagraphs(text) {
    return markdownToPlainText(text)
      .split(/\n\s*\n/g)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function looksLikeLegacyMarkdownParagraphs(paragraphs, lyricsOriginal) {
    if (!Array.isArray(paragraphs) || !paragraphs.length) return false;
    const original = String(lyricsOriginal || "");
    if (!original.trim()) return false;

    const joinedParagraphs = paragraphs.map((paragraph) => String(paragraph || "")).join("\n\n");
    const markdownPattern = /(^|\n)\s{0,3}(#{1,6}\s|>\s|[-+*]\s|\d+[.)]\s)|(\*\*|__|~~|`)|!?\[[^\]]+\]\([^)]+\)/m;
    if (!markdownPattern.test(joinedParagraphs)) return false;

    const reparsed = parseParagraphs(original);
    if (!reparsed.length) return false;
    return reparsed.join("\n\n") !== joinedParagraphs.trim();
  }

  function getNormalizedParagraphs(paragraphs, lyricsOriginal) {
    const rawParagraphs = Array.isArray(paragraphs)
      ? paragraphs.map((paragraph) => String(paragraph || "")).filter(Boolean)
      : [];

    if (looksLikeLegacyMarkdownParagraphs(rawParagraphs, lyricsOriginal)) {
      return {
        paragraphs: parseParagraphs(lyricsOriginal),
        migrated: true
      };
    }

    if (rawParagraphs.length) {
      return {
        paragraphs: rawParagraphs,
        migrated: false
      };
    }

    return {
      paragraphs: parseParagraphs(lyricsOriginal),
      migrated: false
    };
  }

  function inferAudioNameFromUrl(url, fallback = "audio-remoto.mp3") {
    try {
      const parsed = new URL(url, window.location.href);
      const last = parsed.pathname.split("/").pop();
      return decodeURIComponent(last || fallback);
    } catch {
      return fallback;
    }
  }

  function resolveAudioUrl(url, options = {}) {
    const { baseUrl = window.location.href } = options;
    const raw = String(url || "").trim();
    if (!raw) return "";

    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw) || raw.startsWith("//")) return raw;
    if (raw.startsWith("/")) return new URL(raw, window.location.origin).href;
    if (raw.startsWith("./") || raw.startsWith("../")) return new URL(raw, window.location.href).href;
    return new URL(raw, baseUrl).href;
  }

  function getNormalizedTimes(raw) {
    const autoTimes = Array.isArray(raw?.times?.auto) ? raw.times.auto : (Array.isArray(raw?.autoTimes) ? raw.autoTimes : []);
    const calibratedTimes = Array.isArray(raw?.times?.calibrated) ? raw.times.calibrated : (Array.isArray(raw?.calibratedTimes) ? raw.calibratedTimes : []);
    return { autoTimes, calibratedTimes };
  }

  function normalizeCatalogSong(raw, options = {}) {
    const {
      categoriesMap = new Map(),
      categoryFallbackTitle = "General",
      idFactory = () => crypto.randomUUID(),
      resolveAudio = (value) => String(value || "").trim()
    } = options;

    if (!raw || typeof raw !== "object") return null;

    const title = String(raw.title || "").trim();
    const audioUrl = resolveAudio(String(raw.audioUrl || raw.audio || "").trim());
    if (!title || !audioUrl) return null;

    const lyricsOriginal = String(raw.lyricsOriginal || raw.lyrics || "");
    const normalizedParagraphs = getNormalizedParagraphs(raw.paragraphs, lyricsOriginal);
    const { autoTimes, calibratedTimes } = getNormalizedTimes(raw);
    const categoryId = String(raw.category || raw.categoryId || "").trim() || "general";
    const categoryTitle = String(raw.categoryTitle || categoriesMap.get(categoryId)?.title || categoryFallbackTitle).trim() || categoryFallbackTitle;

    return {
      id: String(raw.id || "").trim() || idFactory(),
      title,
      audioUrl,
      lyricsOriginal,
      paragraphs: normalizedParagraphs.paragraphs,
      autoTimes,
      calibratedTimes,
      categoryId,
      categoryTitle,
      detector: {
        threshold: Number(raw.detector?.threshold ?? 0.02),
        minSilenceMs: Number(raw.detector?.minSilenceMs ?? 320),
        windowMs: Number(raw.detector?.windowMs ?? 80)
      },
      offsetSeconds: Number(raw.offsetSeconds ?? 0),
      audioMeta: raw.audioMeta || null
    };
  }

  window.KaraokeShared = {
    formatTime,
    parseParagraphs,
    getNormalizedParagraphs,
    inferAudioNameFromUrl,
    resolveAudioUrl,
    normalizeCatalogSong
  };
})();
