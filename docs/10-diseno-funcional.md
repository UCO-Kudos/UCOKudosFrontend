# 10 · Diseño funcional completo

> **Principio de alcance.** La documentación y el diseño cubren **todo** lo que pide el enunciado. Solo el **código** se limita a la línea base (login, categorías en lectura y el flujo *Publicar Kudo*). Cada caso de uso lleva su estado: **✅ Implementado** o **📐 Diseñado**.

## 1. Módulos del monolito

Cada módulo es un grupo de casos de uso con sus puertos; comparten las mismas tres capas (dominio, servicios, infraestructura).

| Módulo | Responsabilidad | Reglas | En código |
|---|---|---|---|
| **M1 Identidad y acceso** | Personas, roles activos, login, autorización | RN-01..04 | ✅ login y rol activo |
| **M2 Registro y activación** | Solicitud, verificación de correo y celular, activación | RN-05, RN-06 | 📐 |
| **M3 Aprobaciones** | Aprobar o rechazar según la jerarquía | Matriz de aprobación | 📐 |
| **M4 Estructura académica** | Facultades, programas, vínculos de estudiantes y docentes, administración de subordinados | RN-07..10 | 📐 (datos semilla ✅) |
| **M5 Categorías** | Catálogo y su administración | RN-11 | ✅ lectura · 📐 administración |
| **M6 Kudos y adjuntos** | Publicar, consultar, adjuntar | RN-12 | ✅ publicar, listar, adjunto |
| **M7 Interacción** | Réplicas y calificaciones | RN-13, RN-14 | 📐 |
| **M8 Moderación** | Reportes y vetos | RN-15, RN-16 | 📐 |
| **M9 Notificaciones** | Correo, WhatsApp, push | DRV-003 | ✅ |
| **M10 Auditoría y observabilidad** | Registro de acciones, métricas | DRV-006 | ✅ |

---

## 2. Catálogo de casos de uso

| ID | Caso de uso | Actor | Módulo | Estado |
|---|---|---|---|---|
| CU-01 | Iniciar sesión | Cualquier persona con cuenta activa | M1 | ✅ |
| CU-02 | Registrar solicitud de cuenta | Persona sin cuenta | M2 | 📐 |
| CU-03 | Verificar correo institucional | Solicitante | M2 | 📐 |
| CU-04 | Verificar celular | Solicitante | M2 | 📐 |
| CU-05 | Listar solicitudes pendientes de mi ámbito | Aprobador | M3 | 📐 |
| CU-06 | Aprobar solicitud | Aprobador según matriz | M3 | 📐 |
| CU-07 | Rechazar solicitud | Aprobador según matriz | M3 | 📐 |
| CU-08 | Gestionar facultades y programas | Administrador | M4 | 📐 |
| CU-09 | Vincular estudiante o docente a un programa | Coordinador de Programa | M4 | 📐 |
| CU-10 | Consultar programas de un estudiante o docente | Quien administra a esa persona | M4 | 📐 |
| CU-11 | Consultar el programa o facultad que acompaña un coordinador | Cualquier cuenta activa | M4 | 📐 |
| CU-12 | Suspender, reactivar o dar de baja a un subordinado | Quien lo administra | M4 | 📐 |
| CU-13 | Relevar a un titular único (Rector, Coord. Académico, de Facultad o de Programa) | Quien lo administra | M4 | 📐 |
| CU-14 | Consultar categorías | Cualquier cuenta activa | M5 | ✅ |
| CU-15 | Crear, editar y desactivar categorías | Administrador, Rector, Coord. Académico | M5 | 📐 |
| CU-16 | **Publicar Kudo** (con adjuntos) | Cualquier cuenta activa | M6 | ✅ |
| CU-17 | Listar Kudos (feed, recibidos, enviados) | Cualquier cuenta activa | M6 | ✅ |
| CU-18 | Ver detalle de un Kudo y descargar adjunto | Cualquier cuenta activa | M6 | ✅ |
| CU-19 | Responder (réplica) a un Kudo o a otra réplica | Cualquier cuenta activa | M7 | 📐 |
| CU-20 | Consultar el hilo de réplicas | Cualquier cuenta activa | M7 | 📐 |
| CU-21 | Calificar (1 a 5) un Kudo o una réplica | Cualquier cuenta activa | M7 | 📐 |
| CU-22 | Retirar mi calificación | Autor de la calificación | M7 | 📐 |
| CU-23 | Reportar contenido | Cualquier cuenta activa | M8 | 📐 |
| CU-24 | Consultar reportes | Rector, Coord. Académico | M8 | 📐 |
| CU-25 | Vetar contenido | Rector, Coord. Académico | M8 | 📐 |
| CU-26 | Levantar un veto | Rector, Coord. Académico | M8 | 📐 |
| CU-27 | Recibir notificaciones (correo, WhatsApp, push) | Destinatario | M9 | ✅ |
| CU-28 | Consultar auditoría por `trace_id` | Administrador | M10 | ✅ |

