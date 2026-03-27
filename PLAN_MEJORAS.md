# Plan de Mejoras de EduKaraoke

## Objetivo

Mejorar el proyecto de forma incremental sin perder la simplicidad actual del despliegue estático. El foco es:

- aumentar mantenibilidad
- reducir riesgos técnicos
- mejorar experiencia de uso
- introducir una base mínima de calidad y validación

## Principios de trabajo

- Hacer cambios pequeños y verificables.
- Evitar refactors masivos sin cobertura mínima.
- Mantener compatibilidad con GitHub Pages.
- Priorizar primero seguridad, robustez y estructura antes que cambios cosméticos.
- Cerrar cada fase con una validación clara.

## Orden recomendado

1. Endurecimiento técnico y correcciones de base
2. Base de tooling y validación
3. Refactor de arquitectura frontend
4. Mejora del flujo editorial y del catálogo
5. Mejora de UX de sincronización
6. Accesibilidad, rendimiento y documentación final

---

## Fase 0. Preparación

### Objetivo

Crear una base de trabajo segura para poder refactorizar sin perder control.

### Tareas

- Crear una rama de trabajo para mejoras.
- Definir una convención de commits.
- Añadir una checklist mínima para validar cambios manualmente.
- Documentar cómo levantar el proyecto en local.

### Entregables

- Rama dedicada de trabajo
- Checklist de validación manual

### Criterio de cierre

- Cualquier cambio puede probarse localmente de forma repetible.

---

## Fase 1. Endurecimiento técnico

### Objetivo

Reducir riesgos de seguridad y fallos funcionales antes de tocar la arquitectura.

### Problemas detectados

- Uso de `innerHTML` con datos dinámicos en varias pantallas.
- Dependencia de Bootstrap por CDN, lo que debilita el modo offline real.
- Service worker con fallback de navegación demasiado genérico.
- Documentación con algunos detalles inconsistentes.

### Tareas

- Sustituir renderizados con `innerHTML` dinámico por construcción segura de nodos.
- Revisar todas las zonas donde se inyectan títulos, nombres de archivo o textos del catálogo.
- Decidir si Bootstrap se elimina o se sirve en local.
- Ajustar el service worker para distinguir mejor entre `/` y `/publicadas/`.
- Revisar el comportamiento offline real en ambas vistas.
- Corregir enlaces y ejemplos rotos del `README.md`.

### Entregables

- Render seguro sin inyección HTML evitable
- PWA más coherente offline
- README corregido

### Criterio de cierre

- No quedan usos evitables de `innerHTML` con datos externos o persistidos.
- La app principal y `/publicadas/` cargan offline de forma consistente.

---

## Fase 2. Tooling y validación

### Objetivo

Introducir una base mínima de calidad para poder cambiar el código con menos riesgo.

### Tareas

- Crear `package.json`.
- Añadir scripts de desarrollo, lint y validación.
- Configurar ESLint para JS del navegador y service worker.
- Añadir Prettier opcional si interesa mantener formato estable.
- Añadir una validación del catálogo generado.
- Añadir validación de los JSON de `sync/`.
- Ejecutar el generador de catálogo desde un script estándar.

### Scripts sugeridos

- `npm run lint`
- `npm run check`
- `npm run build:catalog`
- `npm run validate:catalog`

### Entregables

- `package.json`
- Configuración de lint
- Validación automatizada de JSON

### Criterio de cierre

- Existe un único comando para comprobar que el proyecto está sano.

---

## Fase 3. Refactor de arquitectura frontend

### Objetivo

Dividir el código por responsabilidades para poder mantenerlo y ampliarlo.

### Problema principal

`app.js` concentra demasiadas responsabilidades y `publicadas/publicadas.js` duplica lógica importante.

### Estructura objetivo sugerida

- `src/core/i18n.js`
- `src/core/storage.js`
- `src/core/catalog.js`
- `src/core/audio.js`
- `src/features/karaoke.js`
- `src/features/playlist.js`
- `src/features/publish.js`
- `src/features/fullscreen.js`
- `src/app-main.js`
- `src/app-publicadas.js`

### Tareas

- Extraer funciones puras reutilizables primero.
- Extraer normalización de canciones y catálogo a un módulo compartido.
- Extraer i18n a un módulo común.
- Extraer persistencia `localStorage` e `IndexedDB`.
- Separar render de lógica de negocio.
- Dejar `app.js` y `publicadas/publicadas.js` como puntos de entrada o reemplazarlos por nuevos entrypoints.

### Estrategia

- No mover todo de golpe.
- Empezar por utilidades sin dependencia del DOM.
- Después mover persistencia.
- Después mover catálogo e i18n.
- Por último separar rendering y eventos.

### Entregables

- Código modular
- Menos duplicación entre app principal y vista pública

### Criterio de cierre

- La lógica compartida vive en módulos reutilizables y los entrypoints quedan claramente delimitados.

