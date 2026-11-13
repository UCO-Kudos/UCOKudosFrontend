# 11 · Modelo de datos y API REST

Cubre **todo el alcance** del enunciado. Las migraciones de la línea base (Flyway) crean las tablas marcadas ✅; las demás quedan **diseñadas** y se crean cuando se implementen.

## 1. Modelo de datos

### 1.1 Tablas

| Tabla | Columnas principales | Restricciones clave | Línea base |
|---|---|---|---|
| `persona` | id, nombres, apellidos, correo (único), celular (único), hash_clave, estado_cuenta, correo_verificado, celular_verificado, creada_en | `UNIQUE(correo)`, `UNIQUE(celular)`, `CHECK estado_cuenta IN (...)` | ✅ |
| `asignacion_rol` | id, persona_id, rol, facultad_id?, programa_id?, activo, desde, hasta | FK a persona, facultad y programa; índices únicos parciales (§1.2) | ✅ |
| `facultad` | id, nombre (único) | `UNIQUE(nombre)` | ✅ semilla |
| `programa_academico` | id, nombre, facultad_id | FK a facultad; `UNIQUE(facultad_id, nombre)` | ✅ semilla |
| `persona_programa` | persona_id, programa_id, vinculo | PK (persona_id, programa_id, vinculo); `CHECK vinculo IN ('ESTUDIANTE','DOCENTE')` | ✅ semilla |
| `solicitud_registro` | id, persona_id, rol_solicitado, programa_id?, facultad_id?, estado, aprobador_rol, decidido_por?, motivo?, creada_en, decidida_en | FK a persona; `CHECK estado IN ('PENDIENTE','APROBADA','RECHAZADA')` | 📐 |
| `verificacion` | id, persona_id, tipo (`CORREO`/`CELULAR`), codigo_hash, expira_en, intentos, verificado_en? | FK a persona; solo se guarda el hash | 📐 |
| `categoria` | id, nombre, activa | `UNIQUE(lower(nombre))` | ✅ |
| `contenido` | id, tipo (`KUDO`/`REPLICA`), autor_id, texto (TEXT), creado_en, estado, destinatario_id?, categoria_id?, padre_id?, kudo_raiz_id? | Ver §1.3 | ✅ (Kudo) · 📐 (réplica) |
| `adjunto` | id, kudo_id, nombre_original, tipo_mime, tamano_bytes, sha256, clave_almacenamiento, subido_por, subido_en, eliminado | FK a contenido | ✅ |
| `calificacion` | id, contenido_id, usuario_id, estrellas, actualizada_en | `UNIQUE(contenido_id, usuario_id)`; `CHECK estrellas BETWEEN 1 AND 5` | 📐 |
| `calificacion_resumen` | contenido_id (PK), cantidad, suma | Contadores para lectura rápida | 📐 |
| `reporte` | id, contenido_id, reportante_id, motivo, estado, creado_en, resuelto_en? | `UNIQUE(contenido_id, reportante_id) WHERE estado='ABIERTO'` | 📐 |
| `veto` | id, contenido_id, vetado_por, motivo, vetado_en, levantado_en? | FK a contenido y persona | 📐 |
| `notificacion` | id, kudo_id, destinatario_id, canal, estado, intentos, ultimo_error?, creada_en, enviada_en? | `CHECK canal IN ('CORREO','WHATSAPP','PUSH')` | ✅ |
| `auditoria` | id, ocurrido_en, actor_id?, accion, recurso_tipo, recurso_id?, resultado, trace_id, detalle (JSON) | Solo `INSERT`/`SELECT` para la aplicación | ✅ |

### 1.2 Reglas de unicidad del enunciado en la base de datos (índices únicos parciales)

| Regla | Garantía en PostgreSQL |
|---|---|
| RN-01 Un solo rol activo por persona | `CREATE UNIQUE INDEX ux_rol_activo_persona ON asignacion_rol (persona_id) WHERE activo;` |
| RN-02 Un Rector activo | `CREATE UNIQUE INDEX ux_rector_activo ON asignacion_rol ((rol)) WHERE activo AND rol = 'RECTOR';` |
| RN-02 Un Coordinador Académico activo | `CREATE UNIQUE INDEX ux_coord_acad_activo ON asignacion_rol ((rol)) WHERE activo AND rol = 'COORD_ACADEMICO';` |
| RN-03 Un Coordinador de Facultad activo por facultad | `CREATE UNIQUE INDEX ux_coord_fac_activo ON asignacion_rol (facultad_id) WHERE activo AND rol = 'COORD_FACULTAD';` |
| RN-04 Un Coordinador de Programa activo por programa | `CREATE UNIQUE INDEX ux_coord_prog_activo ON asignacion_rol (programa_id) WHERE activo AND rol = 'COORD_PROGRAMA';` |

> Las reglas se validan en el dominio **y** se garantizan en la base de datos (defensa en profundidad).

### 1.3 Tabla `contenido` (Kudos y réplicas)

Una sola tabla con dos tipos, para que calificaciones, reportes y vetos apunten a un único `contenido_id`:

