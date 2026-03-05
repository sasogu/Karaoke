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

## Canciones subidas en GitHub (MP3 + sincronización)

La app incluye una sección **Canciones subidas** que carga automáticamente `catalog/canciones.json` y muestra temas **por categorías** en un bloque separado de la playlist local.

### URL limpia solo de publicadas

Además de la app completa, tienes una vista pública dedicada en:

- `/publicadas/`

En GitHub Pages normalmente quedará como:

- `https://USUARIO.github.io/REPO/publicadas/`

Esta página carga solo el catálogo publicado y no muestra herramientas de edición.

### Compartir canción en pantalla completa

En la vista `/publicadas/`, cada canción incluye botón **Compartir**.

El enlace generado apunta a la misma vista pública pero forzando:

- canción seleccionada,
- modo pantalla completa,
- intento de reproducción automática.

Formato de ejemplo:

- `/publicadas/?song=mi-cancion-1&fullscreen=1&autoplay=1`

Parámetros:

- `song`: ID de canción del catálogo (`id` en `catalog/canciones.json`).
- `fullscreen=1`: abre directamente la vista de karaoke ampliada.
- `autoplay=1`: intenta iniciar la reproducción automáticamente al cargar.

> Nota: algunos navegadores pueden bloquear autoplay con audio hasta interacción del usuario.

### Formato del catálogo

Puedes usar:

- un array directo de canciones, o
- un objeto con `songs: []`.

Ejemplo mínimo:

```json
{
  "songs": [
    {
      "id": "mi-cancion-1",
      "title": "Mi canción",
      "audioUrl": "https://raw.githubusercontent.com/USUARIO/REPO/main/audio/mi-cancion.mp3",
      "lyricsOriginal": "Párrafo 1\n\nPárrafo 2",
      "times": {
        "calibrated": [0, 14.2]
      }
    }
  ]
}
```

Campos soportados por canción:

- `title` (obligatorio)
- `audioUrl` (obligatorio)
- `lyricsOriginal` o `paragraphs`
- `times.auto` y/o `times.calibrated`
- `offsetSeconds`, `detector`, `audioMeta`

### Cómo publicarlo

1. Sube los MP3 al repositorio (por ejemplo en `audio/`).
2. Crea el catálogo JSON (por ejemplo `catalog/canciones.json`).
3. Publica con GitHub Pages o usa URL directa de `raw.githubusercontent.com`.
4. Recarga la app y el listado publicado aparecerá automáticamente.

> Nota: los archivos deben ser accesibles públicamente por URL para que el navegador pueda reproducirlos.

### Flujo editorial recomendado (sin editar el catálogo a mano)

Estructura sugerida en el repo:

- `audio/` → MP3 (u otros formatos soportados)
- `sync/` → JSON de sincronización por canción (`sync/<nombre>.json`)
- `catalog/canciones.json` → catálogo generado automáticamente

También puedes definir canciones remotas sin archivo local en `audio/`: crea directamente un `sync/*.json` con `title` y `audioUrl`.

Campos útiles para organización:

- `category`: slug de categoría (`pop`, `rock`, `clasicos`)
- `categoryTitle`: nombre visible de categoría (`Pop`, `Rock`, `Clásicos`)

Genera el catálogo con (recomendado para GitHub Pages):

```bash
node scripts/generate-catalog.mjs
```

Si prefieres URLs absolutas (por ejemplo para consumir fuera del sitio):

```bash
node scripts/generate-catalog.mjs \
   --audio-url-mode absolute \
   --base-url https://raw.githubusercontent.com/USUARIO/REPO/main
```

Opciones útiles:

- `--audio-url-mode relative|absolute` (default: `relative`)
- `--audio-dir audio`
- `--sync-dir sync`
- `--output catalog/canciones.json`

Detalles del formato de los JSON de sincronización en `sync/README.md`.

### GitHub Actions (autogeneración en cada push)

Se incluye el workflow [`.github/workflows/update-catalog.yml`](.github/workflows/update-catalog.yml) para regenerar `catalog/canciones.json` automáticamente cuando cambien `audio/`, `sync/` o el script generador.

Flujo:

1. Haces push a `main`.
2. Action ejecuta `scripts/generate-catalog.mjs`.
3. Si hay cambios, hace commit automático del catálogo.

### Exportar tema publicable desde la app

En **Sincronización y exportar → Publicar en catálogo** puedes descargar un JSON publicable del tema actual.

Flujo sugerido:

1. Sincronizas el tema en la app.
2. Pulsas **Exportar JSON publicable**.
3. Guardas el archivo descargado en `sync/`.
4. Añades el audio en `audio/` (o dejas `audioUrl` remoto en el JSON).
5. Ejecutas el generador y publicas cambios en GitHub.

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
