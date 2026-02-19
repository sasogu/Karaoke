(() => {
  "use strict";

  const LS_KEY = "karaokeProjectStateV1";
  const DB_NAME = "karaokeDB";
  const DB_VERSION = 1;
  const STORE_AUDIOS = "audios";
  const PROJECT_VERSION = "1.0.0";
  const PROJECT_PACKAGE_VERSION = "zip-v1";
  const LS_LANG_KEY = "karaokeLanguageV1";

  const state = {
    lyricsOriginal: "",
    paragraphs: [],
    autoTimes: [],
    calibratedTimes: [],
    playlist: [],
    mode: "calibration",
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
    languageSelect: $("languageSelect"),

    exportBtn: $("exportBtn"),
    importFile: $("importFile"),
    deleteStoredAudioBtn: $("deleteStoredAudioBtn"),
    openToolsModalBtn: $("openToolsModalBtn"),
    toolsModal: $("toolsModal"),
    toolsModalBackdrop: $("toolsModalBackdrop"),
    closeToolsModalBtn: $("closeToolsModalBtn"),

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

  const DATE_LOCALES = {
    es: "es-ES",
    val: "ca-ES",
    en: "en-US"
  };

  const I18N = {
    es: {
      document_title: "EduKaraoke",
      app_title: "EduKaraoke",
      app_subtitle: "Crea tu karaoke casero: carga un audio, pega la letra y sincroniza por párrafos. Guarda tus temas favoritos en la playlist y ¡a cantar!",
      language_label: "Idioma",
      open_tools: "Sincronización y exportar",
      player_title: "Reproductor",
      select_audio: "Seleccionar audio",
      delete_stored_audio: "Eliminar audio almacenado",
      meta_file: "Archivo:",
      meta_type: "Tipo:",
      meta_time: "Tiempo:",
      lyrics_title: "Letra",
      lyrics_hint: "Separa párrafos dejando una línea en blanco entre bloques.",
      lyrics_placeholder: "Pega aquí la letra...\n\nPárrafo 1\n\nPárrafo 2",
      apply_lyrics: "Aplicar letra",
      paragraph_count: "{count} párrafo(s)",
      playlist_title: "Playlist",
      playlist_hint: "Guarda temas con su audio y sincronización para recargarlos después.",
      track_title_label: "Título del tema",
      track_title_placeholder: "Ej: Canción 1 (en vivo)",
      new_playlist: "Nueva playlist...",
      add_to_playlist: "Añadir a playlist",
      clear_playlist: "Vaciar playlist",
      playlist_count: "{count} tema(s)",
      no_tracks_saved: "Aún no hay temas guardados.",
      no_playlists_saved: "Aún no hay playlists guardadas.",
      karaoke_title: "Karaoke",
      no_paragraphs: "Aún no hay párrafos.",
      fullscreen_open: "Reproducir a pantalla completa",
      fullscreen_close: "Salir de pantalla completa",
      tools_modal_title: "Sincronización y exportar",
      close: "Cerrar",
      sync_title: "Sincronización",
      mode_auto: "Modo Auto",
      mode_calibration: "Modo Calibración",
      mode_status: "Estado: {mode}",
      mode_name_auto: "Auto",
      mode_name_calibration: "Calibración",
      threshold_label: "Umbral silencio (RMS)",
      min_silence_label: "Silencio mínimo (ms)",
      analysis_window_label: "Ventana análisis (ms)",
      global_offset_label: "Offset global (s)",
      auto_sync: "Auto-sincronizar",
      undo_last_marker: "Deshacer último marcador",
      clear_times: "Limpiar tiempos",
      calibration_help: "Calibración: pulsa <kbd>Espacio</kbd> durante reproducción para marcar el inicio del siguiente párrafo.",
      pending_none: "No hay párrafos para calibrar.",
      pending_done: "Calibración completa.",
      pending_next: "Próximo párrafo ({current}/{total}): {text}",
      mode_auto_active: "Modo Auto activo. Puedes generar tiempos automáticamente.",
      export_import_title: "Exportar / Importar",
      export_project: "Exportar proyecto",
      import_project: "Importar proyecto",
      export_hint: "Se exporta en ZIP con audio + sincronización. También puedes importar JSON legado.",
      playback_controls: "Controles de reproducción",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      track_default_name: "Tema",
      playlist_name: "Playlist {index}",
      playlist_no_audio: "sin audio",
      playlist_sync_yes: "sincronizado",
      playlist_sync_no: "sin sincronizar",
      btn_load: "Cargar",
      btn_load_play: "Cargar y reproducir",
      btn_delete: "Eliminar",
      msg_update_available: "Nueva versión disponible. Recarga para aplicar la actualización.",
      msg_updated_cache: "Aplicación actualizada a la nueva versión de caché.",
      err_pwa_register: "No se pudo registrar la PWA: {error}",
      err_local_state_invalid: "Estado previo inválido en localStorage.",
      err_playlist_ui_unavailable: "La interfaz de playlist no está disponible en esta versión cargada.",
      err_select_audio_first: "Primero selecciona un audio.",
      err_add_lyrics_first: "Primero agrega la letra por párrafos.",
      err_sync_first: "Primero sincroniza la letra (auto o calibración).",
      msg_track_added_playlist: "Tema añadido a la playlist.",
      msg_track_deleted_playlist: "Tema eliminado de la playlist.",
      msg_playlist_empty_already: "La playlist ya está vacía.",
      msg_playlist_cleared: "Playlist vaciada.",
      err_fullscreen_browser: "No se pudo activar fullscreen del navegador. Se abrió modo ampliado.",
      err_no_audio_file_selected: "No se seleccionó ningún archivo de audio.",
      msg_audio_saved_indexeddb: "Audio cargado y guardado en IndexedDB.",
      err_process_audio: "No se pudo procesar el audio: {error}",
      err_add_lyrics_first_short: "Primero agrega la letra.",
      msg_auto_sync_done: "Auto-sync completado: {count} marcas.",
      err_auto_sync: "Error en auto-sync: {error}",
      msg_all_paragraphs_calibrated: "Todos los párrafos ya están calibrados.",
      msg_no_markers_undo: "No hay marcadores para deshacer.",
      msg_last_marker_removed: "Último marcador eliminado.",
      msg_times_cleared: "Tiempos limpiados.",
      warn_jszip_not_available_export: "JSZip no disponible. Se exportó solo JSON (sin audio).",
      msg_export_zip_with_audio: "Proyecto exportado en ZIP con audio y sincronización.",
      warn_export_zip_without_audio: "Proyecto exportado en ZIP sin audio (no se encontró en IndexedDB).",
      err_export_zip: "No se pudo exportar ZIP: {error}",
      msg_imported_restored: "Importado y audio restaurado.",
      warn_imported_missing_audio: "Importado. Falta seleccionar audio.",
      hint_imported_without_audio_meta: "Proyecto importado sin metadatos de audio.",
      warn_imported_without_audio: "Proyecto importado (sin audio).",
      err_import_zip_no_jszip: "No se puede importar ZIP: JSZip no está disponible.",
      err_zip_no_project_json: "El ZIP no contiene project.json",
      msg_zip_imported_audio_local: "ZIP importado y audio restaurado.",
      warn_zip_imported_without_audio: "ZIP importado sin audio adjunto.",
      hint_zip_without_audio_file: "ZIP importado sin archivo de audio.",
      msg_zip_imported_full: "ZIP importado con audio y sincronización.",
      warn_zip_imported_audio_restore_fail: "ZIP importado, pero no se pudo restaurar el audio.",
      err_import_file: "Error al importar archivo: {error}",
      hint_audio_restored: "Audio restaurado automáticamente desde IndexedDB.",
      hint_audio_missing_select_manually: "Proyecto importado, pero el audio no está en IndexedDB. Selecciónalo manualmente.",
      hint_zip_audio_restored_local: "ZIP importado. Audio restaurado desde IndexedDB local.",
      hint_zip_audio_missing_attach: "ZIP importado sin audio adjunto. Selecciona el audio manualmente.",
      hint_audio_imported_from_zip: "Audio importado desde ZIP y restaurado automáticamente.",
      hint_audio_imported_zip_failed: "Se importó el ZIP, pero no se pudo restaurar el audio.",
      err_audio_play_after_restore: "Audio cargado, pero no se pudo reproducir: {error}",
      err_playlist_item_not_found: "No se encontró ese tema en la playlist.",
      hint_track_loaded_no_audio: "Tema cargado sin metadatos de audio.",
      warn_track_loaded_without_audio: "Tema cargado (sin audio).",
      hint_track_loaded: "Tema cargado: {title}",
      hint_track_missing_audio_select: "Tema cargado, pero falta el audio en IndexedDB. Selecciónalo manualmente.",
      warn_track_missing_audio: "Tema cargado, pero falta el audio en IndexedDB.",
      msg_track_playing: "Reproduciendo: {title}",
      msg_track_loaded: "Tema cargado: {title}",
      msg_lyrics_applied: "Letra aplicada: {count} párrafos.",
      err_no_audio_metadata_delete: "No hay metadatos de audio para eliminar.",
      hint_audio_deleted_indexeddb: "Audio eliminado de IndexedDB.",
      msg_audio_deleted: "Audio almacenado eliminado.",
      err_delete_audio: "No se pudo eliminar audio: {error}",
      err_audio_play: "No se pudo reproducir el audio: {error}",
      err_web_audio_start: "No se pudo iniciar Web Audio: {error}",
      err_indexeddb_unavailable: "IndexedDB no disponible: {error}",
      err_db_open: "No se pudo abrir IndexedDB",
      err_db_delete_audio: "No se pudo eliminar el audio"
    },
    val: {
      document_title: "EduKaraoke",
      app_title: "EduKaraoke",
      app_subtitle: "Crea el teu karaoke casolà: carrega un àudio, apega la lletra i sincronitza per paràgrafs. Guarda els teus temes favorits en la llista i a cantar!",
      language_label: "Idioma",
      open_tools: "Sincronització i exportació",
      player_title: "Reproductor",
      select_audio: "Seleccionar àudio",
      delete_stored_audio: "Eliminar àudio guardat",
      meta_file: "Arxiu:",
      meta_type: "Tipus:",
      meta_time: "Temps:",
      lyrics_title: "Lletra",
      lyrics_hint: "Separa paràgrafs deixant una línia en blanc entre blocs.",
      lyrics_placeholder: "Apega ací la lletra...\n\nParàgraf 1\n\nParàgraf 2",
      apply_lyrics: "Aplicar lletra",
      paragraph_count: "{count} paràgraf(s)",
      playlist_title: "Llista",
      playlist_hint: "Guarda temes amb el seu àudio i sincronització per a recarregar-los després.",
      track_title_label: "Títol del tema",
      track_title_placeholder: "Ex: Cançó 1 (en directe)",
      new_playlist: "Nova llista...",
      add_to_playlist: "Afegir a la llista",
      clear_playlist: "Buidar llista",
      playlist_count: "{count} tema(es)",
      no_tracks_saved: "Encara no hi ha temes guardats.",
      no_playlists_saved: "Encara no hi ha llistes guardades.",
      karaoke_title: "Karaoke",
      no_paragraphs: "Encara no hi ha paràgrafs.",
      fullscreen_open: "Reproduir a pantalla completa",
      fullscreen_close: "Eixir de pantalla completa",
      tools_modal_title: "Sincronització i exportació",
      close: "Tancar",
      sync_title: "Sincronització",
      mode_auto: "Mode Auto",
      mode_calibration: "Mode Calibració",
      mode_status: "Estat: {mode}",
      mode_name_auto: "Auto",
      mode_name_calibration: "Calibració",
      threshold_label: "Llindar silenci (RMS)",
      min_silence_label: "Silenci mínim (ms)",
      analysis_window_label: "Finestra d'anàlisi (ms)",
      global_offset_label: "Offset global (s)",
      auto_sync: "Auto-sincronitzar",
      undo_last_marker: "Desfer últim marcador",
      clear_times: "Netejar temps",
      calibration_help: "Calibració: prem <kbd>Espai</kbd> durant la reproducció per a marcar l'inici del següent paràgraf.",
      pending_none: "No hi ha paràgrafs per a calibrar.",
      pending_done: "Calibració completada.",
      pending_next: "Pròxim paràgraf ({current}/{total}): {text}",
      mode_auto_active: "Mode Auto actiu. Pots generar temps automàticament.",
      export_import_title: "Exportar / Importar",
      export_project: "Exportar projecte",
      import_project: "Importar projecte",
      export_hint: "S'exporta en ZIP amb àudio + sincronització. També pots importar JSON antic.",
      playback_controls: "Controls de reproducció",
      play: "Reproduir",
      pause: "Pausa",
      stop: "Aturar",
      track_default_name: "Tema",
      playlist_name: "Llista {index}",
      playlist_no_audio: "sense àudio",
      playlist_sync_yes: "sincronitzat",
      playlist_sync_no: "sense sincronitzar",
      btn_load: "Carregar",
      btn_load_play: "Carregar i reproduir",
      btn_delete: "Eliminar",
      msg_update_available: "Nova versió disponible. Recarrega per a aplicar l'actualització.",
      msg_updated_cache: "Aplicació actualitzada a la nova versió de caché.",
      err_pwa_register: "No s'ha pogut registrar la PWA: {error}",
      err_local_state_invalid: "Estat previ invàlid en localStorage.",
      err_playlist_ui_unavailable: "La interfície de llista no està disponible en esta versió carregada.",
      err_select_audio_first: "Primer selecciona un àudio.",
      err_add_lyrics_first: "Primer afegeix la lletra per paràgrafs.",
      err_sync_first: "Primer sincronitza la lletra (auto o calibració).",
      msg_track_added_playlist: "Tema afegit a la llista.",
      msg_track_deleted_playlist: "Tema eliminat de la llista.",
      msg_playlist_empty_already: "La llista ja està buida.",
      msg_playlist_cleared: "Llista buidada.",
      err_fullscreen_browser: "No s'ha pogut activar la pantalla completa del navegador. S'ha obert el mode ampliat.",
      err_no_audio_file_selected: "No s'ha seleccionat cap arxiu d'àudio.",
      msg_audio_saved_indexeddb: "Àudio carregat i guardat en IndexedDB.",
      err_process_audio: "No s'ha pogut processar l'àudio: {error}",
      err_add_lyrics_first_short: "Primer afegeix la lletra.",
      msg_auto_sync_done: "Auto-sync completat: {count} marques.",
      err_auto_sync: "Error en auto-sync: {error}",
      msg_all_paragraphs_calibrated: "Tots els paràgrafs ja estan calibrats.",
      msg_no_markers_undo: "No hi ha marcadors per a desfer.",
      msg_last_marker_removed: "Últim marcador eliminat.",
      msg_times_cleared: "Temps netejats.",
      warn_jszip_not_available_export: "JSZip no disponible. S'ha exportat només JSON (sense àudio).",
      msg_export_zip_with_audio: "Projecte exportat en ZIP amb àudio i sincronització.",
      warn_export_zip_without_audio: "Projecte exportat en ZIP sense àudio (no s'ha trobat en IndexedDB).",
      err_export_zip: "No s'ha pogut exportar ZIP: {error}",
      msg_imported_restored: "Importat i àudio restaurat.",
      warn_imported_missing_audio: "Importat. Falta seleccionar àudio.",
      hint_imported_without_audio_meta: "Projecte importat sense metadades d'àudio.",
      warn_imported_without_audio: "Projecte importat (sense àudio).",
      err_import_zip_no_jszip: "No es pot importar ZIP: JSZip no està disponible.",
      err_zip_no_project_json: "El ZIP no conté project.json",
      msg_zip_imported_audio_local: "ZIP importat i àudio restaurat.",
      warn_zip_imported_without_audio: "ZIP importat sense àudio adjunt.",
      hint_zip_without_audio_file: "ZIP importat sense arxiu d'àudio.",
      msg_zip_imported_full: "ZIP importat amb àudio i sincronització.",
      warn_zip_imported_audio_restore_fail: "ZIP importat, però no s'ha pogut restaurar l'àudio.",
      err_import_file: "Error en importar arxiu: {error}",
      hint_audio_restored: "Àudio restaurat automàticament des d'IndexedDB.",
      hint_audio_missing_select_manually: "Projecte importat, però l'àudio no està en IndexedDB. Selecciona'l manualment.",
      hint_zip_audio_restored_local: "ZIP importat. Àudio restaurat des d'IndexedDB local.",
      hint_zip_audio_missing_attach: "ZIP importat sense àudio adjunt. Selecciona l'àudio manualment.",
      hint_audio_imported_from_zip: "Àudio importat des de ZIP i restaurat automàticament.",
      hint_audio_imported_zip_failed: "S'ha importat el ZIP, però no s'ha pogut restaurar l'àudio.",
      err_audio_play_after_restore: "Àudio carregat, però no s'ha pogut reproduir: {error}",
      err_playlist_item_not_found: "No s'ha trobat eixe tema en la llista.",
      hint_track_loaded_no_audio: "Tema carregat sense metadades d'àudio.",
      warn_track_loaded_without_audio: "Tema carregat (sense àudio).",
      hint_track_loaded: "Tema carregat: {title}",
      hint_track_missing_audio_select: "Tema carregat, però falta l'àudio en IndexedDB. Selecciona'l manualment.",
      warn_track_missing_audio: "Tema carregat, però falta l'àudio en IndexedDB.",
      msg_track_playing: "Reproduint: {title}",
      msg_track_loaded: "Tema carregat: {title}",
      msg_lyrics_applied: "Lletra aplicada: {count} paràgrafs.",
      err_no_audio_metadata_delete: "No hi ha metadades d'àudio per a eliminar.",
      hint_audio_deleted_indexeddb: "Àudio eliminat d'IndexedDB.",
      msg_audio_deleted: "Àudio guardat eliminat.",
      err_delete_audio: "No s'ha pogut eliminar l'àudio: {error}",
      err_audio_play: "No s'ha pogut reproduir l'àudio: {error}",
      err_web_audio_start: "No s'ha pogut iniciar Web Audio: {error}",
      err_indexeddb_unavailable: "IndexedDB no disponible: {error}",
      err_db_open: "No s'ha pogut obrir IndexedDB",
      err_db_delete_audio: "No s'ha pogut eliminar l'àudio"
    },
    en: {
      document_title: "EduKaraoke",
      app_title: "EduKaraoke",
      app_subtitle: "Create your home karaoke: load an audio file, paste lyrics, and sync by paragraphs. Save your favorite tracks in playlists and start singing!",
      language_label: "Language",
      open_tools: "Sync and export",
      player_title: "Player",
      select_audio: "Select audio",
      delete_stored_audio: "Delete stored audio",
      meta_file: "File:",
      meta_type: "Type:",
      meta_time: "Time:",
      lyrics_title: "Lyrics",
      lyrics_hint: "Separate paragraphs with one blank line between blocks.",
      lyrics_placeholder: "Paste lyrics here...\n\nParagraph 1\n\nParagraph 2",
      apply_lyrics: "Apply lyrics",
      paragraph_count: "{count} paragraph(s)",
      playlist_title: "Playlist",
      playlist_hint: "Save tracks with audio and sync data so you can reload them later.",
      track_title_label: "Track title",
      track_title_placeholder: "Ex: Song 1 (live)",
      new_playlist: "New playlist...",
      add_to_playlist: "Add to playlist",
      clear_playlist: "Clear playlist",
      playlist_count: "{count} track(s)",
      no_tracks_saved: "No saved tracks yet.",
      no_playlists_saved: "No saved playlists yet.",
      karaoke_title: "Karaoke",
      no_paragraphs: "No paragraphs yet.",
      fullscreen_open: "Play fullscreen",
      fullscreen_close: "Exit fullscreen",
      tools_modal_title: "Sync and export",
      close: "Close",
      sync_title: "Synchronization",
      mode_auto: "Auto mode",
      mode_calibration: "Calibration mode",
      mode_status: "Status: {mode}",
      mode_name_auto: "Auto",
      mode_name_calibration: "Calibration",
      threshold_label: "Silence threshold (RMS)",
      min_silence_label: "Minimum silence (ms)",
      analysis_window_label: "Analysis window (ms)",
      global_offset_label: "Global offset (s)",
      auto_sync: "Auto-sync",
      undo_last_marker: "Undo last marker",
      clear_times: "Clear timings",
      calibration_help: "Calibration: press <kbd>Space</kbd> during playback to mark the start of the next paragraph.",
      pending_none: "No paragraphs to calibrate.",
      pending_done: "Calibration complete.",
      pending_next: "Next paragraph ({current}/{total}): {text}",
      mode_auto_active: "Auto mode active. You can generate timings automatically.",
      export_import_title: "Export / Import",
      export_project: "Export project",
      import_project: "Import project",
      export_hint: "Exports ZIP with audio + sync. You can also import legacy JSON.",
      playback_controls: "Playback controls",
      play: "Play",
      pause: "Pause",
      stop: "Stop",
      track_default_name: "Track",
      playlist_name: "Playlist {index}",
      playlist_no_audio: "no audio",
      playlist_sync_yes: "synced",
      playlist_sync_no: "not synced",
      btn_load: "Load",
      btn_load_play: "Load and play",
      btn_delete: "Delete",
      msg_update_available: "New version available. Reload to apply the update.",
      msg_updated_cache: "Application updated to the new cache version.",
      err_pwa_register: "Could not register PWA: {error}",
      err_local_state_invalid: "Invalid previous state in localStorage.",
      err_playlist_ui_unavailable: "Playlist UI is not available in this loaded version.",
      err_select_audio_first: "Select an audio file first.",
      err_add_lyrics_first: "Add lyrics by paragraphs first.",
      err_sync_first: "Sync the lyrics first (auto or calibration).",
      msg_track_added_playlist: "Track added to playlist.",
      msg_track_deleted_playlist: "Track removed from playlist.",
      msg_playlist_empty_already: "Playlist is already empty.",
      msg_playlist_cleared: "Playlist cleared.",
      err_fullscreen_browser: "Could not enable browser fullscreen. Expanded mode was opened.",
      err_no_audio_file_selected: "No audio file was selected.",
      msg_audio_saved_indexeddb: "Audio loaded and saved to IndexedDB.",
      err_process_audio: "Could not process audio: {error}",
      err_add_lyrics_first_short: "Add lyrics first.",
      msg_auto_sync_done: "Auto-sync completed: {count} markers.",
      err_auto_sync: "Auto-sync error: {error}",
      msg_all_paragraphs_calibrated: "All paragraphs are already calibrated.",
      msg_no_markers_undo: "No markers to undo.",
      msg_last_marker_removed: "Last marker removed.",
      msg_times_cleared: "Timings cleared.",
      warn_jszip_not_available_export: "JSZip not available. Exported JSON only (without audio).",
      msg_export_zip_with_audio: "Project exported as ZIP with audio and synchronization.",
      warn_export_zip_without_audio: "Project exported as ZIP without audio (not found in IndexedDB).",
      err_export_zip: "Could not export ZIP: {error}",
      msg_imported_restored: "Imported and audio restored.",
      warn_imported_missing_audio: "Imported. Please select the audio manually.",
      hint_imported_without_audio_meta: "Project imported without audio metadata.",
      warn_imported_without_audio: "Project imported (without audio).",
      err_import_zip_no_jszip: "Cannot import ZIP: JSZip is not available.",
      err_zip_no_project_json: "ZIP does not contain project.json",
      msg_zip_imported_audio_local: "ZIP imported and audio restored.",
      warn_zip_imported_without_audio: "ZIP imported without attached audio.",
      hint_zip_without_audio_file: "ZIP imported without audio file.",
      msg_zip_imported_full: "ZIP imported with audio and synchronization.",
      warn_zip_imported_audio_restore_fail: "ZIP imported, but audio could not be restored.",
      err_import_file: "File import error: {error}",
      hint_audio_restored: "Audio restored automatically from IndexedDB.",
      hint_audio_missing_select_manually: "Project imported, but audio is not in IndexedDB. Select it manually.",
      hint_zip_audio_restored_local: "ZIP imported. Audio restored from local IndexedDB.",
      hint_zip_audio_missing_attach: "ZIP imported without attached audio. Select audio manually.",
      hint_audio_imported_from_zip: "Audio imported from ZIP and restored automatically.",
      hint_audio_imported_zip_failed: "ZIP was imported, but audio could not be restored.",
      err_audio_play_after_restore: "Audio loaded, but could not play: {error}",
      err_playlist_item_not_found: "Track not found in playlist.",
      hint_track_loaded_no_audio: "Track loaded without audio metadata.",
      warn_track_loaded_without_audio: "Track loaded (without audio).",
      hint_track_loaded: "Track loaded: {title}",
      hint_track_missing_audio_select: "Track loaded, but audio is missing in IndexedDB. Select it manually.",
      warn_track_missing_audio: "Track loaded, but audio is missing in IndexedDB.",
      msg_track_playing: "Playing: {title}",
      msg_track_loaded: "Track loaded: {title}",
      msg_lyrics_applied: "Lyrics applied: {count} paragraphs.",
      err_no_audio_metadata_delete: "No audio metadata available to delete.",
      hint_audio_deleted_indexeddb: "Audio removed from IndexedDB.",
      msg_audio_deleted: "Stored audio deleted.",
      err_delete_audio: "Could not delete audio: {error}",
      err_audio_play: "Could not play audio: {error}",
      err_web_audio_start: "Could not start Web Audio: {error}",
      err_indexeddb_unavailable: "IndexedDB unavailable: {error}",
      err_db_open: "Could not open IndexedDB",
      err_db_delete_audio: "Could not delete audio"
    }
  };

  let audioCtx = null;
  let sourceNode = null;
  let analyser = null;
  let analysisTimer = null;
  let currentAudioObjectUrl = null;
  let activeParagraphIndex = -1;
  let shouldPersistMigratedState = false;
  let lastFocusedElementBeforeToolsModal = null;
  let currentLanguage = "es";

  let db = null;

  function t(key, vars = {}) {
    const fallback = I18N.es[key] || key;
    const template = I18N[currentLanguage]?.[key] || fallback;
    return template.replace(/\{(\w+)\}/g, (_, token) => {
      return Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : `{${token}}`;
    });
  }

  function applyStaticTranslations() {
    document.title = t("document_title");

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) return;
      element.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const key = element.getAttribute("data-i18n-html");
      if (!key) return;
      element.innerHTML = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      if (!key) return;
      element.setAttribute("placeholder", t(key));
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.getAttribute("data-i18n-aria-label");
      if (!key) return;
      element.setAttribute("aria-label", t(key));
    });

    if (refs.playlistTitleInput) {
      refs.playlistTitleInput.placeholder = t("track_title_placeholder");
    }

    if (refs.languageSelect) {
      refs.languageSelect.setAttribute("aria-label", t("language_label"));
    }
  }

  function detectInitialLanguage() {
    const saved = localStorage.getItem(LS_LANG_KEY);
    if (saved && (saved === "es" || saved === "val" || saved === "en")) {
      return saved;
    }

    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "es"];

    for (const langRaw of langs) {
      const lang = String(langRaw || "").toLowerCase();
      if (!lang) continue;
      if (lang.startsWith("ca")) return "val";
      if (lang.startsWith("en")) return "en";
      if (lang.startsWith("es")) return "es";
    }

    return "es";
  }

  function setLanguage(lang, options = {}) {
    const { persist = true } = options;
    const normalized = lang === "val" || lang === "en" || lang === "es" ? lang : "es";
    currentLanguage = normalized;
    document.documentElement.lang = normalized === "val" ? "ca" : normalized;

    if (refs.languageSelect) {
      refs.languageSelect.value = normalized;
    }

    if (persist) {
      localStorage.setItem(LS_LANG_KEY, normalized);
    }

    applyStaticTranslations();
    renderLyricsUI();
    renderPlaylist();
    renderMode();
    renderFullscreenToggleButton();
    renderKaraoke(true);
  }

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

      request.onerror = () => reject(request.error || new Error(t("err_db_open")));
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
      tx.onerror = () => reject(tx.error || new Error(t("err_db_delete_audio")));
    });
  }

  function displayNotification(message, isError = false) {
    refs.message.textContent = message;
    refs.message.style.borderColor = isError ? "#ef4444" : "#374151";
    refs.message.classList.add("show");
    setTimeout(() => refs.message.classList.remove("show"), 2600);
  }

  function showMessage(message, isError = false) {
    displayNotification(message, isError);
  }

  function renderKaraoke(forceUpdate = false) {
    updateKaraokeDisplay(forceUpdate);
  }

  async function requestCacheVersionFromWorker(worker) {
    if (!worker) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 1500);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        const version = event.data?.type === "CACHE_VERSION" ? event.data.version : null;
        resolve(version || null);
      };

      worker.postMessage({ type: "GET_CACHE_VERSION" }, [channel.port2]);
    });
  }

  async function requestCacheVersionFromScript() {
    try {
      const response = await fetch("./sw.js", { cache: "no-store" });
      if (!response.ok) return null;
      const source = await response.text();
      const match = source.match(/APP_CACHE_VERSION\s*=\s*"([^"]+)"/);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }

  async function refreshPwaVersionLabel(registration) {
    if (!refs.pwaVersion) return;

    const worker =
      navigator.serviceWorker.controller ||
      registration?.active ||
      registration?.waiting ||
      registration?.installing;

    const version =
      (await requestCacheVersionFromWorker(worker)) ||
      (await requestCacheVersionFromScript());
    refs.pwaVersion.textContent = version ? `PWA v${version}` : "PWA v—";
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showMessage(t("msg_update_available"));
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        showMessage(t("msg_updated_cache"));
        refreshPwaVersionLabel(registration);
      });

      await refreshPwaVersionLabel(registration);
      return registration;
    } catch (err) {
      showMessage(t("err_pwa_register", { error: err.message }), true);
      return null;
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

  function sanitizeFileName(name) {
    const base = String(name || "audio-importado")
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    return base || "audio-importado";
  }

  function normalizeImportedAudioMeta(meta, fallbackName, blob) {
    const safeName = sanitizeFileName(meta?.name || fallbackName || "audio-importado");
    const type = String(meta?.type || blob?.type || "audio/mpeg");
    return {
      name: safeName,
      type,
      size: Number(blob?.size ?? meta?.size ?? 0),
      duration: Number(meta?.duration ?? 0)
    };
  }

  function buildProjectPayload() {
    return {
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
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizePlaylistTrack(raw) {
    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.id || "").trim() || generateId();
    return {
      id,
      title: String(raw.title || t("track_default_name")),
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

  function normalizePlaylistItem(raw) {
    if (!raw || typeof raw !== "object") return null;

    if (Array.isArray(raw.items)) {
      return {
        id: String(raw.id || "").trim() || generateId(),
        title: String(raw.title || t("playlist_name", { index: 1 })),
        items: raw.items.map(normalizePlaylistTrack).filter(Boolean)
      };
    }

    const legacyTrack = normalizePlaylistTrack(raw);
    if (!legacyTrack) return null;

    return {
      id: `legacy-${legacyTrack.id}`,
      title: t("playlist_name", { index: 1 }),
      items: [legacyTrack]
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
      if (Array.isArray(data.playlist)) {
        const normalizedPlaylist = data.playlist.map(normalizePlaylistItem).filter(Boolean);
        const hadLegacyShape = data.playlist.some((entry) => !Array.isArray(entry?.items));
        const hadDroppedEntries = normalizedPlaylist.length !== data.playlist.length;
        state.playlist = normalizedPlaylist;
        shouldPersistMigratedState = hadLegacyShape || hadDroppedEntries;
      } else {
        state.playlist = [];
      }

      state.detector = {
        threshold: Number(data.detector?.threshold ?? 0.02),
        minSilenceMs: Number(data.detector?.minSilenceMs ?? 320),
        windowMs: Number(data.detector?.windowMs ?? 80)
      };
      state.offsetSeconds = Number(data.offsetSeconds ?? 0);
      state.audioMeta = data.audioMeta || null;
    } catch {
      showMessage(t("err_local_state_invalid"), true);
    }
  }

  function renderLyricsUI() {
    refs.lyricsInput.value = state.lyricsOriginal;
    refs.paragraphCount.textContent = t("paragraph_count", { count: state.paragraphs.length });
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
      refs.karaokeView.innerHTML = `<p class="empty">${t("no_paragraphs")}</p>`;
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
    const base = state.audioMeta?.name || t("track_default_name");
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return `${base} · ${stamp}`;
  }

  function renderPlaylist() {
    if (!refs.playlistView || !refs.playlistCount || !refs.playlistSelect) return;

    const totalTracks = state.playlist.reduce((count, playlist) => {
      return count + (Array.isArray(playlist.items) ? playlist.items.length : 0);
    }, 0);

    refs.playlistCount.textContent = t("playlist_count", { count: totalTracks });

    if (!totalTracks) {
      refs.playlistView.innerHTML = `<p class="empty">${t("no_playlists_saved")}</p>`;
      refs.playlistSelect.innerHTML = `<option value="">${t("new_playlist")}</option>`;
      return;
    }

    refs.playlistView.innerHTML = "";
    refs.playlistSelect.innerHTML = `<option value="">${t("new_playlist")}</option>`;

    state.playlist.forEach((playlist) => {
      if (!Array.isArray(playlist.items) || !playlist.items.length) return;

      const option = document.createElement("option");
      option.value = playlist.id;
      option.textContent = playlist.title;
      refs.playlistSelect.appendChild(option);

      playlist.items.forEach((item) => {
        const wrapper = document.createElement("article");
        wrapper.className = "playlist-item";

        const date = new Date(item.createdAt || Date.now());
        const hasTimes = (item.calibratedTimes?.length || item.autoTimes?.length || 0) > 0;
        const locale = DATE_LOCALES[currentLanguage] || "es-ES";
        wrapper.innerHTML = `
          <div class="playlist-item-main">
            <div>
              <div class="playlist-item-title">${item.title}</div>
              <div class="playlist-item-meta">${item.audioMeta?.name || t("playlist_no_audio")} · ${t("paragraph_count", { count: item.paragraphs.length })} · ${hasTimes ? t("playlist_sync_yes") : t("playlist_sync_no")}</div>
              <div class="playlist-item-meta">${date.toLocaleString(locale)}</div>
            </div>
            <div class="playlist-item-actions">
              <button class="secondary" data-action="load" data-id="${item.id}">${t("btn_load")}</button>
              <button data-action="play" data-id="${item.id}">${t("btn_load_play")}</button>
              <button class="danger" data-action="delete" data-id="${item.id}">${t("btn_delete")}</button>
            </div>
          </div>
        `;

        refs.playlistView.appendChild(wrapper);
      });
    });
  }

  function addCurrentToPlaylist() {
    if (!refs.playlistTitleInput || !refs.playlistSelect) {
      return showMessage(t("err_playlist_ui_unavailable"), true);
    }

    if (!state.audioMeta) return showMessage(t("err_select_audio_first"), true);
    if (!state.paragraphs.length) return showMessage(t("err_add_lyrics_first"), true);

    const times = getEffectiveTimes();
    if (!times.length) {
      return showMessage(t("err_sync_first"), true);
    }

    const selectedPlaylist = refs.playlistSelect.value;
    let playlist = state.playlist.find((entry) => entry.id === selectedPlaylist);
    const trackTitle = refs.playlistTitleInput.value.trim() || buildDefaultPlaylistTitle();

    if (!playlist) {
      playlist = {
        id: generateId(),
        title: t("playlist_name", { index: state.playlist.length + 1 }),
        items: []
      };
      state.playlist.push(playlist);
    }

    const snapshot = {
      id: generateId(),
      title: trackTitle,
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
    refs.playlistSelect.value = playlist.id;
    refs.playlistTitleInput.value = "";
    showMessage(t("msg_track_added_playlist"));
  }

  function findPlaylistItemById(id) {
    for (const playlist of state.playlist) {
      if (!Array.isArray(playlist.items)) continue;
      const item = playlist.items.find((entry) => entry.id === id);
      if (item) return { playlist, item };
    }
    return null;
  }

  function deletePlaylistItem(id) {
    let removed = false;

    state.playlist = state.playlist
      .map((playlist) => {
        if (!Array.isArray(playlist.items)) return playlist;
        const before = playlist.items.length;
        playlist.items = playlist.items.filter((item) => item.id !== id);
        if (playlist.items.length !== before) removed = true;
        return playlist;
      })
      .filter((playlist) => Array.isArray(playlist.items) && playlist.items.length > 0);

    if (!removed) return;
    saveStateToLocalStorage();
    renderPlaylist();
    showMessage(t("msg_track_deleted_playlist"));
  }

  function clearPlaylist() {
    if (!state.playlist.length) return showMessage(t("msg_playlist_empty_already"));
    state.playlist = [];
    saveStateToLocalStorage();
    renderPlaylist();
    showMessage(t("msg_playlist_cleared"));
  }

  function renderFullscreenParagraph() {
    if (!refs.fullscreenParagraph) return;
    if (!state.paragraphs.length) {
      refs.fullscreenParagraph.textContent = t("no_paragraphs");
      return;
    }
    const currentIdx = getCurrentParagraphIndex();
    refs.fullscreenParagraph.textContent = state.paragraphs[currentIdx] || "";
  }

  function isToolsModalOpen() {
    return refs.toolsModal && !refs.toolsModal.hidden;
  }

  function getToolsModalFocusableElements() {
    if (!refs.toolsModal) return [];
    const selector =
      'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(refs.toolsModal.querySelectorAll(selector)).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.hidden) return false;
      if (element.closest("[hidden]")) return false;
      return true;
    });
  }

  function openToolsModal() {
    if (!refs.toolsModal || isToolsModalOpen()) return;
    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementBeforeToolsModal = document.activeElement;
    }
    refs.toolsModal.hidden = false;
    document.body.style.overflow = "hidden";

    const focusable = getToolsModalFocusableElements();
    if (focusable.length) {
      focusable[0].focus();
      return;
    }

    refs.closeToolsModalBtn?.focus();
  }

  function closeToolsModal() {
    if (!refs.toolsModal || !isToolsModalOpen()) return;
    refs.toolsModal.hidden = true;
    document.body.style.overflow = "";

    if (lastFocusedElementBeforeToolsModal && document.contains(lastFocusedElementBeforeToolsModal)) {
      lastFocusedElementBeforeToolsModal.focus();
    } else {
      refs.openToolsModalBtn?.focus();
    }
  }

  function isFullscreenKaraokeOpen() {
    return !refs.fullscreenKaraoke.hidden;
  }

  function renderFullscreenToggleButton() {
    refs.openFullscreenBtn.textContent = isFullscreenKaraokeOpen()
      ? t("fullscreen_close")
      : t("fullscreen_open");
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
        showMessage(t("err_fullscreen_browser"), true);
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
    if (!total) return t("pending_none");
    if (done >= total) return t("pending_done");
    return t("pending_next", {
      current: done + 1,
      total,
      text: `${state.paragraphs[done].slice(0, 90)}${state.paragraphs[done].length > 90 ? "..." : ""}`
    });
  }

  function renderMode() {
    const isAuto = state.mode === "auto";
    refs.modeStatus.textContent = t("mode_status", {
      mode: isAuto ? t("mode_name_auto") : t("mode_name_calibration")
    });
    refs.modeAutoBtn.disabled = isAuto;
    refs.modeCalibBtn.disabled = !isAuto;
    refs.nextPending.textContent = isAuto
      ? t("mode_auto_active")
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
    if (!file) return showMessage(t("err_no_audio_file_selected"), true);

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
      showMessage(t("msg_audio_saved_indexeddb"));
    } catch (err) {
      showMessage(t("err_process_audio", { error: err.message }), true);
    }
  }

  async function runAutoSync() {
    if (!state.paragraphs.length) return showMessage(t("err_add_lyrics_first_short"), true);
    if (!refs.audio.src) return showMessage(t("err_select_audio_first"), true);

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
      showMessage(t("msg_auto_sync_done", { count: mapped.length }));
    } catch (err) {
      showMessage(t("err_auto_sync", { error: err.message }), true);
    }
  }

  function markNextParagraph() {
    if (state.mode !== "calibration") return;
    if (refs.audio.paused) return;
    if (!state.paragraphs.length) return;
    if (state.calibratedTimes.length >= state.paragraphs.length) {
      return showMessage(t("msg_all_paragraphs_calibrated"));
    }

    const mark = Math.max(0, refs.audio.currentTime + state.offsetSeconds);
    state.calibratedTimes.push(mark);
    state.calibratedTimes.sort((a, b) => a - b);

    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
  }

  function undoLastMarker() {
    if (!state.calibratedTimes.length) return showMessage(t("msg_no_markers_undo"));
    state.calibratedTimes.pop();
    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
    showMessage(t("msg_last_marker_removed"));
  }

  function clearAllTimes() {
    state.autoTimes = [];
    state.calibratedTimes = [];
    saveStateToLocalStorage();
    refs.nextPending.textContent = getNextPendingText();
    renderKaraoke();
    showMessage(t("msg_times_cleared"));
  }

  async function exportProject() {
    const payload = buildProjectPayload();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");

    if (typeof JSZip === "undefined") {
      const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      downloadBlob(jsonBlob, `karaoke-project-${ts}.json`);
      showMessage(t("warn_jszip_not_available_export"), true);
      return;
    }

    try {
      const zip = new JSZip();
      const packagedPayload = {
        ...payload,
        package: {
          format: PROJECT_PACKAGE_VERSION,
          audioPath: null
        }
      };
      let audioIncluded = false;

      if (state.audioMeta) {
        const found = await getAudioBlob(state.audioMeta);
        if (found?.blob) {
          const safeAudioName = sanitizeFileName(state.audioMeta.name || found.name || "audio-importado");
          const audioPath = `audio/${safeAudioName}`;
          const normalizedMeta = normalizeImportedAudioMeta(
            {
              ...state.audioMeta,
              name: safeAudioName,
              type: found.type || state.audioMeta.type,
              size: found.blob.size,
              duration: state.audioMeta.duration
            },
            safeAudioName,
            found.blob
          );

          packagedPayload.audioMeta = normalizedMeta;
          packagedPayload.package.audioPath = audioPath;
          zip.file(audioPath, found.blob);
          audioIncluded = true;
        }
      }

      zip.file("project.json", JSON.stringify(packagedPayload, null, 2));
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      downloadBlob(zipBlob, `karaoke-project-${ts}.zip`);
      showMessage(
        audioIncluded
          ? t("msg_export_zip_with_audio")
          : t("warn_export_zip_without_audio"),
        !audioIncluded
      );
    } catch (err) {
      showMessage(t("err_export_zip", { error: err.message }), true);
    }
  }

  function applyImportedProjectData(data) {
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
  }

  async function importProjectFromJsonData(data) {
    applyImportedProjectData(data);

    if (state.audioMeta) {
      const restored = await restoreAudioFromMeta(state.audioMeta, {
        successMessage: t("hint_audio_restored"),
        missingMessage: t("hint_audio_missing_select_manually")
      });
      showMessage(restored ? t("msg_imported_restored") : t("warn_imported_missing_audio"), !restored);
      return;
    }

    refs.audioRestoreHint.textContent = t("hint_imported_without_audio_meta");
    showMessage(t("warn_imported_without_audio"), true);
  }

  async function importProjectFromZip(file) {
    if (typeof JSZip === "undefined") {
      showMessage(t("err_import_zip_no_jszip"), true);
      return;
    }

    const zip = await JSZip.loadAsync(file);
    const declaredProject = zip.file("project.json");
    const fallbackProject = zip
      .filter((path, entry) => !entry.dir && path.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name))[0];
    const projectEntry = declaredProject || fallbackProject;

    if (!projectEntry) {
      throw new Error(t("err_zip_no_project_json"));
    }

    const data = JSON.parse(await projectEntry.async("string"));
    applyImportedProjectData(data);

    const declaredAudioPath =
      typeof data.package?.audioPath === "string" && data.package.audioPath.trim()
        ? data.package.audioPath.trim()
        : null;

    let audioEntry = declaredAudioPath ? zip.file(declaredAudioPath) : null;
    if (!audioEntry) {
      const audioCandidates = zip
        .filter((path, entry) => !entry.dir && path.toLowerCase().startsWith("audio/"))
        .sort((a, b) => a.name.localeCompare(b.name));
      audioEntry = audioCandidates[0] || null;
    }

    if (!audioEntry) {
      if (state.audioMeta) {
        const restored = await restoreAudioFromMeta(state.audioMeta, {
          successMessage: t("hint_zip_audio_restored_local"),
          missingMessage: t("hint_zip_audio_missing_attach")
        });
        showMessage(restored ? t("msg_zip_imported_audio_local") : t("warn_zip_imported_without_audio"), !restored);
        return;
      }

      refs.audioRestoreHint.textContent = t("hint_zip_without_audio_file");
      showMessage(t("warn_zip_imported_without_audio"), true);
      return;
    }

    const blob = await audioEntry.async("blob");
    const fallbackName = audioEntry.name.split("/").pop() || "audio-importado";
    const importedMeta = normalizeImportedAudioMeta(data.audioMeta, fallbackName, blob);

    await saveAudioBlob(importedMeta, blob);
    state.audioMeta = importedMeta;
    saveStateToLocalStorage();
    renderAudioMeta();

    const restored = await restoreAudioFromMeta(importedMeta, {
      successMessage: t("hint_audio_imported_from_zip"),
      missingMessage: t("hint_audio_imported_zip_failed")
    });

    showMessage(
      restored
        ? t("msg_zip_imported_full")
        : t("warn_zip_imported_audio_restore_fail"),
      !restored
    );
  }

  async function importProjectFromFile(file) {
    try {
      const isZip = /\.zip$/i.test(file.name) || file.type === "application/zip";
      if (isZip) {
        await importProjectFromZip(file);
        return;
      }

      const text = await file.text();
      const data = JSON.parse(text);
      await importProjectFromJsonData(data);
    } catch (err) {
      showMessage(t("err_import_file", { error: err.message }), true);
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
          showMessage(t("err_audio_play_after_restore", { error: err.message }), true);
        }
      }

      return true;
    } catch {
      refs.audioRestoreHint.textContent = t("hint_audio_missing_select_manually");
      return false;
    }
  }

  async function loadPlaylistItem(id, autoplay = false) {
    const found = findPlaylistItemById(id);
    if (!found?.item) return showMessage(t("err_playlist_item_not_found"), true);

    const { item } = found;

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
    refs.nextPending.textContent = state.mode === "auto" ? t("mode_auto_active") : getNextPendingText();

    if (!state.audioMeta) {
      refs.audioRestoreHint.textContent = t("hint_track_loaded_no_audio");
      showMessage(t("warn_track_loaded_without_audio"), true);
      return;
    }

    const restored = await restoreAudioFromMeta(state.audioMeta, {
      successMessage: t("hint_track_loaded", { title: item.title }),
      missingMessage: t("hint_track_missing_audio_select"),
      autoplay
    });

    if (!restored) {
      showMessage(t("warn_track_missing_audio"), true);
      return;
    }

    showMessage(autoplay ? t("msg_track_playing", { title: item.title }) : t("msg_track_loaded", { title: item.title }));
  }

  async function restoreAudioFromIndexedDBIfPossible() {
    if (!state.audioMeta) return;
    await restoreAudioFromMeta(state.audioMeta);
  }

  function attachEvents() {
    refs.languageSelect?.addEventListener("change", (event) => {
      const value = event.target instanceof HTMLSelectElement ? event.target.value : "es";
      setLanguage(value);
    });

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
      showMessage(t("msg_lyrics_applied", { count: state.paragraphs.length }));
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
    refs.exportBtn.addEventListener("click", async () => {
      await exportProject();
      closeToolsModal();
    });

    refs.importFile.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importProjectFromFile(file);
      refs.importFile.value = "";
      closeToolsModal();
    });

    refs.deleteStoredAudioBtn.addEventListener("click", async () => {
      try {
        if (!state.audioMeta) return showMessage(t("err_no_audio_metadata_delete"));
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
        refs.audioRestoreHint.textContent = t("hint_audio_deleted_indexeddb");
        showMessage(t("msg_audio_deleted"));
      } catch (err) {
        showMessage(t("err_delete_audio", { error: err.message }), true);
      }
    });

    refs.openFullscreenBtn.addEventListener("click", toggleFullscreenKaraoke);
    refs.closeFullscreenBtn.addEventListener("click", closeFullscreenKaraoke);
    refs.openToolsModalBtn?.addEventListener("click", openToolsModal);
    refs.closeToolsModalBtn?.addEventListener("click", closeToolsModal);
    refs.toolsModalBackdrop?.addEventListener("click", closeToolsModal);

    refs.fsPlayBtn.addEventListener("click", async () => {
      try {
        await refs.audio.play();
      } catch (err) {
        showMessage(t("err_audio_play", { error: err.message }), true);
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

    if (refs.addToPlaylistBtn) {
      refs.addToPlaylistBtn.addEventListener("click", addCurrentToPlaylist);
    }

    if (refs.clearPlaylistBtn) {
      refs.clearPlaylistBtn.addEventListener("click", clearPlaylist);
    }

    if (refs.playlistView) {
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
    }

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
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        startLiveAnalysisLoop();
      } catch (err) {
        showMessage(t("err_web_audio_start", { error: err.message }), true);
      }
    });

    refs.audio.addEventListener("pause", stopLiveAnalysisLoop);
    refs.audio.addEventListener("ended", stopLiveAnalysisLoop);

    document.addEventListener("keydown", (e) => {
      if (isToolsModalOpen() && e.key === "Escape") {
        e.preventDefault();
        closeToolsModal();
        return;
      }

      if (isToolsModalOpen()) {
        if (e.key === "Tab") {
          const focusable = getToolsModalFocusableElements();
          if (!focusable.length) {
            e.preventDefault();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          const isInsideModal = active instanceof Node && refs.toolsModal?.contains(active);

          if (e.shiftKey) {
            if (!isInsideModal || active === first) {
              e.preventDefault();
              last.focus();
            }
          } else if (!isInsideModal || active === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }

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
              showMessage(t("err_audio_play", { error: err.message }), true);
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
    setLanguage(detectInitialLanguage(), { persist: false });

    try {
      await openDB();
    } catch (err) {
      showMessage(t("err_indexeddb_unavailable", { error: err.message }), true);
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
    if (refs.pwaVersion) refs.pwaVersion.textContent = "PWA v—";

    if (shouldPersistMigratedState) {
      saveStateToLocalStorage();
      shouldPersistMigratedState = false;
    }

    await restoreAudioFromIndexedDBIfPossible();
    await registerServiceWorker();
    attachEvents();
    window.addEventListener("beforeunload", () => {
      if (currentAudioObjectUrl) URL.revokeObjectURL(currentAudioObjectUrl);
    });
  }

  init();
})();