| Restricción | Efecto |
|---|---|
| `CHECK (tipo='KUDO' AND destinatario_id IS NOT NULL AND categoria_id IS NOT NULL AND padre_id IS NULL AND kudo_raiz_id IS NULL) OR (tipo='REPLICA' AND padre_id IS NOT NULL AND kudo_raiz_id IS NOT NULL)` | Un Kudo siempre tiene destinatario y categoría; una réplica siempre tiene padre y raíz. |
| `CHECK (tipo <> 'KUDO' OR autor_id <> destinatario_id)` | Autor distinto del destinatario (S-01). |
| `padre_id` → `contenido(id)` | Árbol de réplicas **sin límite de profundidad**. |
| `texto TEXT NOT NULL` | **Sin límite de longitud** de negocio. |

### 1.4 Índices para lectura (DRV-002)

| Índice | Uso |
|---|---|
| `contenido (destinatario_id, creado_en DESC, id DESC) WHERE tipo='KUDO'` | Kudos recibidos por cursor |
| `contenido (autor_id, creado_en DESC, id DESC) WHERE tipo='KUDO'` | Kudos enviados |
| `contenido (categoria_id, creado_en DESC, id DESC) WHERE tipo='KUDO'` | Filtro por categoría |
| `contenido (padre_id, creado_en, id)` | Hijos directos de una réplica |
| `contenido (kudo_raiz_id)` | Hilo completo |
| `calificacion (contenido_id)` | Resumen de calificaciones |
| `auditoria (trace_id, ocurrido_en)` | Reconstrucción del flujo |
| `notificacion (kudo_id)` | Estado de notificaciones por Kudo |

---

## 2. API REST

Base: `/api`. Formato JSON; errores `application/problem+json` con `trace_id`. Autenticación por `Authorization: Bearer <JWT>`, salvo los endpoints públicos. Contrato publicado con OpenAPI.

| Método y ruta | Caso de uso | Roles | Estado |
|---|---|---|---|
| `POST /auth/login` | CU-01 | Público | ✅ |
| `POST /registro/solicitudes` | CU-02 | Público | 📐 |
| `POST /registro/verificaciones/correo/confirmar` | CU-03 | Público (token del correo) | 📐 |
| `POST /registro/verificaciones/celular/enviar` | CU-04 | Solicitante | 📐 |
| `POST /registro/verificaciones/celular/confirmar` | CU-04 | Solicitante | 📐 |
| `GET /solicitudes?estado=PENDIENTE` | CU-05 | Aprobadores | 📐 |
| `POST /solicitudes/{id}/aprobar` | CU-06 | Según matriz y ámbito | 📐 |
| `POST /solicitudes/{id}/rechazar` | CU-07 | Según matriz y ámbito | 📐 |
| `GET/POST/PUT /facultades`, `/programas` | CU-08 | `ADMIN` (escritura); lectura: todos | 📐 |
| `POST /programas/{id}/vinculos` | CU-09 | `COORD_PROGRAMA` (su programa) | 📐 |
| `GET /personas/{id}/programas` | CU-10 | Quien administra a la persona | 📐 |
| `GET /personas/{id}/ambito` | CU-11 | Cuenta activa | 📐 |
| `PATCH /personas/{id}/estado` | CU-12, CU-13 | Quien administra a la persona | 📐 |
| `GET /categorias` | CU-14 | Cuenta activa | ✅ |
| `GET /personas/destinatarios` | apoyo de CU-16 (elegir destinatario) | Cuenta activa | ✅ |
| `POST/PUT/DELETE /categorias` | CU-15 | `ADMIN`, `RECTOR`, `COORD_ACADEMICO` | 📐 |
| `POST /kudos` (multipart) | **CU-16** | Cuenta activa | ✅ |
| `GET /kudos?cursor=` · `GET /kudos/recibidos` · `GET /kudos/enviados` | CU-17 | Cuenta activa | ✅ |
| `GET /kudos/{id}` | CU-18 | Cuenta activa | ✅ |
| `GET /adjuntos/{id}/url` | CU-18 | Cuenta activa con permiso de lectura | ✅ |
| `POST /contenidos/{id}/replicas` | CU-19 | Cuenta activa | 📐 |
| `GET /contenidos/{id}/replicas?cursor=` | CU-20 | Cuenta activa | 📐 |
| `PUT /contenidos/{id}/calificacion` · `DELETE …` | CU-21, CU-22 | Cuenta activa | 📐 |
| `POST /contenidos/{id}/reportes` | CU-23 | Cuenta activa | 📐 |
| `GET /reportes?estado=ABIERTO` | CU-24 | `RECTOR`, `COORD_ACADEMICO` | 📐 |
| `POST /contenidos/{id}/veto` · `DELETE …` | CU-25, CU-26 | `RECTOR`, `COORD_ACADEMICO` | 📐 |
| `GET /notificaciones/stream` (SSE) | CU-27 | Cuenta activa | ✅ |
| `GET /auditoria?traceId=` | CU-28 | `ADMIN` | ✅ |
| `GET /actuator/health` | — | Público | ✅ |

### Códigos de respuesta usados

`201` creado · `200` correcto · `204` sin contenido · `400` validación · `401` sin autenticar · `403` sin permiso · `404` no existe · `409` conflicto de regla (p. ej. titular único ocupado) · `422` regla de negocio incumplida · `429` límite de tasa.

### Ejemplo: publicar un Kudo

```http
POST /api/kudos
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

destinatarioId, categoriaId, contenido, adjuntos[]
```

Respuesta `201 Created`:

```json
{ "id": "…", "destinatarioId": "…", "categoriaId": "…", "creadoEn": "…", "adjuntos": 1, "traceId": "…" }
```
