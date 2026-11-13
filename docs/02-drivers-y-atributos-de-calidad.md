# 02 · Drivers arquitectónicos y atributos de calidad

## 1. Drivers

| ID | Driver | Impacto en el diseño | Decisión asociada |
|---|---|---|---|
| **DRV-001** | **Movilidad:** ~90 % de usuarios desde móvil. | Estrategia *Mobile First*: PWA, diseño responsivo, carga ligera, caché en el dispositivo. | ADR-0002 |
| **DRV-002** | **Alta demanda de lectura.** | Separar consultas de comandos, índices, paginación por cursor, caché, HTTP cache, caché de PWA. | ADR-0009 |
| **DRV-003** | **Notificaciones multicanal:** correo, WhatsApp, push. | Un puerto por canal, eventos de dominio, reintentos y aislamiento de fallas. | ADR-0005, ADR-0006 |
| **DRV-004** | **Adjuntos.** | Almacenamiento de objetos fuera de la base de datos, URLs firmadas, validación. | ADR-0004 |
| **DRV-005** | **Seguridad.** | JWT, RBAC, secretos fuera del código, validación en todos los bordes. | ADR-0007 |
| **DRV-006** | **Observabilidad:** monitoreo, métricas, trazas, auditoría. | Actuator + Micrometer, logs JSON con `trace_id`, tabla de auditoría. | ADR-0008 |
| **DRV-007** | **Automatización (DevSecOps desde la línea base).** | CI/CD, Sonar, Trivy en cada cambio. | ADR-0011 |

## 2. Atributos de calidad priorizados

| Prioridad | Atributo | Por qué | Cómo se evidencia |
|---|---|---|---|
| 1 | **Seguridad** | Datos personales (correo, celular) e institucionales. | Pruebas de autorización, Trivy, Sonar, secretos fuera del repositorio. |
| 2 | **Rendimiento (lectura)** | La carga es mayoritariamente de consulta. | Caché, índices, paginación; métricas de latencia. |
| 3 | **Usabilidad móvil** | 90 % móvil. | Lighthouse (PWA/Performance), pruebas en viewport móvil. |
| 4 | **Disponibilidad / resiliencia** | Las notificaciones dependen de terceros. | Reintentos, *circuit breaker*, el Kudo no depende de los canales. |
| 5 | **Observabilidad y auditabilidad** | Gobierno técnico y trazabilidad. | Métricas, logs, auditoría por `trace_id`. |
| 6 | **Mantenibilidad / evolutividad** | Cambiar de proveedor o de canal sin tocar el dominio. | Puertos y adaptadores, ArchUnit, Clean Code. |
| 7 | **Escalabilidad / elasticidad** | Crecimiento de usuarios. | Backend sin estado, contenedor. |

## 3. Escenarios de calidad

Formato: estímulo → entorno → respuesta → medida.

| ID | Atributo | Escenario | Respuesta esperada | Medida |
|---|---|---|---|---|
| EC-01 | Seguridad | Un usuario sin rol autorizado intenta crear una categoría. | La petición se rechaza con 403 y se audita. | 100 % de intentos rechazados |
| EC-02 | Seguridad | Se envía un token vencido o manipulado. | 401; no se ejecuta ningún caso de uso. | 100 % rechazados |
| EC-03 | Rendimiento | 100 usuarios consultan el listado de Kudos de forma simultánea. | Respuesta desde caché y paginación por cursor. | p95 < 500 ms en operación normal (servicio activo) |
| EC-04 | Resiliencia | El proveedor de WhatsApp no responde al publicar un Kudo. | El Kudo queda guardado, correo y push se envían, WhatsApp se reintenta y queda registrado el fallo. | 0 Kudos perdidos |
| EC-05 | Disponibilidad | El proveedor de correo responde con error temporal. | Reintentos con espera creciente; luego estado `FALLIDA` en `notificacion`. | ≤ 3 reintentos |
| EC-06 | Trazabilidad | Se necesita reconstruir qué pasó al publicar un Kudo. | Una consulta por `trace_id` devuelve todos los eventos del proceso. | 100 % de pasos auditados |
| EC-07 | Mantenibilidad | Se reemplaza Twilio por otro proveedor de WhatsApp. | Solo cambia un adaptador de salida. | 0 cambios en `dominio` y `servicios` |
| EC-08 | Usabilidad | Un usuario abre la aplicación en un móvil con red lenta. | Carga inicial ligera y contenido ya visitado desde la caché de la PWA. | LCP objetivo ≤ 2,5 s en Lighthouse móvil |
| EC-09 | Seguridad | Se carga un adjunto con tipo no permitido o ejecutable. | Rechazo antes de almacenar. | 100 % rechazados |

## 4. Respuesta a DRV-002: escenarios donde la mayoría de operaciones son consultas

Principio: **el camino de lectura debe ser barato, cacheable y sin trabajo innecesario**.

| Estrategia | Aplicación | Beneficio |
|---|---|---|
| **Separación comando/consulta (CQRS ligero)** | Casos de uso de consulta distintos de los de comando; puertos de lectura que devuelven proyecciones (DTO), no entidades completas. | Evita cargar grafos de objetos y el problema N+1. |
| **Índices dirigidos** | `kudo(destinatario_id, creado_en DESC)`, `kudo(categoria_id, creado_en DESC)`, `contenido(padre_id)`, `calificacion(contenido_id)`. | Listados rápidos aunque crezca la tabla. |
| **Paginación por cursor (*keyset*)** | Listados ordenados por `(creado_en, id)`. | Costo constante por página; no se degrada como `OFFSET`. |
| **Caché de aplicación (Caffeine)** | Catálogo de categorías (TTL largo), conteos y promedios de calificación (TTL corto). | Elimina consultas repetidas. |
| **Caché HTTP** | `ETag` y `Cache-Control` en catálogos; respuesta `304`. | Ahorra ancho de banda móvil. |
| **Caché en el dispositivo (PWA)** | *Service worker* con estrategia *stale-while-revalidate* para listados y recursos estáticos. | Lectura casi inmediata; funciona con red inestable. |
| **Hilos de réplicas bajo demanda** | Se carga el primer nivel y se expande por rama; consulta recursiva con CTE solo del subárbol pedido. | Evita traer hilos enormes. |
| **Contadores precalculados** | Promedio y cantidad de calificaciones por contenido, actualizados al calificar. | La lectura no recalcula. |
| **Escalado de lectura (evolución)** | Réplica de lectura de PostgreSQL y caché distribuida (Redis) cuando el volumen lo justifique. | Escala sin rediseñar el dominio. |

Fundamento: el puerto de lectura aísla estas optimizaciones; se pueden cambiar sin tocar los casos de uso.

## 5. Estrategia Mobile First (DRV-001)

- **PWA instalable** (manifiesto + *service worker*).
- Diseño **responsivo desde 360 px** hacia arriba; objetivos táctiles ≥ 44 px.
- **Carga diferida** de rutas (`React.lazy`) y paquetes pequeños.
- Imágenes de adjuntos con tamaño acotado y carga diferida.
- Lighthouse como criterio de aceptación (Rendimiento, PWA, Accesibilidad).
- Las notificaciones push en tiempo real funcionan con la app abierta; Web Push con la app cerrada queda como evolución.