---

## 3. Diseño por módulo

### M2 · Registro y activación (CU-02, CU-03, CU-04)

**Datos de entrada:** nombres, apellidos, correo institucional, celular, clave, rol solicitado y, según el rol, programa o facultad.

**Reglas**
- El correo debe pertenecer al dominio institucional (configurable: `DOMINIO_INSTITUCIONAL`) y no estar registrado.
- El celular debe tener formato internacional (E.164) y no estar registrado por otra persona.
- La clave se guarda con BCrypt (06 §1).
- Se crea la solicitud en estado `PENDIENTE` y la cuenta en `REGISTRADA`.

**Verificación de correo (CU-03):** el sistema envía por el puerto `EmailSenderPort` un enlace con un token aleatorio de un solo uso y vigencia limitada (p. ej. 24 h). Se guarda **solo el hash** del token.

**Verificación de celular (CU-04):** el sistema envía un código numérico de 6 dígitos por el puerto `PhoneVerificationPort` (implementable con WhatsApp de Twilio). Vigencia de 10 minutos y máximo 5 intentos. Se guarda **solo el hash**.

**Activación:** los tres requisitos son **independientes y en cualquier orden**. Cada vez que se cumple uno, el caso de uso `EvaluarActivacionCuenta` revisa si están los tres y, solo entonces, la cuenta pasa a `ACTIVA`:

```text
solicitud APROBADA  +  correo verificado  +  celular verificado   ──►   cuenta ACTIVA
```

**Auditoría:** `SOLICITUD_REGISTRADA`, `CORREO_VERIFICADO`, `CELULAR_VERIFICADO`, `CUENTA_ACTIVADA`.

### M3 · Aprobaciones (CU-05, CU-06, CU-07)

**Matriz de aprobación** (enunciado): el aprobador se determina por el rol solicitado.

| Rol solicitado | Aprueba | Verificación de ámbito |
|---|---|---|
| Estudiante | Coordinador de Programa | El programa solicitado es el que acompaña el aprobador. |
| Coordinador de Programa | Coordinador de Facultad | El programa pertenece a la facultad del aprobador. |
| Coordinador de Facultad | Coordinador Académico | — (titular único) |
| Coordinador Académico | Rector | — (titular único) |
| Rector | Administrador | — |
| Administrador | Administrador | Otro administrador distinto del solicitante (S-06). |
| Docente | Coordinador de Programa (S-02) | El programa donde enseña es el del aprobador. |

**Flujo de aprobar (CU-06)**
1. El caso de uso carga la solicitud pendiente.
2. Verifica que quien aprueba tiene el rol exigido por la matriz **y** el ámbito correcto; si no, `403` y auditoría `ACCESO_DENEGADO`.
3. Verifica que no se violen las reglas de unicidad (RN-01..04): si el cupo de Rector, Coordinador Académico, de Facultad o de Programa ya está ocupado, responde `409` y propone el relevo (CU-13).
4. Marca la solicitud `APROBADA`, crea la `asignacion_rol` y ejecuta `EvaluarActivacionCuenta`.

**Rechazo (CU-07):** estado `RECHAZADA` con motivo obligatorio; la cuenta no se activa.

### M4 · Estructura académica y administración (CU-08 a CU-13)

| Relación del enunciado | Cómo se modela |
|---|---|
| Un estudiante puede estudiar varios programas | `persona_programa(persona_id, programa_id, vinculo='ESTUDIANTE')`; consulta CU-10. |
| Un docente puede enseñar en varios programas | Mismo vínculo con `vinculo='DOCENTE'`; consulta CU-10. |
| Un Coordinador de Programa conoce su programa | `asignacion_rol.programa_id`; consulta CU-11. |
| Un Coordinador de Facultad conoce su facultad | `asignacion_rol.facultad_id`; consulta CU-11. |

