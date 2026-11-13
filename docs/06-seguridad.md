# 06 · Desarrollo seguro

Principios: **defensa en profundidad**, **mínimo privilegio**, **denegar por defecto**, **validar en cada frontera**, **no confiar en el cliente**.

## 1. Autenticación

| Aspecto | Decisión |
|---|---|
| Credenciales | Correo institucional + clave. |
| Almacenamiento de claves | **BCrypt** (factor de costo configurable); nunca texto plano ni reversible. |
| Sesión | **JWT de acceso de vida corta** (p. ej. 60 min) firmado con secreto de ≥ 256 bits desde variable de entorno. Sin estado en el servidor. |
| Contenido del token | `sub` (id de persona), `rol`, `exp`, `iat`. Sin datos sensibles. |
| Cuenta activa | Solo cuentas en estado `ACTIVA` pueden iniciar sesión. |
| Fuerza bruta | Límite de intentos por IP y por cuenta (Bucket4j) y mensajes genéricos ("credenciales inválidas"). |
| Evolución | *Refresh token* rotativo; RS256 u OIDC con el proveedor institucional (SSO). |

## 2. Autorización

- **RBAC** por rol institucional; **denegar por defecto**: todo endpoint exige autenticación salvo `/auth/login` y `/actuator/health`.
- Verificación en **dos niveles**: `@PreAuthorize` en el borde y regla de negocio dentro del caso de uso (el dominio no confía en que el controlador ya validó).
- Control de acceso a **objetos** (evitar IDOR): se valida que el recurso pertenece al ámbito del usuario (p. ej. un coordinador de programa solo administra personas de su programa).

| Acción | Roles autorizados |
|---|---|
| Publicar Kudo, replicar, calificar, reportar | Cualquier cuenta activa |
| Administrar categorías | `ADMIN`, `RECTOR`, `COORD_ACADEMICO` |
| Vetar contenido | `RECTOR`, `COORD_ACADEMICO` |
| Administrar personas | Según matriz "quién administra a quién" (01 §4) |
| Ver métricas / Prometheus | Credencial técnica separada |

## 3. Gestión de secretos

| Secreto | Dónde vive | Dónde nunca |
|---|---|---|
| Secreto JWT, contraseña de BD, clave de servicio de Supabase, API key de Brevo, SID/token de Twilio | Variables de entorno del servicio en Render; **GitHub Secrets** para los pipelines | Repositorio, imágenes Docker, logs, frontend |
| Claves públicas (URL del API) | Variables `VITE_*` del frontend (no son secretas) | — |

Controles: `.gitignore` de `.env`; **Trivy** (modo secretos) y escaneo de secretos de GitHub en cada cambio; rotación inmediata si se expone; la clave de servicio de Supabase solo existe en el backend.

## 4. Validaciones

| Frontera | Validación |
|---|---|
| Borde HTTP | Bean Validation (`@NotBlank`, `@Email`, tamaños), tipos y rangos; rechazo de campos desconocidos. |
| Dominio | Invariantes (autor ≠ destinatario, estrellas 1–5, rol único activo). |
| Base de datos | `NOT NULL`, `UNIQUE`, `CHECK`, claves foráneas. |
| Contenido textual | Se almacena tal cual y se **escapa al renderizar** (React lo hace por defecto); no se usa `dangerouslySetInnerHTML`. |
| Adjuntos | Lista blanca de tipos MIME y extensiones; verificación del tipo real por contenido; tamaño máximo; nombre sanitizado; clave de almacenamiento generada por el servidor (ver 07). |
| SQL | Consultas parametrizadas; sin concatenar entradas. |

## 5. Seguridad de la API

- **HTTPS obligatorio** (Render/Vercel lo proveen); cabeceras `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`/CSP.
- **CORS** restringido al origen del frontend desplegado.
- **Límite de tasa** por IP/usuario.
- **Límite técnico** de tamaño de petición (ver supuesto S-04).
- Respuestas de error **sin trazas internas**; formato uniforme (RFC 7807 `problem+json`) con `trace_id`.
- Contrato documentado con OpenAPI.
- Endpoints de Actuator expuestos solo en lo necesario y protegidos.
- **SSE autenticado**: el cliente usa `fetch` con cabecera `Authorization` (el `EventSource` nativo no permite cabeceras); no se envía el token en la URL.

## 6. Integraciones con terceros

| Tercero | Riesgo | Mitigación |
|---|---|---|
| Brevo (correo) | Fuga de API key; spam | Clave en secreto; remitente verificado; plantilla fija; sin contenido libre del usuario en el asunto. |
| Twilio (WhatsApp) | Fuga de credenciales; envío a números no consentidos | Credenciales en secreto; solo números verificados de la persona; el mensaje no incluye datos sensibles, solo aviso y enlace. |
| Supabase (BD/Storage) | Clave de servicio con acceso total | Solo en el backend; bucket privado; usuario de BD con privilegios mínimos. |
| Cualquier tercero | Caída o lentitud | *Timeouts*, reintentos, *circuit breaker*; la falla no afecta la transacción principal. |
| Cadena de suministro | Dependencias vulnerables | Dependabot + Trivy + SonarQube; versiones fijadas. |

## 7. Datos personales

Se tratan correo institucional y celular. Principio de **minimización**: no se envía más de lo necesario a los terceros; los logs no registran claves ni tokens ni el contenido completo de los mensajes. Se cumple el espíritu de la Ley 1581 de 2012 (protección de datos personales en Colombia): finalidad clara y acceso restringido.

## 8. Matriz de riesgos de seguridad (OWASP Top 10)

| Riesgo | Amenaza | Control | Residual |
|---|---|---|---|
| A01 Control de acceso roto | Un usuario accede a funciones o datos ajenos | RBAC + validación de ámbito + pruebas EC-01 | Bajo |
| A02 Fallas criptográficas | Claves o tokens expuestos | BCrypt, HTTPS, secretos en entorno | Bajo |
| A03 Inyección | SQL / XSS | Consultas parametrizadas; escape en UI | Bajo |
| A04 Diseño inseguro | Falta de modelado de amenazas | Esta matriz, ADR-0007, ArchUnit | Medio |
| A05 Configuración incorrecta | Endpoints o CORS abiertos | Denegar por defecto, revisión de Actuator, Trivy (configuración) | Bajo |
| A06 Componentes vulnerables | Librerías con CVE | Trivy, Dependabot, SonarQube | Medio |
| A07 Fallas de autenticación | Fuerza bruta, tokens robados | Límite de intentos, JWT corto | Medio |
| A08 Integridad de software/datos | Pipeline o dependencia comprometida | Acciones fijadas por versión, revisión de cambios, imágenes por SHA | Medio |
| A09 Fallas de registro y monitoreo | Ataque sin detectarse | Auditoría de solo inserción, logs con `trace_id`, métricas | Bajo |
| A10 SSRF | Peticiones a recursos internos | El servidor no consume URLs arbitrarias del usuario | Bajo |

## 9. Para la sustentación

- **"¿Dónde guarda las claves?"** En variables de entorno y GitHub Secrets; jamás en el repositorio; Trivy lo verifica.
- **"¿Cómo evita que un estudiante cree categorías?"** `@PreAuthorize` en el endpoint y la regla en el caso de uso; hay una prueba automatizada (EC-01).
