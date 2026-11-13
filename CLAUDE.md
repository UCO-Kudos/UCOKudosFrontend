# CLAUDE.md — uco-kudos-frontend

Proyecto integrador final de Ingeniería del Software II (UCO). **Individual**: el autor debe explicar y modificar en vivo cualquier línea. Código simple y legible.

## Alcance (línea base — NO construyas nada más)
PWA Mobile First con **tres pantallas**: (1) Login, (2) Publicar Kudo (destinatario, categoría, texto, adjuntos opcionales), (3) aviso en tiempo real cuando llega un Kudo (SSE) + lista mínima de avisos recibidos en la sesión. Nada de registro, réplicas, calificaciones ni moderación.

## Stack
React + Vite (JavaScript o TypeScript, lo que el autor prefiera; por defecto TypeScript) · `react-router-dom` · `fetch` nativo · `@microsoft/fetch-event-source` para SSE autenticado (el `EventSource` nativo **no** permite cabecera `Authorization`; el token **no** va en la URL) · `vite-plugin-pwa` (manifest + service worker) · Vitest para 2–3 pruebas · CSS simple (mobile first, sin librerías de UI; variables CSS para colores y espaciados).

## DRV-001 Movilidad — requisito de diseño (≈90 % de los usuarios usa celular; estrategia Mobile First)
Diseña y prueba **primero a 360×640 px**, y solo después amplía con `@media (min-width: 768px)` y `(min-width: 1024px)`. Reglas obligatorias:
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; una sola columna en móvil; sin scroll horizontal; `100dvh` en vez de `100vh`; respetar `env(safe-area-inset-*)`.
- **Objetivos táctiles ≥ 44×44 px** y separados; nada que dependa de `:hover`; botón principal fijo/visible al alcance del pulgar.
- Inputs con `font-size ≥ 16px` (evita el zoom de iOS), `type="email"`, `autocomplete`, `inputmode` y `enterkeyhint` correctos.
- Adjuntos: `<input type="file" multiple accept="image/*,application/pdf">` (en el celular ofrece cámara/galería); mostrar nombre y tamaño de cada archivo y poder quitarlo.
- **PWA instalable**: manifest (nombre, `start_url`, `display: standalone`, `theme_color`, íconos 192/512 y *maskable*), service worker que precachea el *shell* y una página offline simple con mensaje claro.
- Rendimiento en red móvil: carga perezosa por ruta (`React.lazy`), sin librerías pesadas, imágenes livianas. Meta: Lighthouse móvil con Performance/Accesibilidad/PWA lo más altos posible (captura como evidencia).
- SSE en móvil: el navegador suspende la conexión con la pantalla bloqueada o la pestaña en segundo plano → reconectar al volver (`visibilitychange`) y al recuperar red (`online`). Limitación documentada: no hay push con la app cerrada (eso requeriría Web Push; fuera del alcance); WhatsApp y correo cubren ese caso.

## Contrato con el backend (docs/11-modelo-de-datos-y-api.md)
Base: `import.meta.env.VITE_API_URL` (ej. `https://…onrender.com/api`).
- `POST /auth/login` `{correo, clave}` → `{token, ...}`
- `GET /categorias`, `GET /personas/destinatarios` (Bearer)
- `POST /kudos` multipart: `destinatarioId`, `categoriaId`, `contenido`, `adjuntos[]` → `201 {id, traceId, ...}`; errores `application/problem+json` (mostrar `detail` al usuario)
- `GET /notificaciones/stream` (SSE, evento `kudo-publicado`)

## Reglas
- **Sin secretos**: solo `VITE_API_URL` (pública). El token JWT va en memoria (y `sessionStorage` si se necesita sobrevivir a recargas); nunca en logs.
- Estado de sesión en un contexto/hook simple; rutas protegidas.
- Accesibilidad básica (labels, foco, contraste) y mensajes de error claros.
- Estructura: `src/{api,components,pages,hooks}`.
- `.env.example` con `VITE_API_URL=http://localhost:8080/api`.

## Definición de terminado de cada paso
`npm run build` y `npm test -- --run` en verde · explicación breve (3–5 líneas) apta para sustentar · lista de archivos tocados · mensaje de commit sugerido. **No hagas `git commit` ni `git push`**.
