(() => {
  "use strict";

  const CATALOG_URL = "../catalog/canciones.json";
  const APP_BASE_URL = new URL("../", window.location.href);
  const LS_LANG_KEY = "karaokeLanguageV1";

  const I18N = {
    es: {
      document_title: "Canciones publicadas · EduKaraoke",
      language_label: "Idioma",
      page_title: "Canciones publicadas",
      page_subtitle: "Listado público generado desde <code>catalog/canciones.json</code>.",
      reload_catalog: "Recargar catálogo",
      status_loading: "Cargando...",
      status_error: "Error",
      status_ready: "{count} publicadas",
      catalog_title: "Catálogo",
      filter_label: "Filtrar:",
      filter_all: "Todas",
      catalog_loading: "Cargando canciones publicadas...",
      catalog_empty: "Aún no hay canciones publicadas.",
      catalog_filtered_empty: "No hay canciones para este filtro.",
      now_title_default: "Selecciona una canción",
      lyrics_empty: "Selecciona una canción publicada para ver su letra.",
      fullscreen_open: "Pantalla completa",
      close: "Cerrar",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      meta_file: "Archivo:",
      meta_category: "Categoría:",
      meta_time: "Tiempo:",
      paragraph_count: "{count} párrafo(s)",
      sync_yes: "sincronizado",
      sync_no: "sin sincronizar",
      btn_load: "Cargar",
      btn_load_play: "Cargar y reproducir",
      btn_share: "Compartir",
      share_success: "Listo para compartir",
      share_copied: "Enlace copiado",
      share_manual_copy: "Copia este enlace para compartir:",
      share_select_song: "Selecciona una canción para compartir",
      catalog_invalid: "Formato de catálogo inválido",
      catalog_load_error: "No se pudo cargar el catálogo: {error}"
    },
    val: {
      document_title: "Cançons publicades · EduKaraoke",
      language_label: "Idioma",
      page_title: "Cançons publicades",
      page_subtitle: "Llistat públic generat des de <code>catalog/canciones.json</code>.",
      reload_catalog: "Recarregar catàleg",
      status_loading: "Carregant...",
      status_error: "Error",
      status_ready: "{count} publicades",
      catalog_title: "Catàleg",
      filter_label: "Filtrar:",
      filter_all: "Totes",
      catalog_loading: "Carregant cançons publicades...",
      catalog_empty: "Encara no hi ha cançons publicades.",
      catalog_filtered_empty: "No hi ha cançons per a este filtre.",
      now_title_default: "Selecciona una cançó",
      lyrics_empty: "Selecciona una cançó publicada per a vore la lletra.",
      fullscreen_open: "Pantalla completa",
      close: "Tancar",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      meta_file: "Arxiu:",
      meta_category: "Categoria:",
      meta_time: "Temps:",
      paragraph_count: "{count} paràgraf(s)",
      sync_yes: "sincronitzat",
      sync_no: "sense sincronitzar",
      btn_load: "Carregar",
      btn_load_play: "Carregar i reproduir",
      btn_share: "Compartir",
      share_success: "Llest per a compartir",
      share_copied: "Enllaç copiat",
      share_manual_copy: "Copia este enllaç per a compartir:",
      share_select_song: "Selecciona una cançó per a compartir",
      catalog_invalid: "Format de catàleg invàlid",
      catalog_load_error: "No s'ha pogut carregar el catàleg: {error}"
    },
    en: {
      document_title: "Published songs · EduKaraoke",
      language_label: "Language",
      page_title: "Published songs",
      page_subtitle: "Public list generated from <code>catalog/canciones.json</code>.",
      reload_catalog: "Reload catalog",
      status_loading: "Loading...",
      status_error: "Error",
      status_ready: "{count} published",
      catalog_title: "Catalog",
      filter_label: "Filter:",
      filter_all: "All",
      catalog_loading: "Loading published songs...",
      catalog_empty: "No published songs yet.",
      catalog_filtered_empty: "No songs for this filter.",
      now_title_default: "Select a song",
      lyrics_empty: "Select a published song to view lyrics.",
      fullscreen_open: "Fullscreen",
      close: "Close",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      meta_file: "File:",
      meta_category: "Category:",
      meta_time: "Time:",
      paragraph_count: "{count} paragraph(s)",
      sync_yes: "synced",
      sync_no: "not synced",
      btn_load: "Load",
      btn_load_play: "Load & play",
      btn_share: "Share",
      share_success: "Ready to share",
      share_copied: "Link copied",
      share_manual_copy: "Copy this link to share:",
      share_select_song: "Select a song to share",
      catalog_invalid: "Invalid catalog format",
      catalog_load_error: "Could not load catalog: {error}"
    }
  };

  let currentLanguage = "es";

  const refs = {
    reloadBtn: document.getElementById("reloadBtn"),
    shareBtn: document.getElementById("shareBtn"),
    status: document.getElementById("status"),
    catalogFilter: document.getElementById("catalogFilter"),
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
    openFullscreenInlineBtn: document.getElementById("openFullscreenInlineBtn"),
    openFullscreenBtn: document.getElementById("openFullscreenBtn"),
    fullscreenKaraoke: document.getElementById("fullscreenKaraoke"),
    fullscreenParagraph: document.getElementById("fullscreenParagraph"),
    closeFullscreenBtn: document.getElementById("closeFullscreenBtn"),
    fsPlayBtn: document.getElementById("fsPlayBtn"),
    fsPauseBtn: document.getElementById("fsPauseBtn"),
    fsStopBtn: document.getElementById("fsStopBtn"),
    languageSwitch: document.getElementById("languageSwitch")
  };

  const state = {
    songs: [],
    currentSong: null,
    activeParagraphIndex: -1,
    selectedCategoryId: "",
    statusMessageTimer: 0,
    startupRequest: null
  };

  const parseParagraphs = (text) => String(text || "")
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  function t(key, params = {}) {
    const bundle = I18N[currentLanguage] || I18N.es;
    const template = bundle[key] || I18N.es[key] || key;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`));
  }

  function getInitialLanguage() {
    const stored = String(localStorage.getItem(LS_LANG_KEY) || "").trim().toLowerCase();
    if (stored === "es" || stored === "val" || stored === "en") return stored;
    return "es";
  }

  function parseBooleanParam(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  function getStartupRequestFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const songId = String(params.get("song") || params.get("id") || "").trim();
    if (!songId) return null;

    const fullscreen = parseBooleanParam(params.get("fullscreen")) || parseBooleanParam(params.get("fs"));
    const hasAutoplayParam = params.has("autoplay");
    const autoplay = hasAutoplayParam ? parseBooleanParam(params.get("autoplay")) : fullscreen;

    return {
      songId,
      fullscreen,
      autoplay
    };
  }

  function setLanguage(lang) {
    if (!I18N[lang]) return;
    currentLanguage = lang;
    localStorage.setItem(LS_LANG_KEY, lang);
    applyI18n();
    renderCatalog();
    updateNowTitle();
    buildLyrics();
    renderFullscreenParagraph();
    updateStatus(state.songs.length ? t("status_ready", { count: state.songs.length }) : t("status_loading"));
  }

  function updateLanguageButtons() {
    refs.languageSwitch?.querySelectorAll(".lang-btn").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("active", button.dataset.lang === currentLanguage);
    });
  }

  function applyI18n() {
    document.title = t("document_title");

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      if (key === "page_subtitle") {
        node.innerHTML = t(key);
      } else {
        node.textContent = t(key);
      }
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria-label");
      if (!key) return;
      node.setAttribute("aria-label", t(key));
    });

    updateLanguageButtons();
  }

  function updateNowTitle() {
    refs.nowTitle.textContent = state.currentSong?.title || t("now_title_default");
    updateShareButtonState();
  }

  function updateShareButtonState() {
    if (!refs.shareBtn) return;
    refs.shareBtn.disabled = !Boolean(state.currentSong?.id);
  }

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

  function getReadyStatusText() {
    return state.songs.length ? t("status_ready", { count: state.songs.length }) : t("status_loading");
  }

  function flashStatus(text, delayMs = 2400) {
    updateStatus(text);
    if (state.statusMessageTimer) {
      window.clearTimeout(state.statusMessageTimer);
      state.statusMessageTimer = 0;
    }

    state.statusMessageTimer = window.setTimeout(() => {
      updateStatus(getReadyStatusText());
      state.statusMessageTimer = 0;
    }, delayMs);
  }

  function buildShareUrl(songId) {
    const url = new URL(window.location.href);
    url.searchParams.set("song", songId);
    url.searchParams.set("fullscreen", "1");
    url.searchParams.set("autoplay", "1");
    url.hash = "";
    return url.toString();
  }

  async function shareSongById(songId) {
    const song = state.songs.find((entry) => entry.id === songId);
    if (!song) return;

    const shareUrl = buildShareUrl(song.id);
    const shareData = {
      title: song.title,
      text: song.title,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        flashStatus(t("share_success"));
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        flashStatus(t("share_copied"));
        return;
      } catch {
        // no-op
      }
    }

    window.prompt(t("share_manual_copy"), shareUrl);
  }

  function renderCatalogFilter() {
    if (!refs.catalogFilter) return;

    const previousSelected = state.selectedCategoryId || refs.catalogFilter.value || "";
    const categories = new Map();

    state.songs.forEach((song) => {
      const id = String(song.categoryId || "general").trim() || "general";
      const title = String(song.categoryTitle || "General").trim() || "General";
      if (!categories.has(id)) categories.set(id, title);
    });

    refs.catalogFilter.innerHTML = '<option value="">Todas</option>';
    refs.catalogFilter.innerHTML = `<option value="">${t("filter_all")}</option>`;

    Array.from(categories.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .forEach(([id, title]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = title;
        refs.catalogFilter.appendChild(option);
      });

    state.selectedCategoryId = categories.has(previousSelected) ? previousSelected : "";
    refs.catalogFilter.value = state.selectedCategoryId;
  }

  function renderCatalog() {
    if (!state.songs.length) {
      refs.catalogView.innerHTML = `<p class="empty">${t("catalog_empty")}</p>`;
      if (refs.catalogFilter) refs.catalogFilter.innerHTML = `<option value="">${t("filter_all")}</option>`;
      return;
    }

    renderCatalogFilter();

    const visibleSongs = state.selectedCategoryId
      ? state.songs.filter((song) => song.categoryId === state.selectedCategoryId)
      : state.songs;

    if (!visibleSongs.length) {
      refs.catalogView.innerHTML = `<p class="empty">${t("catalog_filtered_empty")}</p>`;
      return;
    }

    refs.catalogView.innerHTML = "";
    const grouped = new Map();

    visibleSongs.forEach((song) => {
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
                <div class="playlist-item-meta">${inferAudioNameFromUrl(song.audioUrl)} · ${t("paragraph_count", { count: song.paragraphs.length })} · ${hasTimes ? t("sync_yes") : t("sync_no")}</div>
              </div>
              <div class="remote-song-actions">
                <button class="secondary" data-action="load" data-id="${song.id}">${t("btn_load")}</button>
                <button data-action="play" data-id="${song.id}">${t("btn_load_play")}</button>
              </div>
            `;
            refs.catalogView.appendChild(item);
          });
      });
  }

  function buildLyrics() {
    const song = state.currentSong;
    if (!song || !song.paragraphs.length) {
      refs.lyricsView.innerHTML = `<p class="empty">${t("lyrics_empty")}</p>`;
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
      refs.fullscreenParagraph.textContent = t("lyrics_empty");
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

  async function tryAutoplayAudio() {
    try {
      await refs.audio.play();
      return true;
    } catch {
      const retry = () => {
        refs.audio.play().catch(() => {});
      };
      refs.audio.addEventListener("canplay", retry, { once: true });
      refs.audio.addEventListener("loadeddata", retry, { once: true });
      return false;
    }
  }

  async function loadSongById(id, autoplay) {
    const song = state.songs.find((entry) => entry.id === id);
    if (!song) return;

    state.currentSong = song;
    updateNowTitle();
    refs.audio.src = song.audioUrl;
    refs.audio.autoplay = Boolean(autoplay);
    refs.audioName.textContent = song.audioMeta?.name || inferAudioNameFromUrl(song.audioUrl);
    refs.audioCategory.textContent = song.categoryTitle;

    buildLyrics();
    updateTimeDisplay();
    renderFullscreenParagraph();

    if (autoplay) {
      await tryAutoplayAudio();
    }
  }

  async function handleStartupRequest() {
    const request = state.startupRequest;
    if (!request?.songId) return false;

    const targetSong = state.songs.find((song) => song.id === request.songId);
    state.startupRequest = null;
    if (!targetSong) return false;

    await loadSongById(targetSong.id, false);
    if (request.fullscreen) {
      await openFullscreen();
    }
    if (request.autoplay) {
      await tryAutoplayAudio();
    }

    return true;
  }

  async function loadCatalog() {
    updateStatus(t("status_loading"));

    try {
      const response = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const songsRaw = Array.isArray(payload) ? payload : (Array.isArray(payload?.songs) ? payload.songs : null);
      if (!songsRaw) throw new Error(t("catalog_invalid"));

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
      updateStatus(t("status_ready", { count: state.songs.length }));

      const startupHandled = await handleStartupRequest();
      if (startupHandled) return;

      const firstSong = state.songs[0];
      if (firstSong && !state.currentSong) {
        await loadSongById(firstSong.id, false);
      }
    } catch (error) {
      updateStatus(t("status_error"));
      if (!state.songs.length) {
        refs.catalogView.innerHTML = `<p class="empty">${t("catalog_load_error", { error: error.message })}</p>`;
      }
    }
  }

  function attachEvents() {
    refs.reloadBtn?.addEventListener("click", loadCatalog);
    refs.languageSwitch?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const lang = String(target.dataset.lang || "").trim();
      if (!lang) return;
      setLanguage(lang);
    });
    refs.catalogFilter?.addEventListener("change", () => {
      state.selectedCategoryId = refs.catalogFilter.value || "";
      renderCatalog();
    });

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
        return;
      }
    });

    refs.shareBtn?.addEventListener("click", async () => {
      const songId = state.currentSong?.id;
      if (!songId) {
        flashStatus(t("share_select_song"));
        return;
      }
      await shareSongById(songId);
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
    refs.openFullscreenInlineBtn?.addEventListener("click", toggleFullscreen);
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

  currentLanguage = getInitialLanguage();
  state.startupRequest = getStartupRequestFromUrl();
  applyI18n();
  updateNowTitle();

  attachEvents();
  loadCatalog();
})();
