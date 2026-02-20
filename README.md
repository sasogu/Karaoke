# Karaoke por párrafos (HTML5 estático)

Proyecto sin frameworks ni backend, compatible con GitHub Pages y ejecución local abriendo `index.html`.

[https://sasogu.github.io/Karaoke/](https://)

Archivos

- `index.html`
- `style.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/icon-192.svg`
- `icons/icon-512.svg`
- `LICENSE` (MIT)
- `README.md`

## Licencia

Este proyecto se distribuye bajo licencia **MIT**. Revisa el archivo `LICENSE`.

## Local Usage

1. Sirve la carpeta con HTTP local (por ejemplo `python -m http.server 8080`).
2. Abre `http://localhost:8080` en un navegador moderno.
3. (Opcional) Instala la app como PWA desde el navegador.

> Nota: el service worker no funciona en `file://`; para PWA necesitas `http://localhost` o HTTPS.

## PWA (Versions and Cache Cleaning)

- La app registra `sw.js` automáticamente al iniciar.
- La versión de caché se controla con `APP_CACHE_VERSION` en `sw.js`.
- En `activate`, el service worker elimina cachés antiguas con prefijo `karaoke-pwa-*`.
- Si existe una versión nueva, la app avisa para recargar y aplicar la actualización.

### Publicar nueva versión de caché

1. Incrementa `APP_CACHE_VERSION` en `sw.js`.
2. Despliega archivos actualizados.
3. Recarga la app para activar el nuevo SW y limpiar cachés antiguas.

## Uso de karaoke

1. Selecciona un audio.
2. Pega la letra y pulsa **Aplicar letra**.
3. Sincroniza:
   - **Auto-sincronizar** (RMS + silencios), o
   - **Modo Calibración** + barra espaciadora para marcar párrafos.
4. Exporta/importa proyectos en JSON.

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
