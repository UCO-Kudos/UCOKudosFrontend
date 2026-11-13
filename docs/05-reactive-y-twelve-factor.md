# 05 · Manifiesto Reactivo y Twelve-Factor App

## 1. Manifiesto Reactivo

Se adoptan los **principios** de los sistemas reactivos (no se usa programación reactiva con WebFlux: el código es imperativo y estable, con asincronía localizada donde aporta).

### 1.1 Responsividad
*El sistema responde de forma rápida y consistente.*

- Lecturas con caché de aplicación, caché HTTP y caché de la PWA (ver 02 §4).
- Publicar un Kudo **no espera** a correo, WhatsApp ni push: responde `201` al confirmar la persistencia.
- *Timeouts* explícitos en todo llamado a terceros para que una dependencia lenta no degrade al usuario.

### 1.2 Resiliencia
*El sistema responde aun ante fallos.*

| Mecanismo | Efecto |
|---|---|
| **Aislamiento de fallas** | Cada canal corre de forma independiente; si WhatsApp cae, el correo y el push siguen. |
| **Contención** | El Kudo ya está guardado antes de notificar; ninguna falla externa lo revierte. |
| **Reintento con espera creciente** | Hasta 3 intentos por envío (Resilience4j). |
| **Circuit breaker** | Si un proveedor falla repetidamente se deja de llamar un tiempo, y se registra el estado. |
| **Mamparas (*bulkhead*)** | Ejecutor asíncrono propio para notificaciones, separado del hilo de las peticiones HTTP. |
| **Registro de estado** | `notificacion.estado` (`PENDIENTE`/`ENVIADA`/`FALLIDA`) permite reintentos manuales y diagnóstico. |

### 1.3 Elasticidad
*El sistema se adapta a la carga.*

- Backend **sin estado** (JWT): se pueden añadir instancias detrás de un balanceador sin sesión compartida.
- Empaquetado en contenedor; el hospedaje permite aumentar instancias.
- **Limitación reconocida:** el registro de conexiones SSE vive en memoria de cada instancia. Con más de una instancia se requiere un bus de mensajes (Redis Pub/Sub) para que el push llegue a la instancia donde está conectado el usuario. Está documentado como evolución.

### 1.4 Orientación a mensajes
*Comunicación asíncrona y desacoplada.*

- **Hoy:** eventos de dominio (`KudoPublicado`) publicados tras confirmar la transacción y consumidos de forma asíncrona. Productor y consumidores no se conocen.
- **Evolución:** *transactional outbox* + bus de mensajes (RabbitMQ/Kafka) cuando los consumidores deban vivir en procesos separados. El puerto `DomainEventPublisherPort` ya aísla ese cambio.

**Evaluación honesta:** responsividad y resiliencia: **alta**; elasticidad: **parcial** (por SSE); mensajes: **parcial** (en memoria, sin garantía de entrega ante caída del proceso, mitigada con la tabla `notificacion`).

---

## 2. Twelve-Factor App — matriz de cumplimiento

Escala: ✅ Cumple · 🟡 Cumple parcialmente · ❌ No cumple.

| # | Factor | Análisis | Evaluación | Justificación |
|---|---|---|---|---|
| I | **Codebase** — una base de código por aplicación, en control de versiones | Dos aplicaciones independientes: `uco-kudos-backend` y `uco-kudos-frontend`, cada una con su repositorio Git; mismo código en todos los entornos. | ✅ | Cada aplicación tiene su propio repositorio; los despliegues provienen de la misma rama. |
| II | **Dependencies** — declarar y aislar dependencias | Maven (`pom.xml`) y npm (`package-lock.json`); imagen Docker con el entorno completo. | ✅ | No se asume software preinstalado; versiones fijadas; Dependabot y Trivy vigilan las dependencias. |
| III | **Config** — configuración en el entorno | URL de BD, claves de Brevo/Twilio/Supabase y secreto JWT vienen de variables de entorno (`@ConfigurationProperties`); secretos en GitHub Secrets y en el panel de Render/Vercel. | ✅ | Ningún secreto en el repositorio; el escaneo de secretos de Trivy lo comprueba. |
| IV | **Backing services** — servicios de apoyo como recursos adjuntos | PostgreSQL, Supabase Storage, Brevo y Twilio se acceden por URL/credencial y a través de puertos. | ✅ | Reemplazar un servicio es cambiar configuración o un adaptador. |
| V | **Build, release, run** — separar fases | CI construye y prueba; CD construye la imagen versionada por SHA del *commit* y la despliega; el arranque solo ejecuta. | ✅ | Pipelines separados de construcción y despliegue; imagen inmutable. |
| VI | **Processes** — procesos sin estado | El backend no guarda sesión (JWT) ni archivos locales. | 🟡 | Excepción: el registro de conexiones SSE en memoria. Se documenta con su evolución (Redis Pub/Sub). |
| VII | **Port binding** — exportar servicios por puerto | Spring Boot incluye servidor embebido y escucha en `PORT`. | ✅ | No depende de un servidor de aplicaciones externo. |
| VIII | **Concurrency** — escalar mediante procesos | Escalado horizontal por instancias; asincronía con ejecutores configurables. | 🟡 | Escalable por diseño; el plan gratuito de Render usa una sola instancia (limitación de entorno, no de arquitectura). |
| IX | **Disposability** — arranque rápido y apagado limpio | `server.shutdown=graceful`; sin trabajo en memoria que se pierda salvo notificaciones en vuelo (registradas en BD). | 🟡 | Arranque de JVM de decenas de segundos; el plan gratuito suspende el servicio por inactividad (se "despierta" antes de sustentar). |
| X | **Dev/prod parity** — paridad entre entornos | Pruebas con PostgreSQL real vía Testcontainers; mismo contenedor en local y producción. | 🟡 | Mismo motor y misma imagen; la diferencia es que Twilio opera en *sandbox* y no en producción. |
| XI | **Logs** — logs como flujo de eventos | Registros en JSON a la salida estándar con `trace_id`; no se escriben archivos. | ✅ | Render captura la salida estándar. |
| XII | **Admin processes** — tareas administrativas como procesos puntuales | Migraciones de esquema con Flyway ejecutadas al desplegar; carga inicial de datos como migración versionada. | ✅ | Las tareas administrativas usan el mismo código y la misma configuración. |

**Resumen:** 8 factores cumplen plenamente y 4 parcialmente, con la razón y la evolución documentadas.

## 3. Para la sustentación

- **"¿Es un sistema reactivo?"** Aplica los cuatro principios con distintos niveles de madurez: aísla fallas, responde sin esperar a terceros, es escalable por no tener estado, y usa eventos internos. Reconozco que SSE en memoria limita la elasticidad y lo mitigo con una evolución clara.
- **"¿Por qué el factor VI es parcial?"** Porque guardo las conexiones SSE en memoria; con varias instancias necesitaría Redis. Es una limitación consciente, no un descuido.
