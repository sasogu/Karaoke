(() => {
  "use strict";

  const LS_KEY = "karaokeProjectStateV1";
  const DB_NAME = "karaokeDB";
  const DB_VERSION = 1;
  const STORE_AUDIOS = "audios";
  const PROJECT_VERSION = "1.0.0";
  const APP_CACHE_VERSION = "1.0.1";

  const state = {
    lyricsOriginal: "",
    paragraphs: [],
    autoTimes: [],
    calibratedTimes: [],
    playlist: [],
    mode: "auto",
    detector: {
      threshold: 0.02,
      minSilenceMs: 320,
      windowMs: 80
    },
    offsetSeconds: 0,
    audioMeta: null
  };

  const $ = (id) => document.getElementById(id);

  const refs = {
    audioFile: $("audioFile"),
    audio: $("audio"),
    audioName: $("audioName"),
    audioType: $("audioType"),
    timeDisplay: $("timeDisplay"),
    audioRestoreHint: $("audioRestoreHint"),

    lyricsInput: $("lyricsInput"),
    applyLyricsBtn: $("applyLyricsBtn"),
    paragraphCount: $("paragraphCount"),

    modeAutoBtn: $("modeAutoBtn"),
    modeCalibBtn: $("modeCalibBtn"),
    modeStatus: $("modeStatus"),
    thresholdInput: $("thresholdInput"),
    minSilenceInput: $("minSilenceInput"),
    windowMsInput: $("windowMsInput"),
    offsetInput: $("offsetInput"),
    autoSyncBtn: $("autoSyncBtn"),
    undoMarkerBtn: $("undoMarkerBtn"),
    clearTimesBtn: $("clearTimesBtn"),
    nextPending: $("nextPending"),

    exportBtn: $("exportBtn"),
    importFile: $("importFile"),
    deleteStoredAudioBtn: $("deleteStoredAudioBtn"),

    openFullscreenBtn: $("openFullscreenBtn"),
    fullscreenKaraoke: $("fullscreenKaraoke"),
    fullscreenParagraph: $("fullscreenParagraph"),
    closeFullscreenBtn: $("closeFullscreenBtn"),
    fsPlayBtn: $("fsPlayBtn"),
    fsPauseBtn: $("fsPauseBtn"),
    fsStopBtn: $("fsStopBtn"),

    playlistSelect: $("playlistSelect"),
    playlistTitleInput: $("playlistTitleInput"),
    addToPlaylistBtn: $("addToPlaylistBtn"),
    clearPlaylistBtn: $("clearPlaylistBtn"),
    playlistCount: $("playlistCount"),
    playlistView: $("playlistView"),

    pwaVersion: $("pwaVersion"),

    progressIndicator: $("progressIndicator"),
    karaokeView: $("karaokeView"),
    message: $("message")
  };

  let audioCtx = null;
  let sourceNode = null;
  let analyser = null;
  let analysisTimer = null;
  let currentAudioObjectUrl = null;
  let activeParagraphIndex = -1;

  let db = null;

  // ==================== IndexedDB ====================
  // 1) open + onupgradeneeded
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_AUDIOS)) {
          database.createObjectStore(STORE_AUDIOS, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onerror = () => reject(request.error || new Error("No se pudo abrir IndexedDB"));
    });
  }

  function audioKey(meta) {
    return meta ? `${meta.name}::${meta.size}` : null;
  }

  // 2) transactions readwrite/readonly
  function saveAudioBlob(meta, blob) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return reject(new Error("Metadatos de audio inválidos"));

      const tx = db.transaction([STORE_AUDIOS], "readwrite");
      const store = tx.objectStore(STORE_AUDIOS);

      store.put({
        id,
        name: meta.name,
        type: meta.type,
        size: meta.size,
        duration: meta.duration || 0,
        blob,
        savedAt: Date.now()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Error al guardar audio"));
    });
  }

  function getAudioBlob(meta) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return resolve(null);

      const tx = db.transaction([STORE_AUDIOS], "readonly");
      const store = tx.objectStore(STORE_AUDIOS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Error al leer audio"));
    });
  }

  function deleteAudioBlob(meta) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return resolve();

      const tx = db.transaction([STORE_AUDIOS], "readwrite");
      tx.objectStore(STORE_AUDIOS).delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("No se pudo eliminar el audio"));
    });
  }

  function displayNotification(message, isError = false) {
    refs.message.textContent = message;
    refs.message.style.borderColor = isError ? "#ef4444" : "#374151";
    refs.message.classList.add("show");
    setTimeout(() => refs.message.classList.remove("show"), 2600);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showMessage("Nueva versión disponible. Recarga para aplicar la actualización.");
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        showMessage("Aplicación actualizada a la nueva versión de caché.");
      });
    } catch (err) {
      showMessage(`No se pudo registrar la PWA: ${err.message}`, true);
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function parseParagraphs(text) {
    return text
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  function normalizePlaylistItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    if (!id) return null;

    return {
      id,
      title: String(raw.title || "Tema sin título"),
      createdAt: Number(raw.createdAt || Date.now()),
      audioMeta: raw.audioMeta || null,
      lyricsOriginal: String(raw.lyricsOriginal || ""),
      paragraphs: Array.isArray(raw.paragraphs) ? raw.paragraphs : [],
      autoTimes: Array.isArray(raw.autoTimes) ? raw.autoTimes : [],
      calibratedTimes: Array.isArray(raw.calibratedTimes) ? raw.calibratedTimes : [],
      detector: {
        threshold: Number(raw.detector?.threshold ?? 0.02),
        minSilenceMs: Number(raw.detector?.minSilenceMs ?? 320),
        windowMs: Number(raw.detector?.windowMs ?? 80)
      },
      offsetSeconds: Number(raw.offsetSeconds ?? 0)
    };
  }

  function getEffectiveTimes() {
    return state.calibratedTimes.length ? state.calibratedTimes : state.autoTimes;
  }

  function saveStateToLocalStorage() {
    const payload = {
      version: PROJECT_VERSION,
      lyricsOriginal: state.lyricsOriginal,
      paragraphs: state.paragraphs,
      autoTimes: state.autoTimes,
      calibratedTimes: state.calibratedTimes,
      playlist: state.playlist,
      detector: state.detector,
      offsetSeconds: state.offsetSeconds,
      audioMeta: state.audioMeta
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }

  function loadStateFromLocalStorage() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      state.lyricsOriginal = data.lyricsOriginal || "";
      state.paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
      state.autoTimes = Array.isArray(data.autoTimes) ? data.autoTimes : [];
      state.calibratedTimes = Array.isArray(data.calibratedTimes) ? data.calibratedTimes : [];
      state.playlist = Array.isArray(data.playlist)
        ? data.playlist.map(normalizePlaylistItem).filter(Boolean)
        : [];
      state.detector = {
        threshold: Number(data.detector?.threshold ?? 0.02),
        minSilenceMs: Number(data.detector?.minSilenceMs ?? 320),
        windowMs: Number(data.detector?.windowMs ?? 80)
      };
      state.offsetSeconds = Number(data.offsetSeconds ?? 0);
      state.audioMeta = data.audioMeta || null;
    } catch {
      showMessage("Estado previo inválido en localStorage.", true);
    }
  }

  function renderLyricsUI() {
    refs.lyricsInput.value = state.lyricsOriginal;
    refs.paragraphCount.textContent = `${state.paragraphs.length} párrafo(s)`;
  }

  function getCurrentParagraphIndex() {
    const times = getEffectiveTimes();
    if (!state.paragraphs.length || !times.length) return 0;
    const t = refs.audio.currentTime;
    let idx = 0;
    for (let i = 0; i < times.length; i++) {
      if (t >= times[i]) idx = i;
      else break;
    }
    return Math.max(0, Math.min(idx, state.paragraphs.length - 1));
  }

  function buildKaraokeParagraphs() {
    refs.karaokeView.innerHTML = "";
    state.paragraphs.forEach((text) => {
      const p = document.createElement("p");
      p.className = "paragraph";
      p.textContent = text;
      refs.karaokeView.appendChild(p);
    });
    activeParagraphIndex = -1;
  }

  function updateKaraokeDisplay(forceUpdate = false) {
    if (!state.paragraphs.length) {
      displayEmptyKaraokeMessage();
      return;
    }

    if (forceUpdate) buildKaraokeParagraphs();
    if (shouldRebuildKaraokeView()) {
      buildKaraokeParagraphs();
      forceUpdate = true;
    }

    const currentIdx = getCurrentParagraphIndex();
    updateProgressIndicator(currentIdx);
    if (!forceUpdate && currentIdx === activeParagraphIndex) return;

    highlightCurrentParagraph(currentIdx);
    activeParagraphIndex = currentIdx;
    renderFullscreenParagraph();
  }

  function displayEmptyKaraokeMessage() {
    if (!refs.karaokeView.querySelector(".empty")) {
      refs.karaokeView.innerHTML = `<p class="empty">Aún no hay párrafos.</p>`;
    }
    refs.progressIndicator.textContent = "0/0";
    activeParagraphIndex = -1;
    renderFullscreenParagraph();
  }

  function shouldRebuildKaraokeView() {
    return refs.karaokeView.children.length !== state.paragraphs.length ||
           refs.karaokeView.querySelector(".empty");
  }

  function updateProgressIndicator(currentIdx) {
    refs.progressIndicator.textContent = `${Math.min(currentIdx + 1, state.paragraphs.length)}/${state.paragraphs.length}`;
  }

  function highlightCurrentParagraph(currentIdx) {
    const paragraphs = refs.karaokeView.querySelectorAll(".paragraph");
    if (activeParagraphIndex >= 0 && paragraphs[activeParagraphIndex]) {
      paragraphs[activeParagraphIndex].classList.remove("active");
    }
    if (paragraphs[currentIdx]) {
      paragraphs[currentIdx].classList.add("active");
      paragraphs[currentIdx].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function buildDefaultPlaylistTitle() {
    const base = state.audioMeta?.name || "Tema";
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return `${base} · ${stamp}`;
  }

  function renderPlaylist() {
    refs.playlistCount.textContent = `${state.playlist.length} playlist(s)`;

    if (!state.playlist.length) {
      refs.playlistView.innerHTML = `<p class="empty">Aún no hay playlists guardadas.</p>`;
      refs.playlistSelect.innerHTML = `<option value="">Nueva playlist...</option>`;
      return;
    }

    refs.playlistView.innerHTML = "";
    refs.playlistSelect.innerHTML = `<option value="">Nueva playlist...</option>`;

    state.playlist.forEach((playlist) => {
      const option = document.createElement("option");
      option.value = playlist.id;
      option.textContent = playlist.title;
      refs.playlistSelect.appendChild(option);

      playlist.items.forEach((item) => {
        const wrapper = document.createElement("article");
        wrapper.className = "playlist-item";

        const date = new Date(item.createdAt || Date.now());
        const hasTimes = (item.calibratedTimes?.length || item.autoTimes?.length || 0) > 0;
        wrapper.innerHTML = `
          <div class="playlist-item-main">
            <div>
              <div class="playlist-item-title">${item.title}</div>
              <div class="playlist-item-meta">${item.audioMeta?.name || "sin audio"} · ${item.paragraphs.length} párrafo(s) · ${hasTimes ? "sincronizado" : "sin sincronizar"}</div>
              <div class="playlist-item-meta">${date.toLocaleString("es-ES")}</div>
            </div>
            <div class="playlist-item-actions">
              <button class="secondary" data-action="load" data-id="${item.id}">Cargar</button>
              <button data-action="play" data-id="${item.id}">Cargar y reproducir</button>
              <button class="danger" data-action="delete" data-id="${item.id}">Eliminar</button>
            </div>
          </div>
        `;

        refs.playlistView.appendChild(wrapper);
      });
    });
  }

  function addCurrentToPlaylist() {
    if (!state.audioMeta) return showMessage("Primero selecciona un audio.", true);
    if (!state.paragraphs.length) return showMessage("Primero agrega la letra por párrafos.", true);

    const times = getEffectiveTimes();
    if (!times.length) {
      return showMessage("Primero sincroniza la letra (auto o calibración).", true);
    }

    const selectedPlaylist = refs.playlistSelect.value;
    let playlist = state.playlist.find(p => p.id === selectedPlaylist);

    if (!playlist) {
      const customTitle = refs.playlistTitleInput.value.trim();
      const id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      playlist = {
        id,
        title: customTitle || buildDefaultPlaylistTitle(),
        items: []
      };
      state.playlist.push(playlist);
    }

    const snapshot = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      audioMeta: state.audioMeta ? { ...state.audioMeta } : null,
      lyricsOriginal: state.lyricsOriginal,
      paragraphs: [...state.paragraphs],
      autoTimes: [...state.autoTimes],
      calibratedTimes: [...state.calibratedTimes],
      detector: { ...state.detector },
      offsetSeconds: state.offsetSeconds
    };

    playlist.items.unshift(snapshot);
    saveStateToLocalStorage();
    renderPlaylist();
    refs.playlistTitleInput.value = "";
    showMessage("Tema añadido a la playlist.");
  }

  function deletePlaylistItem(id) {
    const before = state.playlist.length;
    state.playlist = state.playlist.filter((item) => item.id !== id);
    if (state.playlist.length === before) return;
    saveStateToLocalStorage();
    renderPlaylist();
    showMessage("Tema eliminado de playlist.");
  }

  function clearPlaylist() {
    if (!state.playlist.length) return showMessage("La playlist ya está vacía.");
    state.playlist = [];
    saveStateToLocalStorage();
    renderPlaylist();
    showMessage("Playlist vaciada.");
  }

  function renderFullscreenParagraph() {
    if (!refs.fullscreenParagraph) return;
    if (!state.paragraphs.length) {
      refs.fullscreenParagraph.textContent = "Aún no hay párrafos.";
      return;
    }
    const currentIdx = getCurrentParagraphIndex();
    refs.fullscreenParagraph.textContent = state.paragraphs[currentIdx] || "";
  }

  function isFullscreenKaraokeOpen() {
    return !refs.fullscreenKaraoke.hidden;
  }

  function renderFullscreenToggleButton() {
    refs.openFullscreenBtn.textContent = isFullscreenKaraokeOpen()
      ? "Salir de pantalla completa"
      : "Reproducir a pantalla completa";
  }

  async function openFullscreenKaraoke() {
    if (isFullscreenKaraokeOpen()) return;
    refs.fullscreenKaraoke.hidden = false;
    renderFullscreenParagraph();
    renderFullscreenToggleButton();

    if (!document.fullscreenElement && refs.fullscreenKaraoke.requestFullscreen) {
      try {
        await refs.fullscreenKaraoke.requestFullscreen();
      } catch {
        showMessage("No se pudo activar fullscreen del navegador. Se abrió modo ampliado.", true);
      }
    }
  }

  async function closeFullscreenKaraoke() {
    refs.fullscreenKaraoke.hidden = true;
    renderFullscreenToggleButton();

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // no-op
      }
    }
  }

  async function toggleFullscreenKaraoke() {
    if (isFullscreenKaraokeOpen()) {
      await closeFullscreenKaraoke();
      return;
    }
    await openFullscreenKaraoke();
  }

  function getNextPendingText() {
    const done = state.calibratedTimes.length;
    const total = state.paragraphs.length;
    if (!total) return "No hay párrafos para calibrar.";
    if (done >= total) return "Calibración completa.";
    return `Próximo párrafo (${done + 1}/${total}): ${state.paragraphs[done].slice(0, 90)}${state.paragraphs[done].length > 90 ? "..." : ""}`;
  }

  function renderMode() {
    const isAuto = state.mode === "auto";
    refs.modeStatus.textContent = `Estado: ${isAuto ? "Auto" : "Calibración"}`;
    refs.modeAutoBtn.disabled = isAuto;
    refs.modeCalibBtn.disabled = !isAuto;
    refs.nextPending.textContent = isAuto
      ? "Modo Auto activo. Puedes generar tiempos automáticamente."
      : getNextPendingText();
  }

  function renderDetectorControls() {
    refs.thresholdInput.value = String(state.detector.threshold);
    refs.minSilenceInput.value = String(state.detector.minSilenceMs);
    refs.windowMsInput.value = String(state.detector.windowMs);
    refs.offsetInput.value = String(state.offsetSeconds);
  }

  function renderAudioMeta() {
    refs.audioName.textContent = state.audioMeta?.name || "—";
    refs.audioType.textContent = state.audioMeta?.type || "—";
  }

  function updateTimeDisplay() {
    refs.timeDisplay.textContent = `${formatTime(refs.audio.currentTime)} / ${formatTime(refs.audio.duration)}`;
  }

  function setupAudioGraphIfNeeded() {
    if (audioCtx && sourceNode && analyser) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(refs.audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function computeCurrentRms() {
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  function startLiveAnalysisLoop() {
    stopLiveAnalysisLoop();
    const interval = Math.max(50, Number(state.detector.windowMs) || 80);
    analysisTimer = setInterval(() => {
      if (refs.audio.paused) return;
      computeCurrentRms();
    }, interval);
  }

  function stopLiveAnalysisLoop() {
    if (analysisTimer) {
      clearInterval(analysisTimer);
      analysisTimer = null;
    }
  }

  function waitForMetadata() {
    return new Promise((resolve, reject) => {
      if (Number.isFinite(refs.audio.duration) && refs.audio.duration > 0) return resolve();
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("No se pudieron cargar metadatos de audio"));
      };
      const cleanup = () => {
        refs.audio.removeEventListener("loadedmetadata", onLoaded);
        refs.audio.removeEventListener("error", onErr);
      };
      refs.audio.addEventListener("loadedmetadata", onLoaded, { once: true });
      refs.audio.addEventListener("error", onErr, { once: true });
    });
  }

  function setAudioFromBlob(blob, meta) {
    if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
    const url = URL.createObjectURL(blob);
    currentAudioObjectUrl = url;
    refs.audio.src = url;
    state.audioMeta = {
      name: meta.name,
      type: meta.type || blob.type || "audio/*",
      size: meta.size,
      duration: meta.duration || 0
    };
    renderAudioMeta();
    saveStateToLocalStorage();
  }

  async function handleAudioFileSelected(file) {
    try {
      const tempMeta = {
        name: file.name,
        type: file.type,
        size: file.size,
        duration: 0
      };

      setAudioFromBlob(file, tempMeta);
      await waitForMetadata();
      state.audioMeta.duration = refs.audio.duration || 0;
      saveStateToLocalStorage();

      await saveAudioBlob(state.audioMeta, file);
      showMessage("Audio cargado y guardado en IndexedDB.");
    } catch (err) {
      showMessage(`No se pudo procesar el audio: ${err.message}`, true);
    }
  }

  async function runAutoSync() {
    if (!state.paragraphs.length) return showMessage("Primero agrega la letra.", true);
    if (!refs.audio.src) return showMessage("Primero selecciona un audio.", true);

    try {
      const arrBuf = await fetch(refs.audio.src).then((r) => r.arrayBuffer());
      const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
      const decoded = await offlineCtx.decodeAudioData(arrBuf.slice(0));

      const ch = decoded.getChannelData(0);
      const sr = decoded.sampleRate;
      const windowMs = Math.max(50, Math.min(100, Number(state.detector.windowMs) || 80));
      const frameSize = Math.max(1, Math.floor((windowMs / 1000) * sr));
      const threshold = Number(state.detector.threshold) || 0.02;
      const minSilenceMs = Number(state.detector.minSilenceMs) || 320;
      const minSilentFrames = Math.max(1, Math.ceil(minSilenceMs / windowMs));

      const frameRms = [];
      for (let i = 0; i < ch.length; i += frameSize) {
        const end = Math.min(i + frameSize, ch.length);
        let sum = 0;
        for (let j = i; j < end; j++) sum += ch[j] * ch[j];
        frameRms.push(Math.sqrt(sum / (end - i)));
      }

      const changePoints = [Math.max(0, state.offsetSeconds)];

      for (let i = 1; i < frameRms.length; i++) {
        if (frameRms[i] >= threshold) {
          let count = 0;
          let back = i - 1;
          while (back >= 0 && frameRms[back] < threshold) {
            count++;
            back--;
          }
          if (count >= minSilentFrames) {
            const t = i * (windowMs / 1000) + state.offsetSeconds;
            if (t > 0) changePoints.push(t);
          }
        }
      }

      const points = Array.from(new Set(changePoints))
        .filter((x) => Number.isFinite(x))
        .sort((a, b) => a - b);

      const n = state.paragraphs.length;
      let mapped = [];

      if (points.length >= n) {
        for (let i = 0; i < n; i++) {
          const idx = Math.floor((i * (points.length - 1)) / Math.max(1, n - 1));
          mapped.push(points[idx]);
        }
      } else if (points.length > 0) {
        mapped = points.slice(0, n);
        while (mapped.length < n) {
          const last = mapped[mapped.length - 1] || 0;
          const remaining = n - mapped.length;
          const step = Math.max(0.5, ((refs.audio.duration || decoded.duration) - last) / (remaining + 1));
          mapped.push(Math.min(refs.audio.duration || decoded.duration, last + step));
        }
      } else {
        const dur = refs.audio.duration || decoded.duration || 1;
        for (let i = 0; i < n; i++) mapped.push((dur * i) / n);
      }

      mapped = mapped.map((t) => Math.max(0, Math.min(t, refs.audio.duration || t)));
      state.autoTimes = mapped;
      saveStateToLocalStorage();
      renderKaraoke();
      renderMode();
      showMessage(`Auto-sync completado: ${mapped.length} marcas.`);
    } catch (err) {
      showMessage(`Error en auto-sync: ${err.message}`, true);
    }
  }

  function markNextParagraph() {
    if (state.mode !== "calibration") return;
    if (refs.audio.paused) return;
    if (!state.paragraphs.length) return;
    if (state.calibratedTimes.length >= state.paragraphs.length) {
      return showMessage("Todos los párrafos ya están calibrados.");
    }

    const mark = Math.max(0, refs.audio.currentTime + state.offsetSeconds);
    state.calibratedTimes.push(mark);
    state.calibratedTimes.sort((a, b) => a - b);

    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
  }

  function undoLastMarker() {
    if (!state.calibratedTimes.length) return showMessage("No hay marcadores para deshacer.");
    state.calibratedTimes.pop();
    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
    showMessage("Último marcador eliminado.");
  }

  function clearAllTimes() {
    state.autoTimes = [];
    state.calibratedTimes = [];
    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
    showMessage("Tiempos limpiados.");
  }

  function exportProject() {
    const payload = {
      version: PROJECT_VERSION,
      lyricsOriginal: state.lyricsOriginal,
      paragraphs: state.paragraphs,
      times: {
        auto: state.autoTimes,
        calibrated: state.calibratedTimes
      },
      detector: state.detector,
      offsetSeconds: state.offsetSeconds,
      audioMeta: state.audioMeta
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `karaoke-project-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage("Proyecto exportado.");
  }

  async function importProjectFromFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      state.lyricsOriginal = String(data.lyricsOriginal || "");
      state.paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : parseParagraphs(state.lyricsOriginal);
      state.autoTimes = Array.isArray(data.times?.auto) ? data.times.auto : [];
      state.calibratedTimes = Array.isArray(data.times?.calibrated) ? data.times.calibrated : [];
      state.detector = {
        threshold: Number(data.detector?.threshold ?? 0.02),
        minSilenceMs: Number(data.detector?.minSilenceMs ?? 320),
        windowMs: Number(data.detector?.windowMs ?? 80)
      };
      state.offsetSeconds = Number(data.offsetSeconds ?? 0);
      state.audioMeta = data.audioMeta || null;

      saveStateToLocalStorage();

      renderLyricsUI();
      renderDetectorControls();
      renderAudioMeta();
      renderMode();
      renderKaraoke(true);
      renderPlaylist();

      if (state.audioMeta) {
        const restored = await restoreAudioFromMeta(state.audioMeta, {
          successMessage: "Audio restaurado automáticamente desde IndexedDB.",
          missingMessage: "Proyecto importado, pero el audio no está en IndexedDB. Selecciónalo manualmente."
        });
        showMessage(restored ? "Importado y audio restaurado." : "Importado. Falta seleccionar audio.", !restored);
      } else {
        refs.audioRestoreHint.textContent = "Proyecto importado sin metadatos de audio.";
      }
    } catch (err) {
      showMessage(`Error al importar JSON: ${err.message}`, true);
    }
  }

  async function restoreAudioFromMeta(meta, options = {}) {
    if (!meta) return false;
    const {
      successMessage = "Audio restaurado desde IndexedDB.",
      missingMessage = "No se encontró el audio en IndexedDB. Selecciónalo nuevamente para restaurar.",
      autoplay = false
    } = options;

    try {
      const found = await getAudioBlob(meta);
      if (!found?.blob) {
        refs.audioRestoreHint.textContent = missingMessage;
        return false;
      }

      setAudioFromBlob(found.blob, found);
      refs.audioRestoreHint.textContent = successMessage;

      if (autoplay) {
        try {
          await refs.audio.play();
        } catch (err) {
          showMessage(`Audio cargado, pero no se pudo reproducir: ${err.message}`, true);
        }
      }

      return true;
    } catch {
      refs.audioRestoreHint.textContent = "Error al intentar restaurar audio desde IndexedDB.";
      return false;
    }
  }

  async function loadPlaylistItem(id, autoplay = false) {
    const item = state.playlist.find((entry) => entry.id === id);
    if (!item) return showMessage("No se encontró ese tema en la playlist.", true);

    state.lyricsOriginal = item.lyricsOriginal || "";
    state.paragraphs = Array.isArray(item.paragraphs) ? [...item.paragraphs] : [];
    state.autoTimes = Array.isArray(item.autoTimes) ? [...item.autoTimes] : [];
    state.calibratedTimes = Array.isArray(item.calibratedTimes) ? [...item.calibratedTimes] : [];
    state.detector = {
      threshold: Number(item.detector?.threshold ?? 0.02),
      minSilenceMs: Number(item.detector?.minSilenceMs ?? 320),
      windowMs: Number(item.detector?.windowMs ?? 80)
    };
    state.offsetSeconds = Number(item.offsetSeconds ?? 0);
    state.audioMeta = item.audioMeta ? { ...item.audioMeta } : null;

    saveStateToLocalStorage();
    renderLyricsUI();
    renderDetectorControls();
    renderAudioMeta();
    renderMode();
    renderKaraoke(true);
    refs.nextPending.textContent = state.mode === "auto" ? "Modo Auto activo. Puedes generar tiempos automáticamente." : getNextPendingText();

    if (!state.audioMeta) {
      refs.audioRestoreHint.textContent = "Tema cargado sin metadatos de audio.";
      showMessage("Tema cargado (sin audio).", true);
      return;
    }

    const restored = await restoreAudioFromMeta(state.audioMeta, {
      successMessage: `Tema cargado: ${item.title}`,
      missingMessage: "Tema cargado, pero falta el audio en IndexedDB. Selecciónalo manualmente.",
      autoplay
    });

    if (!restored) {
      showMessage("Tema cargado, pero falta el audio en IndexedDB.", true);
      return;
    }

    showMessage(autoplay ? `Reproduciendo: ${item.title}` : `Tema cargado: ${item.title}`);
  }

  async function restoreAudioFromIndexedDBIfPossible() {
    if (!state.audioMeta) return;
    await restoreAudioFromMeta(state.audioMeta);
  }

  function attachEvents() {
    refs.audioFile.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleAudioFileSelected(file);
    });

    refs.applyLyricsBtn.addEventListener("click", () => {
      state.lyricsOriginal = refs.lyricsInput.value;
      state.paragraphs = parseParagraphs(state.lyricsOriginal);
      state.autoTimes = [];
      state.calibratedTimes = [];
      saveStateToLocalStorage();
      renderLyricsUI();
      renderKaraoke(true);
      refs.nextPending.textContent = getNextPendingText();
      showMessage(`Letra aplicada: ${state.paragraphs.length} párrafos.`);
    });

    refs.modeAutoBtn.addEventListener("click", () => {
      state.mode = "auto";
      saveStateToLocalStorage();
      renderMode();
    });

    refs.modeCalibBtn.addEventListener("click", () => {
      state.mode = "calibration";
      saveStateToLocalStorage();
      renderMode();
    });

    refs.thresholdInput.addEventListener("change", () => {
      state.detector.threshold = Number(refs.thresholdInput.value);
      saveStateToLocalStorage();
    });

    refs.minSilenceInput.addEventListener("change", () => {
      state.detector.minSilenceMs = Number(refs.minSilenceInput.value);
      saveStateToLocalStorage();
    });

    refs.windowMsInput.addEventListener("change", () => {
      state.detector.windowMs = Number(refs.windowMsInput.value);
      saveStateToLocalStorage();
      if (!refs.audio.paused) startLiveAnalysisLoop();
    });

    refs.offsetInput.addEventListener("change", () => {
      state.offsetSeconds = Number(refs.offsetInput.value);
      saveStateToLocalStorage();
      renderKaraoke();
    });

    refs.autoSyncBtn.addEventListener("click", runAutoSync);
    refs.undoMarkerBtn.addEventListener("click", undoLastMarker);
    refs.clearTimesBtn.addEventListener("click", clearAllTimes);
    refs.exportBtn.addEventListener("click", exportProject);

    refs.importFile.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importProjectFromFile(file);
      refs.importFile.value = "";
    });

    refs.deleteStoredAudioBtn.addEventListener("click", async () => {
      try {
        if (!state.audioMeta) return showMessage("No hay metadatos de audio para eliminar.");
        await deleteAudioBlob(state.audioMeta);
        if (currentAudioObjectUrl) {
          URL.revokeObjectURL(currentAudioObjectUrl);
          currentAudioObjectUrl = null;
        }
        refs.audio.removeAttribute("src");
        refs.audio.load();
        state.audioMeta = null;
        saveStateToLocalStorage();
        renderAudioMeta();
        refs.audioRestoreHint.textContent = "Audio eliminado de IndexedDB.";
        showMessage("Audio almacenado eliminado.");
      } catch (err) {
        showMessage(`No se pudo eliminar audio: ${err.message}`, true);
      }
    });

    refs.openFullscreenBtn.addEventListener("click", toggleFullscreenKaraoke);
    refs.closeFullscreenBtn.addEventListener("click", closeFullscreenKaraoke);

    refs.fsPlayBtn.addEventListener("click", async () => {
      try {
        await refs.audio.play();
      } catch (err) {
        showMessage(`No se pudo reproducir el audio: ${err.message}`, true);
      }
    });

    refs.fsPauseBtn.addEventListener("click", () => {
      refs.audio.pause();
    });

    refs.fsStopBtn.addEventListener("click", () => {
      refs.audio.pause();
      refs.audio.currentTime = 0;
      updateTimeDisplay();
      renderKaraoke();
    });

    refs.addToPlaylistBtn.addEventListener("click", addCurrentToPlaylist);
    refs.clearPlaylistBtn.addEventListener("click", clearPlaylist);

    refs.playlistView.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;

      if (action === "load") {
        await loadPlaylistItem(id, false);
        return;
      }

      if (action === "play") {
        await loadPlaylistItem(id, true);
        return;
      }

      if (action === "delete") {
        deletePlaylistItem(id);
      }
    });

    refs.audio.addEventListener("loadedmetadata", () => {
      updateTimeDisplay();
      if (state.audioMeta) {
        state.audioMeta.duration = refs.audio.duration || state.audioMeta.duration || 0;
        saveStateToLocalStorage();
      }
    });

    refs.audio.addEventListener("timeupdate", () => {
      updateTimeDisplay();
      renderKaraoke();
    });

    refs.audio.addEventListener("play", async () => {
      try {
        setupAudioGraphIfNeeded();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        startLiveAnalysisLoop();
      } catch (err) {
        showMessage(`No se pudo iniciar Web Audio: ${err.message}`, true);
      }
    });

    refs.audio.addEventListener("pause", stopLiveAnalysisLoop);
    refs.audio.addEventListener("ended", stopLiveAnalysisLoop);

    document.addEventListener("keydown", (e) => {
      if (isFullscreenKaraokeOpen()) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeFullscreenKaraoke();
          return;
        }

        if (e.code === "Space") {
          e.preventDefault();
          if (refs.audio.paused) {
            refs.audio.play().catch((err) => {
              showMessage(`No se pudo reproducir el audio: ${err.message}`, true);
            });
          } else {
            refs.audio.pause();
          }
          return;
        }

        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          refs.audio.pause();
          refs.audio.currentTime = 0;
          updateTimeDisplay();
          renderKaraoke();
          return;
        }

        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          toggleFullscreenKaraoke();
          return;
        }
      }

      if (e.key === "Escape" && !refs.fullscreenKaraoke.hidden) {
        closeFullscreenKaraoke();
      }

      if (e.code !== "Space") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input") return;

      if (state.mode === "calibration") {
        e.preventDefault();
        markNextParagraph();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement !== refs.fullscreenKaraoke) {
        refs.fullscreenKaraoke.hidden = true;
        renderFullscreenToggleButton();
      }
    });
  }

  async function init() {
    try {
      await openDB();
    } catch (err) {
      showMessage(`IndexedDB no disponible: ${err.message}`, true);
    }

    loadStateFromLocalStorage();
    renderLyricsUI();
    renderDetectorControls();
    renderAudioMeta();
    renderMode();
    renderKaraoke(true);
    renderPlaylist();
    renderFullscreenToggleButton();
    updateTimeDisplay();
    refs.pwaVersion.textContent = `PWA v${APP_CACHE_VERSION}`;
    await restoreAudioFromIndexedDBIfPossible();
    await registerServiceWorker();
    attachEvents();
    window.addEventListener("beforeunload", () => {
      if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
    });
  }

  init();
})();
