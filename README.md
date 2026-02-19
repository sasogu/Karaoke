# Karaoke por párrafos (HTML5 estático)

Proyecto sin frameworks ni backend, compatible con GitHub Pages y ejecución local abriendo `index.html`.

## Archivos

- `index.html`
- `style.css`
- `app.js`
- `README.md`

## Uso local

1. Abre `index.html` en un navegador moderno.
2. Selecciona un audio.
3. Pega la letra y pulsa **Aplicar letra**.
4. Sincroniza:
   - **Auto-sincronizar** (RMS + silencios), o
   - **Modo Calibración** + barra espaciadora para marcar párrafos.
5. Exporta/importa proyectos en JSON.

## GitHub Pages

1. Sube los archivos al repo.
2. Ve a **Settings → Pages**.
3. Source: **Deploy from a branch**, branch `main` (root).
4. Guarda y usa la URL generada.

## Persistencia

### localStorage

Se guarda automáticamente:

- letra original,
- párrafos,
- tiempos (auto y calibrados),
- parámetros del detector,
- offset,
- metadatos del audio (nombre, tipo, tamaño, duración).

### IndexedDB

- DB: `karaokeDB`
- Store: `audios`
- Clave primaria: `nombre::tamaño`
- Se guarda el Blob del audio para restauración automática.

### Partes clave de IndexedDB (en `app.js`)

1. **`openDB()`**
   - `indexedDB.open("karaokeDB", 1)`
   - `onupgradeneeded` crea store `audios`.
2. **Guardar**
   - `transaction(..., "readwrite")`
   - `store.put({ id, blob, ...meta })`
3. **Leer**
   - `transaction(..., "readonly")`
   - `store.get(id)`
4. **Eliminar**
   - `transaction(..., "readwrite")`
   - `store.delete(id)`

## Exportar / Importar

### Exportar proyecto

Genera JSON descargable con:

- versión,
- letra,
- párrafos,
- tiempos,
- parámetros,
- offset,
- metadatos de audio.

**No incluye audio** (JSON pequeño y portable).

### Importar proyecto

- Carga JSON y restaura estado.
- Intenta restaurar audio desde IndexedDB con metadatos.
- Si no existe, pide seleccionar audio manualmente.

## Notas de rendimiento

- El análisis en vivo se pausa cuando el audio está en pausa.
- Ventana configurable entre 50 y 100 ms para evitar saturar CPU.
- Errores de IndexedDB y parsing se manejan con mensajes amigables.