---

## Fase 4. Flujo editorial y catálogo

### Objetivo

Hacer más fiable y escalable la publicación de canciones.

### Tareas

- Definir un esquema claro para `sync/*.json`.
- Validar categorías, IDs, `audioUrl`, tiempos y campos obligatorios.
- Mejorar mensajes de error del generador cuando falten datos.
- Detectar duplicados de forma explícita y reportarlos mejor.
- Añadir un modo `--check` al generador para CI.
- Documentar mejor el flujo de publicación.

### Mejoras opcionales

- Generar un informe resumen al construir el catálogo.
- Marcar canciones sin sincronización o con metadatos incompletos.
- Separar contenido y aplicación si el repo sigue creciendo.

### Entregables

- Catálogo más fiable
- Errores editoriales detectados antes de publicar

### Criterio de cierre

- Un JSON mal formado o incompleto falla antes de llegar a producción.

---

## Fase 5. UX de sincronización

### Objetivo

Mejorar la parte más crítica del producto: sincronizar y ajustar letras.

### Tareas

- Permitir editar marcas manualmente.
- Añadir ajustes rápidos por bloque y offset fino.
- Añadir navegación al bloque siguiente o anterior.
- Mostrar con más claridad qué párrafo está pendiente.
- Añadir vista de lista de tiempos editable.
- Evaluar una vista de waveform simple si compensa.

### Mejoras opcionales

- Atajos de teclado más completos.
- Repetición de tramo para ajuste fino.
- Importación de formatos externos si aparece esa necesidad.

### Entregables

- Herramientas de edición más precisas
- Menos fricción al sincronizar canciones largas

### Criterio de cierre

- Corregir una sincronización manual deja de requerir rehacer el proceso completo.

---

## Fase 6. Accesibilidad y rendimiento

### Objetivo

Mejorar calidad percibida y compatibilidad en dispositivos reales.

### Tareas

- Revisar navegación completa por teclado.
- Añadir estados accesibles en controles dinámicos.
- Revisar contraste, foco y anuncios de estado.
- Medir tiempos de carga inicial.
- Revisar impacto del catálogo y del audio sobre memoria y caché.
- Revisar estrategia de almacenamiento local cuando haya muchos audios.

### Entregables

- Mejor soporte de teclado
- Mejor comportamiento en móviles y sesiones largas

### Criterio de cierre

- Las interacciones principales pueden hacerse sin ratón y sin degradación notable en dispositivos modestos.

---

## Fase 7. Documentación final

### Objetivo

Dejar el proyecto preparado para que cualquier cambio futuro sea más fácil.

### Tareas

- Reescribir `README.md` con estructura más clara.
- Añadir una guía de desarrollo.
- Añadir una guía de publicación de canciones.
- Añadir una guía de validación antes de desplegar.
- Documentar decisiones técnicas relevantes.

### Entregables

- README más claro
- Documentación de mantenimiento

### Criterio de cierre

- Una persona nueva puede entender cómo ejecutar, validar y publicar sin leer todo el código.

---

## Quick Wins

Estos cambios tienen muy buena relación impacto/esfuerzo:

- Corregir el enlace roto del `README.md`
- Eliminar `innerHTML` dinámico en listados
- Localizar o retirar Bootstrap CDN
- Crear `package.json` con `lint` y `check`
- Añadir validación de `sync/*.json`
- Mejorar fallback offline del service worker

---

## Riesgos a vigilar

- Refactorizar demasiado sin validación manual suficiente.
- Romper compatibilidad con GitHub Pages al introducir tooling.
- Duplicar código nuevo durante la transición de archivos monolíticos a módulos.
- Aumentar complejidad innecesaria para un proyecto que hoy funciona sin backend.

---

## Propuesta de ejecución por iteraciones

### Iteración 1

- Fase 1 completa
- Inicio de Fase 2 con `package.json` y lint básico

### Iteración 2

- Validación de catálogo y JSON
- Primeros módulos compartidos: `i18n`, `catalog`, `utils`

### Iteración 3

- Extraer persistencia y audio
- Reducir tamaño de `app.js`

### Iteración 4

- Mejoras de sincronización y edición manual de tiempos

### Iteración 5

- Accesibilidad, documentación y cierre de deuda residual

---

## Definición de hecho por tarea

Una mejora se considera terminada cuando:

- el cambio funciona en local
- no rompe la app principal
- no rompe `/publicadas/`
- queda reflejado en documentación si afecta al flujo
- pasa las comprobaciones definidas en el proyecto

---

## Siguiente paso recomendado

Empezar por una primera entrega pequeña y rentable:

1. corregir `README.md`
2. eliminar `innerHTML` dinámico más expuesto
3. revisar el service worker para offline real
4. crear `package.json` con comandos de comprobación

Ese bloque ya deja el proyecto bastante mejor sin entrar aún en un refactor grande.
