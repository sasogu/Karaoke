(() => {
  "use strict";

  function audioKey(meta) {
    return meta ? `${meta.name}::${meta.size}` : null;
  }

  function openAudioDB(options = {}) {
    const {
      dbName = "karaokeDB",
      dbVersion = 1,
      storeName = "audios",
      openErrorMessage = "Error al abrir IndexedDB"
    } = options;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(openErrorMessage));
    });
  }

  function saveAudioBlob(db, storeName, meta, blob) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return reject(new Error("Metadatos de audio inválidos"));

      const tx = db.transaction([storeName], "readwrite");
      const store = tx.objectStore(storeName);

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

  function getAudioBlob(db, storeName, meta) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return resolve(null);

      const tx = db.transaction([storeName], "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Error al leer audio"));
    });
  }

  function deleteAudioBlob(db, storeName, meta, deleteErrorMessage = "Error al borrar audio") {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error("DB no inicializada"));
      const id = audioKey(meta);
      if (!id) return resolve();

      const tx = db.transaction([storeName], "readwrite");
      tx.objectStore(storeName).delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(deleteErrorMessage));
    });
  }

  window.KaraokeStorage = {
    audioKey,
    openAudioDB,
    saveAudioBlob,
    getAudioBlob,
    deleteAudioBlob
  };
})();
