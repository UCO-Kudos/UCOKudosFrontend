# 07 · Adjuntos, observabilidad y auditoría

## 1. Estrategias de archivos adjuntos (DRV-004)

### 1.1 Estrategia de almacenamiento

| Aspecto | Decisión |
|---|---|
| Dónde | **Supabase Storage**, bucket **privado**, detrás del puerto `FileStoragePort`. |
| Por qué fuera de la BD | Los archivos binarios encarecen respaldos y lecturas; la BD guarda solo el **metadato**. |
| Clave del objeto | Generada por el servidor: `kudos/{kudoId}/{uuid}`; el nombre original se guarda como dato, nunca se usa como ruta. |
| Metadato en BD | `adjunto(id, kudo_id, nombre_original, tipo_mime, tamano_bytes, sha256, clave_almacenamiento, subido_por, subido_en)`. |
| Flujo de carga | El cliente envía el archivo al backend (multipart) → el backend valida → guarda en el almacenamiento → registra el metadato en la misma operación de publicar. |
| Límites | Tamaño máximo por archivo y cantidad por Kudo, configurables (por defecto 10 MB y 5 archivos). El plan gratuito tiene su propio tope de tamaño; se verifica al configurar. |
| Evolución | Carga directa con URL firmada de subida; miniaturas; CDN. |

### 1.2 Estrategia de seguridad

- **Lista blanca** de tipos: imágenes (`png`, `jpg`, `webp`), `pdf`, documentos ofimáticos comunes. Se **rechazan ejecutables y scripts**.
- Verificación del **tipo real por contenido** (no solo la extensión ni el `Content-Type` del cliente).
- **Bucket privado**: nada se sirve con URL pública permanente.
- **Descarga mediante URL firmada de vida corta** (p. ej. 5 minutos), emitida solo si el usuario puede ver el Kudo.
- Nombre sanitizado y clave aleatoria (evita *path traversal* y colisiones).
- Control de acceso: solo autor, destinatario y usuarios con permiso de lectura del Kudo.
- Evolución: **análisis antivirus** (p. ej. ClamAV) antes de aceptar el archivo.

### 1.3 Estrategia de recuperación

| Escenario | Respuesta |
|---|---|
| Falla al guardar el archivo | La transacción de publicar se revierte; no queda Kudo sin adjunto declarado. |
| Falla al registrar el metadato tras guardar el archivo | Compensación: se elimina el objeto huérfano; una tarea de limpieza detecta objetos sin metadato. |
| Pérdida de un objeto | El `sha256` y el metadato permiten detectar la ausencia; se restaura desde el respaldo del almacenamiento. |
| Pérdida de datos de BD | Respaldos del proveedor y exportación periódica programada. |
| Eliminación | Borrado lógico del adjunto (conservación para auditoría) y purga diferida del objeto. |

> Nota: los respaldos disponibles dependen del plan del proveedor; en el plan gratuito son limitados. Se documenta como riesgo y evolución a un plan con respaldo programado.

### 1.4 Estrategia de trazabilidad

- Cada carga genera `ADJUNTO_SUBIDO` (actor, kudo, tamaño, `sha256`, `trace_id`).
- Cada descarga genera `ADJUNTO_DESCARGADO` (quién y cuándo).
- El `sha256` permite verificar la **integridad** y detectar alteraciones.
- Rechazos por tipo o tamaño se auditan como `ADJUNTO_RECHAZADO` con el motivo.

---

## 2. Observabilidad (DRV-006)

Los tres pilares más la auditoría, todos correlacionados por un `trace_id`.

| Pilar | Qué se captura | Cómo (SBB) |
|---|---|---|
| **Logs** | Eventos de aplicación en JSON, con `trace_id`, `usuario`, nivel, clase. Sin claves, tokens ni contenido íntegro. | SLF4J + Logback (JSON) a la salida estándar; Render los recolecta. |
| **Métricas** | Peticiones, latencia por endpoint, errores, uso de JVM, caché, notificaciones enviadas/fallidas por canal, conexiones SSE activas. | Spring Boot Actuator + Micrometer; endpoint de métricas protegido. |
| **Trazas** | Recorrido de una petición y de su procesamiento asíncrono. | Micrometer Tracing: identificador propagado en MDC y en cabecera `X-Trace-Id`. |
| **Salud** | Estado de la aplicación y sus dependencias (BD). | `/actuator/health` (liveness/readiness). |
| **Auditoría** | Quién hizo qué, cuándo y con qué resultado. | Tabla `auditoria` (ver §3). |

**Métricas propias de negocio** (Micrometer): `kudos_publicados_total`, `notificaciones_total{canal,resultado}`, `push_conexiones_activas`, `adjuntos_subidos_total`.

**Visualización:** como mínimo, evidencia de `/actuator/health`, `/actuator/metrics` y búsqueda de logs por `trace_id`. Opcional: Grafana Cloud (nivel gratuito) leyendo el endpoint de Prometheus.

**Alertas (diseño):** tasa de error 5xx, latencia p95 y notificaciones fallidas sobre un umbral.

## 3. Auditoría (paso 5 del flujo)

### Modelo

```text
auditoria(
  id, ocurrido_en, actor_id, accion, recurso_tipo, recurso_id,
  resultado,        -- EXITO | FALLO | OMITIDO
  trace_id,         -- agrupa todo el proceso
  detalle           -- JSON con datos no sensibles
)
```

### Propiedades

- **Solo inserción:** el usuario de BD de la aplicación tiene `INSERT` y `SELECT`, **sin** `UPDATE` ni `DELETE` sobre `auditoria`.
- **Correlación:** todos los registros de un mismo Kudo comparten `trace_id`.
- **No bloqueante para el negocio, sí obligatoria:** el registro de `KUDO_PUBLICADO` ocurre en la misma transacción que el Kudo; los de notificación se registran al terminar cada envío.

### Eventos de la línea base

| Acción | Cuándo |
|---|---|
| `LOGIN_EXITOSO` / `LOGIN_FALLIDO` | Inicio de sesión |
| `KUDO_PUBLICADO` | Kudo confirmado |
| `ADJUNTO_SUBIDO` / `ADJUNTO_RECHAZADO` / `ADJUNTO_DESCARGADO` | Ciclo del adjunto |
| `NOTIFICACION_CORREO_ENVIADA` / `_FALLIDA` | Resultado del correo |
| `NOTIFICACION_WHATSAPP_ENVIADA` / `_FALLIDA` | Resultado de WhatsApp |
| `NOTIFICACION_PUSH_ENVIADA` / `_OMITIDA_DESCONECTADO` | Resultado del push |
| `ACCESO_DENEGADO` | Intento sin permiso |

**Consulta de evidencia:** `SELECT * FROM auditoria WHERE trace_id = '<id>' ORDER BY ocurrido_en;` reconstruye el flujo completo de un Kudo.
