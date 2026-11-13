# Prompts del frontend — pégalos en Claude Code, uno por uno

**Antes:** crea el repo `uco-kudos-frontend`, clónalo, copia `CLAUDE.md` y `.github/` de este kit y la documentación a `docs/`. Crea `.gitignore` con `node_modules/`, `dist/`, `.env`.

---

## F1 · Proyecto Vite PWA
**Qué hace:** crea la app base, el manifest PWA y la capa de API.
**Prompt:**
> Lee CLAUDE.md. Crea un proyecto Vite + React + TypeScript en esta carpeta (sin borrar CLAUDE.md ni .github), agrega `react-router-dom`, `@microsoft/fetch-event-source`, `vite-plugin-pwa` y Vitest. Configura la PWA según la sección DRV-001 de CLAUDE.md (manifest completo con íconos 192/512 y maskable, `theme_color`, `display: standalone`, service worker con página offline) y pon el meta viewport y una hoja de estilos base mobile first (360 px como punto de partida, variables CSS, botones ≥ 44 px, inputs ≥ 16 px). Crea `src/api/cliente.ts` con funciones `login`, `categorias`, `destinatarios`, `publicarKudo` (multipart) que usan `VITE_API_URL` y el token Bearer, y convierten `problem+json` en errores legibles. Agrega `.env.example`. `npm run build`. No hagas commit.

**Commit:** `chore: proyecto Vite PWA y cliente de API`

---

## F2 · Login y rutas protegidas
**Prompt:**
> Implementa la página de Login (correo y clave, estados de carga y error), un contexto de sesión (token en memoria + `sessionStorage`), rutas protegidas con `react-router-dom` y botón de cerrar sesión. Mobile first a 360 px: formulario de una columna, `type="email"` y `autocomplete`, botón grande al alcance del pulgar, sin scroll horizontal. Una prueba de Vitest del cliente de login con `fetch` simulado. `npm run build && npm test -- --run`. No hagas commit.

**Commit:** `feat: login y sesión`

---

## F3 · Publicar Kudo
**Prompt:**
> Implementa la página "Publicar Kudo": select de destinatario y de categoría (cargados del backend), textarea para el contenido (sin límite de longitud en el cliente), input de archivos múltiple con `accept="image/*,application/pdf"` (pdf/png/jpg, máximo 5 MB c/u validado en el cliente; lista con nombre, tamaño y botón para quitar cada archivo), envío multipart y mensaje de éxito con el `traceId`. Mostrar el `detail` de los errores 400/422. `npm run build`. No hagas commit.

**Commit:** `feat: publicar Kudo con adjuntos`

---

## F4 · Notificaciones en tiempo real (SSE)
**Prompt:**
> Tras el login, abre `GET /notificaciones/stream` con `fetchEventSource` enviando `Authorization: Bearer`, reconexión automática, reconexión también al volver a la pestaña (`visibilitychange`) y al recuperar red (`online`), y cierre al hacer logout. Toast legible en 360 px. Al recibir el evento `kudo-publicado` muestra un aviso (toast) y agrégalo a una lista "Recibidos en esta sesión". Prueba manual: dos navegadores (uno con el autor, otro con el destinatario). `npm run build`. No hagas commit.

**Commit:** `feat: notificaciones push en tiempo real (SSE)`

---

## F5 · Verificación móvil (DRV-001)
**Qué hace:** demuestra que cumples Mobile First, que es lo que el docente va a mirar.
**Prompt:**
> Revisa todas las pantallas a 360×640 y 412×915: sin scroll horizontal, objetivos táctiles ≥ 44 px, inputs ≥ 16 px, contraste suficiente, foco visible. Corrige lo que falle con el cambio mínimo. Luego dime cómo correr Lighthouse en modo móvil sobre `npm run preview` y qué ajustes típicos subirían Performance y PWA.

**Tú:** abre la URL de Vercel **en tu celular real**, instálala ("Agregar a pantalla de inicio"), publica un Kudo con una foto desde la cámara y toma capturas. Guarda también el informe de Lighthouse móvil (`evidencias/13-movil-*.png`, evidencia extra de DRV-001).

**Commit:** `fix(ui): ajustes mobile first y PWA`

---

## F6 · Despliegue en Vercel (lo haces tú)
1. En Vercel: *Add New → Project* desde el repo; framework Vite; variable `VITE_API_URL` apuntando a tu API en Render.
2. En *Settings → Git → Deploy Hooks* crea un hook para `main` y guárdalo en GitHub como secret `VERCEL_DEPLOY_HOOK_URL`. Variables de Actions: `APP_URL`, `SONAR_ORG`, `SONAR_PROJECT_KEY`; secret `SONAR_TOKEN`. Desactiva el auto-deploy por Git en Vercel para que el despliegue lo dispare el workflow (así el CD queda como evidencia).
3. En Render, `CORS_ALLOWED_ORIGIN` debe ser la URL de Vercel.

**Commit:** `ci: pipeline CI/CD del frontend`