**Quién administra a quién (CU-12):** cada rol administra únicamente al rol inmediatamente inferior, dentro de su ámbito (matriz en 01 §4). El Coordinador de Programa administra estudiantes y docentes **de su programa**; el de Facultad, los Coordinadores de Programa **de su facultad**; el Coordinador Académico, los Coordinadores de Facultad; el Rector, los Coordinadores Académicos; el Administrador, a Administradores y Rectores.

**Relevo (CU-13) — decisión de diseño S-07:** como los titulares son únicos, para reemplazar a uno quien lo administra lo **da de baja** (la `asignacion_rol` pasa a `activo=false` con fecha `hasta`) y luego se aprueba el nuevo. El historial se conserva.

**Facultades y programas (CU-08):** el enunciado no dice quién los gestiona; se asigna al Administrador del Sistema (S-08).

### M5 · Categorías (CU-14, CU-15)

- El catálogo mínimo son las 15 categorías del enunciado, cargadas por una migración.
- Solo **Administrador, Rector y Coordinador Académico** crean, editan o desactivan (RN-11); los demás roles reciben `403`.
- Una categoría usada por Kudos **no se elimina**: se desactiva (`activa=false`) y deja de ofrecerse para Kudos nuevos, conservando los antiguos.
- El nombre es único sin distinguir mayúsculas.

### M6 · Kudos y adjuntos (CU-16, CU-17, CU-18)

Detalle del flujo *Publicar Kudo* en 04 §6 y de los adjuntos en 07 §1.

- **Publicar:** autor y destinatario activos y distintos (S-01), categoría activa, contenido no vacío y sin límite de negocio, adjuntos opcionales.
- **Listar:** tres vistas por cursor (`feed`, `recibidos`, `enviados`).
- **Contenido vetado:** el Kudo vetado se oculta para los usuarios comunes y sigue visible para quienes moderan.

### M7 · Interacción: réplicas y calificaciones (CU-19 a CU-22)

**Réplicas (RN-13)**
- Una réplica tiene `padre_id` (un Kudo u otra réplica) y `kudo_raiz_id` (el Kudo del que cuelga el hilo).
- **Sin límite de profundidad, cantidad ni longitud.**
- Lectura bajo demanda: se carga el primer nivel y cada rama se expande aparte con una consulta recursiva (CTE) limitada al subárbol pedido, paginada por cursor.
- No se puede replicar sobre contenido vetado.

**Calificaciones (RN-14)**
- Escala de 1 a 5 estrellas, sobre Kudos y réplicas.
- Una sola calificación activa por (usuario, contenido). Calificar de nuevo la **reemplaza** (`PUT` idempotente); retirarla (CU-22) la elimina.
- Se mantiene un resumen precalculado (`cantidad`, `suma`) por contenido para las lecturas (ADR-0009).
- Un usuario no califica su propio contenido (S-09).

### M8 · Moderación (CU-23 a CU-26)

| Acción | Quién | Regla |
|---|---|---|
| Reportar | **Todos** los usuarios con cuenta activa | Con motivo; un usuario no duplica un reporte abierto sobre el mismo contenido. |
| Consultar reportes | Rector y Coordinador Académico | Bandeja de reportes `ABIERTO`. |
| Vetar | **Solo** Rector y Coordinador Académico | Motivo obligatorio; el contenido pasa a `VETADO`. |
| Levantar veto | Rector y Coordinador Académico (S-10) | Devuelve el contenido a `ACTIVO`. |

**No pueden vetar:** Administradores, Coordinadores de Facultad, Coordinadores de Programa, docentes ni estudiantes. Se aplica con `@PreAuthorize` y se vuelve a verificar en el caso de uso.

**Efecto del veto:** el contenido deja de mostrarse a los usuarios comunes y los reportes asociados pasan a `RESUELTO`. Todo queda auditado (`CONTENIDO_REPORTADO`, `CONTENIDO_VETADO`, `VETO_LEVANTADO`).

---

## 4. Matriz de autorización por caso de uso

✔ permitido · ✖ prohibido · ◐ permitido con verificación de ámbito.

