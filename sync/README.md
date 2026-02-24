# Archivos de sincronización por canción

Para cada audio en `audio/`, puedes crear un JSON en esta carpeta con el mismo nombre base.

Ejemplo:

- `audio/mi-cancion.mp3`
- `sync/mi-cancion.json`

Formato recomendado:

```json
{
  "id": "mi-cancion",
  "title": "Mi canción",
  "category": "pop",
  "categoryTitle": "Pop",
  "lyricsOriginal": "Párrafo 1\n\nPárrafo 2",
  "paragraphs": ["Párrafo 1", "Párrafo 2"],
  "times": {
    "auto": [0, 13.4],
    "calibrated": [0, 13.1]
  },
  "offsetSeconds": 0,
  "detector": {
    "threshold": 0.02,
    "minSilenceMs": 320,
    "windowMs": 80
  },
  "audioMeta": {
    "name": "mi-cancion.mp3",
    "type": "audio/mpeg"
  }
}
```

Campos mínimos para que una canción sea válida en catálogo:

- `title`
- `audioUrl` (si no existe audio local en `audio/`)

Campos recomendados:

- `category` (slug para agrupar)
- `categoryTitle` (nombre visible)

Si un campo no está en este JSON, el generador intenta inferirlo.
