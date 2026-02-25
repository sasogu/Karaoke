(() => {
  "use strict";

  const CATALOG_URL = "../catalog/canciones.json";
  const APP_BASE_URL = new URL("../", window.location.href);

  const refs = {
    reloadBtn: document.getElementById("reloadBtn"),
    status: document.getElementById("status"),
    catalogView: document.getElementById("catalogView"),

    nowTitle: document.getElementById("nowTitle"),
    audio: document.getElementById("audio"),
    audioName: document.getElementById("audioName"),
    audioCategory: document.getElementById("audioCategory"),
    timeDisplay: document.getElementById("timeDisplay"),
    progress: document.getElementById("progress"),
    lyricsView: document.getElementById("lyricsView"),

    playBtn: document.getElementById("playBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    stopBtn: document.getElementById("stopBtn"),
    openFullscreenBtn: document.getElementById("openFullscreenBtn"),
    fullscreenKaraoke: document.getElementById("fullscreenKaraoke"),
    fullscreenParagraph: document.getElementById("fullscreenParagraph"),
    closeFullscreenBtn: document.getElementById("closeFullscreenBtn"),
    fsPlayBtn: document.getElementById("fsPlayBtn"),
    fsPauseBtn: document.getElementById("fsPauseBtn"),
    fsStopBtn: document.getElementById("fsStopBtn")
  };

  const state = {
    songs: [],
    currentSong: null,
    activeParagraphIndex: -1
  };

  const parseParagraphs = (text) => String(text || "")
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function inferAudioNameFromUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const last = parsed.pathname.split("/").pop();
      return decodeURIComponent(last || "audio-remoto.mp3");
    } catch {
      return "audio-remoto.mp3";
    }
  }

  function resolveAudioUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";

    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw) || raw.startsWith("//")) {
      return raw;
    }

    if (raw.startsWith("/")) {
      return new URL(raw, window.location.origin).href;
    }

    if (raw.startsWith("./") || raw.startsWith("../")) {
      return new URL(raw, window.location.href).href;
    }

    return new URL(raw, APP_BASE_URL).href;
  }

  function normalizeSong(raw, categoriesMap) {
    if (!raw || typeof raw !== "object") return null;
    const title = String(raw.title || "").trim();
    const audioUrlRaw = String(raw.audioUrl || raw.audio || "").trim();
    const audioUrl = resolveAudioUrl(audioUrlRaw);
    if (!title || !audioUrl) return null;

    const lyricsOriginal = String(raw.lyricsOriginal || raw.lyrics || "");
    const paragraphs = Array.isArray(raw.paragraphs) && raw.paragraphs.length
      ? raw.paragraphs.map((p) => String(p || "")).filter(Boolean)
      : parseParagraphs(lyricsOriginal);

    const autoTimes = Array.isArray(raw.times?.auto) ? raw.times.auto : (Array.isArray(raw.autoTimes) ? raw.autoTimes : []);
    const calibratedTimes = Array.isArray(raw.times?.calibrated) ? raw.times.calibrated : (Array.isArray(raw.calibratedTimes) ? raw.calibratedTimes : []);

    const categoryId = String(raw.category || raw.categoryId || "").trim() || "general";
    const categoryTitle = String(raw.categoryTitle || categoriesMap.get(categoryId)?.title || "General").trim() || "General";

    return {
      id: String(raw.id || "").trim() || crypto.randomUUID(),
      title,
      audioUrl,
      paragraphs,
      autoTimes,
      calibratedTimes,
      categoryId,
      categoryTitle,
      audioMeta: raw.audioMeta || null
    };
  }

  function getEffectiveTimes(song) {
    if (!song) return [];
    return song.calibratedTimes?.length ? song.calibratedTimes : (song.autoTimes || []);
  }

  function updateStatus(text) {
    refs.status.textContent = text;
  }

  function renderCatalog() {
    if (!state.songs.length) {
      refs.catalogView.innerHTML = '<p class="empty">Aún no hay canciones publicadas.</p>';
      return;
    }

    refs.catalogView.innerHTML = "";
    const grouped = new Map();

    state.songs.forEach((song) => {
      const key = `${song.categoryId}::${song.categoryTitle}`;
      if (!grouped.has(key)) grouped.set(key, { title: song.categoryTitle, songs: [] });
      grouped.get(key).songs.push(song);
    });

    Array.from(grouped.values())
      .sort((a, b) => a.title.localeCompare(b.title, "es"))
      .forEach((group) => {
        const title = document.createElement("h3");
        title.className = "remote-cat-title";
        title.textContent = group.title;
        refs.catalogView.appendChild(title);

        group.songs
          .sort((a, b) => a.title.localeCompare(b.title, "es"))
          .forEach((song) => {
            const hasTimes = getEffectiveTimes(song).length > 0;
            const item = document.createElement("article");
            item.className = "remote-song-item";
            item.innerHTML = `
              <div>
                <div class="playlist-item-title">${song.title}</div>
                <div class="playlist-item-meta">${inferAudioNameFromUrl(song.audioUrl)} · ${song.paragraphs.length} párrafo(s) · ${hasTimes ? "sincronizado" : "sin sincronizar"}</div>
              </div>
              <div class="remote-song-actions">
                <button class="secondary" data-action="load" data-id="${song.id}">Cargar</button>
                <button data-action="play" data-id="${song.id}">Cargar y reproducir</button>
              </div>
            `;
            refs.catalogView.appendChild(item);
          });
      });
  }

  function buildLyrics() {
    const song = state.currentSong;
    if (!song || !song.paragraphs.length) {
      refs.lyricsView.innerHTML = '<p class="empty">Selecciona una canción publicada para ver su letra.</p>';
      refs.progress.textContent = "0/0";
      state.activeParagraphIndex = -1;
      return;
    }

    refs.lyricsView.innerHTML = "";
    song.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.className = "paragraph";
      p.textContent = text;
      refs.lyricsView.appendChild(p);
    });

    state.activeParagraphIndex = -1;
    updateProgress();
    updateHighlight();
  }

  function getCurrentParagraphIndex() {
    const song = state.currentSong;
    if (!song) return 0;

    const times = getEffectiveTimes(song);
    if (!times.length) return 0;

    const currentTime = refs.audio.currentTime;
    let idx = 0;
    for (let i = 0; i < times.length; i++) {
      if (currentTime >= times[i]) idx = i;
      else break;
    }

    return Math.max(0, Math.min(idx, song.paragraphs.length - 1));
  }

  function updateProgress() {
    const song = state.currentSong;
    if (!song || !song.paragraphs.length) {
      refs.progress.textContent = "0/0";
      return;
    }
    const idx = getCurrentParagraphIndex();
    refs.progress.textContent = `${Math.min(idx + 1, song.paragraphs.length)}/${song.paragraphs.length}`;
  }

  function updateHighlight() {
    const song = state.currentSong;
    if (!song) return;

    const paragraphs = refs.lyricsView.querySelectorAll(".paragraph");
    if (!paragraphs.length) return;

    const currentIdx = getCurrentParagraphIndex();
    if (state.activeParagraphIndex >= 0 && paragraphs[state.activeParagraphIndex]) {
      paragraphs[state.activeParagraphIndex].classList.remove("active");
    }

    if (paragraphs[currentIdx]) {
      paragraphs[currentIdx].classList.add("active");
      if (currentIdx !== state.activeParagraphIndex) {
        paragraphs[currentIdx].scrollIntoView({ behavior: "smooth", block: currentIdx === 0 ? "start" : "center" });
      }
    }

    state.activeParagraphIndex = currentIdx;
    renderFullscreenParagraph();
  }

  function isFullscreenOpen() {
    return refs.fullscreenKaraoke && !refs.fullscreenKaraoke.hidden;
  }

  function renderFullscreenParagraph() {
    if (!refs.fullscreenParagraph) return;

    const song = state.currentSong;
    if (!song || !song.paragraphs.length) {
      refs.fullscreenParagraph.textContent = "Selecciona una canción publicada para ver su letra.";
      return;
    }

    const currentIdx = getCurrentParagraphIndex();
    const currentText = song.paragraphs[currentIdx] || "";
    const nextText = song.paragraphs[currentIdx + 1] || "";

    refs.fullscreenParagraph.innerHTML = "";

    const current = document.createElement("div");
    current.className = "fullscreen-current";
    current.textContent = currentText;
    refs.fullscreenParagraph.appendChild(current);

    if (nextText) {
      const next = document.createElement("div");
      next.className = "fullscreen-next";
      next.textContent = nextText;
      refs.fullscreenParagraph.appendChild(next);
    }
  }

  async function openFullscreen() {
    if (!refs.fullscreenKaraoke || isFullscreenOpen()) return;
    refs.fullscreenKaraoke.hidden = false;
    renderFullscreenParagraph();

    if (!document.fullscreenElement && refs.fullscreenKaraoke.requestFullscreen) {
      try {
        await refs.fullscreenKaraoke.requestFullscreen();
      } catch {
        // no-op
      }
    }
  }

  async function closeFullscreen() {
    if (!refs.fullscreenKaraoke) return;
    refs.fullscreenKaraoke.hidden = true;

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // no-op
      }
    }
  }

  async function toggleFullscreen() {
    if (isFullscreenOpen()) {
      await closeFullscreen();
      return;
    }
    await openFullscreen();
  }

  function updateTimeDisplay() {
    refs.timeDisplay.textContent = `${formatTime(refs.audio.currentTime)} / ${formatTime(refs.audio.duration)}`;
  }

  async function loadSongById(id, autoplay) {
    const song = state.songs.find((entry) => entry.id === id);
    if (!song) return;

    state.currentSong = song;
    refs.nowTitle.textContent = song.title;
    refs.audio.src = song.audioUrl;
    refs.audioName.textContent = song.audioMeta?.name || inferAudioNameFromUrl(song.audioUrl);
    refs.audioCategory.textContent = song.categoryTitle;

    buildLyrics();
    updateTimeDisplay();
    renderFullscreenParagraph();

    if (autoplay) {
      try {
        await refs.audio.play();
      } catch {
        // no-op
      }
    }
  }

  async function loadCatalog() {
    updateStatus("Cargando...");

    try {
      const response = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const songsRaw = Array.isArray(payload) ? payload : (Array.isArray(payload?.songs) ? payload.songs : null);
      if (!songsRaw) throw new Error("Formato de catálogo inválido");

      const categoriesMap = new Map();
      if (Array.isArray(payload?.categories)) {
        payload.categories.forEach((entry) => {
          if (!entry || typeof entry !== "object") return;
          const id = String(entry.id || entry.slug || "").trim();
          const title = String(entry.title || entry.name || "").trim();
          if (!id || !title) return;
          categoriesMap.set(id, { id, title });
        });
      }

      state.songs = songsRaw.map((raw) => normalizeSong(raw, categoriesMap)).filter(Boolean);
      renderCatalog();
      updateStatus(`${state.songs.length} publicadas`);

      const firstSong = state.songs[0];
      if (firstSong && !state.currentSong) {
        await loadSongById(firstSong.id, false);
      }
    } catch (error) {
      updateStatus("Error");
      if (!state.songs.length) {
        refs.catalogView.innerHTML = `<p class="empty">No se pudo cargar el catálogo: ${error.message}</p>`;
      }
    }
  }

  function attachEvents() {
    refs.reloadBtn?.addEventListener("click", loadCatalog);

    refs.catalogView?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;

      if (action === "load") {
        await loadSongById(id, false);
        return;
      }

      if (action === "play") {
        await loadSongById(id, true);
      }
    });

    refs.playBtn?.addEventListener("click", async () => {
      try {
        await refs.audio.play();
      } catch {
        // no-op
      }
    });

    refs.pauseBtn?.addEventListener("click", () => refs.audio.pause());

    refs.stopBtn?.addEventListener("click", () => {
      refs.audio.pause();
      refs.audio.currentTime = 0;
      updateTimeDisplay();
      updateProgress();
      updateHighlight();
    });

    refs.openFullscreenBtn?.addEventListener("click", toggleFullscreen);
    refs.closeFullscreenBtn?.addEventListener("click", closeFullscreen);
    refs.fsPlayBtn?.addEventListener("click", async () => {
      try {
        await refs.audio.play();
      } catch {
        // no-op
      }
    });
    refs.fsPauseBtn?.addEventListener("click", () => refs.audio.pause());
    refs.fsStopBtn?.addEventListener("click", () => {
      refs.audio.pause();
      refs.audio.currentTime = 0;
      updateTimeDisplay();
      updateProgress();
      updateHighlight();
    });

    refs.audio?.addEventListener("timeupdate", () => {
      updateTimeDisplay();
      updateProgress();
      updateHighlight();
    });

    refs.audio?.addEventListener("loadedmetadata", () => {
      updateTimeDisplay();
      updateProgress();
      updateHighlight();
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement !== refs.fullscreenKaraoke && refs.fullscreenKaraoke) {
        refs.fullscreenKaraoke.hidden = true;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (!isFullscreenOpen()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeFullscreen();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (refs.audio.paused) {
          refs.audio.play().catch(() => {});
        } else {
          refs.audio.pause();
        }
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        refs.audio.pause();
        refs.audio.currentTime = 0;
        updateTimeDisplay();
        updateProgress();
        updateHighlight();
      }
    });
  }

  attachEvents();
  loadCatalog();
})();