| Caso de uso | ADMIN | RECTOR | COORD. ACAD. | COORD. FAC. | COORD. PROG. | DOCENTE | ESTUDIANTE |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| CU-14 Consultar categorías | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| CU-15 Administrar categorías | ✔ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ |
| CU-16 a CU-18 Kudos | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| CU-19 a CU-22 Réplicas y calificaciones | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| CU-23 Reportar | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| CU-24 a CU-26 Reportes y vetos | ✖ | ✔ | ✔ | ✖ | ✖ | ✖ | ✖ |
| CU-06/07 Aprobar o rechazar | ◐ (a Rector y Admin) | ◐ (a Coord. Acad.) | ◐ (a Coord. Fac.) | ◐ (a Coord. Prog.) | ◐ (a estudiantes y docentes) | ✖ | ✖ |
| CU-08 Facultades y programas | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| CU-09 Vincular a programa | ✖ | ✖ | ✖ | ✖ | ◐ | ✖ | ✖ |
| CU-12/13 Administrar subordinados | ◐ (Admin y Rector) | ◐ (Coord. Acad.) | ◐ (Coord. Fac.) | ◐ (Coord. Prog.) | ◐ (estudiantes y docentes) | ✖ | ✖ |
| CU-28 Auditoría | ✔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |

---

## 5. Máquinas de estado

```text
CUENTA      REGISTRADA ──► APROBADA ──► ACTIVA ◄──► SUSPENDIDA ──► BAJA
                │                          (solo con correo y celular verificados)
                └──► RECHAZADA

SOLICITUD   PENDIENTE ──► APROBADA | RECHAZADA

CONTENIDO   ACTIVO ◄──► VETADO

REPORTE     ABIERTO ──► RESUELTO

NOTIFICACIÓN  PENDIENTE ──► ENVIADA | FALLIDA | OMITIDA
```

## 6. Puertos por módulo

**Puertos de entrada (casos de uso)**, agrupados por subpaquete de módulo en `servicios.input.port`:
`identidad` · `registro` · `aprobaciones` · `academico` · `categorias` · `kudos` · `interaccion` · `moderacion` · `auditoria`.

**Puertos de salida**

| Puerto | Módulos que lo usan | Adaptador |
|---|---|---|
| `PersonaRepositoryPort`, `AsignacionRolRepositoryPort` | M1, M3, M4 | JDBC/PostgreSQL |
| `SolicitudRepositoryPort`, `VerificacionRepositoryPort` | M2, M3 | JDBC/PostgreSQL |
| `FacultadRepositoryPort`, `ProgramaRepositoryPort` | M4 | JDBC/PostgreSQL |
| `CategoriaRepositoryPort` | M5, M6 | JDBC/PostgreSQL |
| `KudoRepositoryPort`, `ContenidoRepositoryPort` | M6, M7, M8 | JDBC/PostgreSQL |
| `CalificacionRepositoryPort`, `ReporteRepositoryPort` | M7, M8 | JDBC/PostgreSQL |
| `FileStoragePort` | M6 | Supabase Storage |
| `PasswordHasherPort`, `TokenServicePort` | M1, M2 | BCrypt, JWT |
| `EmailSenderPort` | M2, M9 | Brevo |
| `PhoneVerificationPort`, `WhatsAppSenderPort` | M2, M9 | Twilio |
| `PushNotifierPort` | M9 | SSE |
| `DomainEventPublisherPort` | M6, M2 | Eventos de Spring |
| `AuditLogPort` | todos | JDBC (tabla `auditoria`) |

## 7. Diagramas de secuencia principales (se piden uno a uno)

| ID | Escenario | Caso de uso | Estado del flujo |
|---|---|---|---|
| SEQ-01 | **Publicar Kudo** (flujo obligatorio): pág. 6 (guardar) y pág. 7 (notificaciones) del `.drawio` | CU-16 | ✅ |
| SEQ-02 | Registro y activación de cuenta (aprobación + correo + celular) | CU-02..04, 06 | 📐 |
| SEQ-03 | Aprobación jerárquica con verificación de ámbito y unicidad | CU-06 | 📐 |
| SEQ-04 | Responder a una réplica y leer el hilo | CU-19, 20 | 📐 |
| SEQ-05 | Calificar un contenido | CU-21 | 📐 |
| SEQ-06 | Reportar y vetar contenido | CU-23, 25 | 📐 |

> Los diagramas **no se elaboran hasta que lo autorices uno por uno**.
