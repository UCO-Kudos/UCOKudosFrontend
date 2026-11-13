# 12 · Diseño de alto nivel y diseño detallado

El enunciado pide dos niveles de diseño. Este documento define **qué cubre cada uno**, los resume y enlaza cada parte con el documento o diagrama donde vive.

## 1. Qué es cada nivel

| | **Diseño de alto nivel** | **Diseño detallado** |
|---|---|---|
| Pregunta que responde | ¿Qué piezas tiene el sistema, cómo se relacionan y por qué se eligió esa forma? | ¿Cómo está construida cada pieza por dentro y cómo se comporta paso a paso? |
| Audiencia | Quien necesita entender el sistema sin leer código | Quien va a programarlo, probarlo o modificarlo |
| Nivel de zoom | Sistema → contenedores → despliegue | Paquetes → componentes → clases/puertos → secuencias → datos |
| Decisiones que contiene | Estilo, tecnología por capa, despliegue, seguridad y calidad transversales | Reglas de dominio, contratos de puertos, esquema de datos, API, patrones |

### Dónde está cada cosa

| Elemento | Nivel | Dónde |
|---|---|---|
| Contexto del sistema | Alto | Diagrama C4 nivel 1 (`diagramas/UCO-Kudos.drawio`, pág. 1) |
| Contenedores y su comunicación | Alto | Diagrama C4 nivel 2 (pág. 2) y §2.1 de este documento |
| Drivers y atributos de calidad | Alto | Documento 02 |
| Estilo arquitectónico y capas | Alto | Documento 04 §1–§4 |
| Bloques de arquitectura y de solución (ABB/SBB) | Alto | Documento 03 |
| Decisiones arquitectónicas | Alto | `adr/` (11 ADR) |
| Despliegue y entornos | Alto | §2.2 de este documento, ADR-0010, documento 08 §6 |
| Seguridad, observabilidad, resiliencia (transversales) | Alto | Documentos 05, 06, 07 |
| Modelo de dominio | Detallado | Diagrama de dominio (pág. 3) y documento 01 §8 |
| Componentes y dependencias con versión | Detallado | Diagrama de componentes (pág. 4) y §4 de este documento |
| Estructura de paquetes y reglas | Detallado | Documento 04 §5 y diagrama de paquetes (pág. 5) |
| Casos de uso, módulos, permisos, estados, puertos | Detallado | Documento 10 |
| Modelo de datos y API | Detallado | Documento 11 |
| Flujo Publicar Kudo (clase a clase) | Detallado | §3.1 de este documento y documento 04 §6 |
| Secuencias | Detallado | Documento 10 §7 y diagrama de secuencia de Publicar Kudo (pág. 6 y 7; las demás, pendientes) |
| Patrones, SOLID, Clean Code | Detallado | Documento 04 §7–§9 |

---

## 2. Diseño de alto nivel

### 2.1 Contenedores (C4 nivel 2)

| Contenedor | Tecnología | Responsabilidad | Se comunica con | Protocolo |
|---|---|---|---|---|
| Servidor web estático | Vercel (CDN) | Entregar los archivos de la aplicación web | Navegador | HTTPS |
| Aplicación web (PWA) | React + Vite | Interfaz Mobile First; publicar y consultar Kudos; recibir notificaciones | API Backend | HTTPS/JSON + JWT; SSE |
| API Backend | Java 25 + Spring Boot 4.1 | Lógica de negocio, API REST, seguridad, notificaciones, auditoría | Base de datos, Almacén, Brevo, Twilio | JDBC/TLS; HTTPS |
| Base de datos | PostgreSQL (Supabase) | Persistir personas, Kudos, notificaciones y auditoría | — | — |
| Almacén de adjuntos | Supabase Storage | Guardar adjuntos en bucket privado y entregar URLs firmadas | — | — |

Sistemas externos: **Brevo** (correo) y **Twilio WhatsApp** (mensajería). La base de datos y el almacén son contenedores propios aunque estén alojados en Supabase, porque los datos son del sistema; por eso Supabase no aparece como sistema externo en el nivel 1.

### 2.2 Despliegue

| Pieza | Dónde | Cómo llega | Configuración |
|---|---|---|---|
| Frontend | Vercel | GitHub Actions → CLI de Vercel | `VITE_API_URL` (única; no es secreto) |
| Backend | Render (Docker, plan gratuito) | GitHub Actions construye la imagen y llama al *deploy hook* | Variables de entorno (ver tabla) |
| Datos y archivos | Supabase | Migraciones Flyway al arrancar el backend | Cadena JDBC y claves por variables de entorno |

Variables de entorno del backend (nunca en el repositorio; en Render y en GitHub Secrets):

| Variable | Para qué |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL |
| `JWT_SECRET` | Firma HS256 de los tokens |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` | Almacén de adjuntos |
| `BREVO_API_KEY`, `MAIL_FROM` | Correo |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | WhatsApp (sandbox) |
| `CORS_ALLOWED_ORIGIN` | Origen permitido del frontend |

Limitaciones asumidas del plan gratuito: Render suspende el servicio por inactividad (se despierta con `/actuator/health` antes de sustentar) y Supabase puede pausar el proyecto (se verifica el mismo día).

### 2.3 Cómo responde el diseño a los drivers

| Driver | Decisión de alto nivel |
|---|---|
| Mobile First (90 % móvil) | PWA con *service worker*, diseño desde 360 px, entrega por CDN |
| Alta lectura | Paginación por cursor, índices, caché Caffeine, ETag (ADR-0009) |
| Mantenibilidad | Hexagonal + reglas ArchUnit (ADR-0001) |
| Disponibilidad ante terceros | Canales independientes con reintento y *circuit breaker* (ADR-0006) |
| Seguridad | JWT, BCrypt, RBAC, validación en el borde, secretos por entorno (ADR-0007) |
| Trazabilidad | Auditoría append-only con `trace_id` (ADR-0008) |

---

## 3. Diseño detallado

### 3.1 Publicar Kudo (línea base), clase a clase

| Capa | Clase / interfaz | Responsabilidad |
|---|---|---|
| Infraestructura (entrada) | `KudoController` | Recibe `POST /api/kudos` (multipart), valida formato y llama al caso de uso |
| Servicios (puerto de entrada) | `PublicarKudoUseCase` | Contrato del caso de uso: `PublicarKudoResponse publicar(PublicarKudoCommand)` |
| Servicios (implementación) | `PublicarKudoService` | Orquesta la transacción: valida actores, crea el Kudo, guarda adjuntos, persiste, audita, publica el evento |
| Dominio | `Kudo.crear(...)` | Factory estático: garantiza las invariantes (autor ≠ destinatario, categoría activa, contenido no vacío) |
| Dominio | `KudoPublicado` | Evento de dominio inmutable |
| Servicios (puertos de salida) | `KudoRepositoryPort`, `PersonaRepositoryPort`, `CategoriaRepositoryPort`, `FileStoragePort`, `AuditLogPort`, `DomainEventPublisherPort` | Contratos hacia el exterior |
| Infraestructura (salida) | `KudoJdbcRepository`, `SupabaseStorageAdapter`, `JdbcAuditLogAdapter`, `SpringDomainEventPublisher` | Implementan los puertos |
| Infraestructura (entrada) | `NotificacionesKudoListener` | `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`: recibe `KudoPublicado` y llama al puerto de entrada |
| Servicios (puerto de entrada) | `NotificarKudoPublicadoUseCase` | Contrato del caso de uso de notificación (módulo M9) |
| Servicios (implementación) | `NotificarKudoPublicadoService` | Dispara los tres canales de forma independiente y registra cada resultado |
| Servicios (puertos de salida) | `EmailSenderPort`, `WhatsAppSenderPort`, `PushNotifierPort` | Un puerto por canal |
| Infraestructura (salida) | `BrevoEmailSenderAdapter`, `TwilioWhatsAppSenderAdapter`, `SsePushNotifierAdapter` | Un adaptador por proveedor; decorados con reintento, *circuit breaker* y auditoría |

Fronteras transaccionales: la transacción cubre **persistir Kudo + adjuntos + auditoría `KUDO_PUBLICADO`**. Las notificaciones ocurren **después del *commit***, en otro hilo, y cada una registra su propio resultado en `notificacion` y `auditoria`.

Secuencias (`diagramas/UCO-Kudos.drawio`, pág. 6 y 7): se dividen en dos porque la frontera transaccional es también la frontera síncrono/asíncrono.

- **Pág. 6 (síncrona):** solicitud → `@Transactional` (buscar actores, `Kudo.crear`, adjuntos al bucket privado, `INSERT`, auditoría `KUDO_PUBLICADO`, evento retenido) → `COMMIT` → `201 Created`. El marco `alt` es la rama de error (`422`, nada se guarda); el marco `loop` es "por cada adjunto".
- **Pág. 7 (asíncrona):** `KudoPublicado` se entrega `AFTER_COMMIT` y en otro hilo (`@Async`) → listener → puerto de entrada → tres canales dentro de un marco `par` (correo, WhatsApp, push). Cada canal devuelve su resultado al servicio, que registra `notificacion` y auditoría con el mismo `trace_id`.
- En el diagrama, "Repositorios JDBC" agrupa los adaptadores de `KudoRepositoryPort`, `PersonaRepositoryPort` y `CategoriaRepositoryPort` para no repetir una línea de vida por cada uno.
- Los retornos de métodos `void` (auditoría, publicación del evento) no se dibujan.

Manejo de errores:

| Situación | Resultado |
|---|---|
| Destinatario inexistente o inactivo | `422` con `problem+json`; nada se guarda |
| Autor = destinatario | `422`; nada se guarda |
| Adjunto de tipo o tamaño no permitido | `400`; nada se guarda |
| Falla Supabase Storage al guardar adjunto | `502`; transacción revertida |
| Falla Brevo o Twilio | El Kudo **se conserva**; `notificacion` queda `FALLIDA` y se audita el fallo |
| Destinatario desconectado | Push `OMITIDA_DESCONECTADO`; sin error |

### 3.2 Diseño del frontend (PWA)

| Elemento | Diseño |
|---|---|
| Rutas | `/login`, `/` (muro de Kudos recibidos), `/enviados`, `/kudos/nuevo`, `/kudos/:id` |
| Estado de servidor | Capa de servicios que consume la API REST (`fetch`) con el JWT en memoria; sin lógica de negocio en el cliente |
| Tiempo real | Un cliente SSE (`EventSource`) abierto tras el login que muestra un aviso al llegar `KudoPublicado` para el usuario |
| Mobile First | Diseño desde 360 px, objetivos táctiles ≥ 44 px, formularios de una columna |
| PWA | Manifiesto instalable; *service worker* con *stale-while-revalidate* para el catálogo y la lista |
| Carga | Rutas con carga diferida; lista con paginación por cursor |
| Seguridad | Sin secretos en el cliente; el token no se guarda en `localStorage` en la línea base |

> El token en memoria se pierde al recargar. Es una decisión consciente de seguridad para la línea base; la alternativa es una cookie `HttpOnly`, que se evaluaría con la configuración de CORS y CSRF.

### 3.3 Dónde está el resto del diseño detallado

Los casos de uso, permisos, estados, puertos por módulo, tablas, índices y endpoints de **toda** la funcionalidad (registro, aprobaciones, réplicas, calificaciones, moderación) están en los documentos 10 y 11. La línea base solo implementa el subconjunto marcado con ✅.

---

## 4. Versiones y estado de verificación

Las versiones se verificaron el 9-nov-2026. El entorno de trabajo no puede consultar Maven Central directamente (el proxy lo bloquea), así que cada valor tiene una fuente distinta y se declara aquí.

| Componente | Versión | Fuente | Estado |
|---|---|---|---|
| Java | 25 (LTS) | Decisión; dentro del rango soportado por Spring Boot 4 | Confirmar `java -version` en la máquina de desarrollo |
| Spring Boot | 4.1.1 | Ejemplo de componentes del curso; la línea 4.1 se publicó el 10-jun-2026 | Verificado como línea vigente |
| Spring MVC / Tomcat | 7.0.9 / 11.0.25 | Ejemplo de componentes del curso (BOM de Boot 4.1.1) | Tomado del ejemplo |
| Hibernate Validator / HikariCP | 9.1.3 / 7.0.2 | Ejemplo de componentes del curso (BOM de Boot 4.1.1) | Tomado del ejemplo |
| `postgresql` (driver) | 42.7.13 | Ejemplo de componentes del curso | Tomado del ejemplo |
| `archunit-junit5` | 1.5.1 | Ejemplo de componentes del curso | Tomado del ejemplo |
| `resilience4j-spring-boot4` | 2.4.0 | Issue oficial: la versión 2.4.0 añade soporte para Spring Boot 4 | Verificado |
| `springdoc-openapi-starter-webmvc-ui` | 3.2.0 | La serie 3.x apunta a Spring Boot 4; 3.2.0 figura como publicada | Confirmar compatibilidad con 4.1.1 al compilar |
| Starters de Spring Boot | Nombres de Boot 4 | Guía de modularización de Spring Boot 4 | Verificado (`webmvc`, `flyway`, `security-oauth2-resource-server`, `*-test`) |
| `caffeine`, `testcontainers`, Flyway, Micrometer, Nimbus | Las gestiona el BOM de Boot | — | No se fija versión propia |
| `bucket4j`, `wiremock`, `jacoco-maven-plugin` | **Por fijar** | No verificadas | Fijar al crear el `pom.xml` y actualizar el diagrama |

**Regla para el `pom.xml`:** usar `spring-boot-starter-parent 4.1.1` y no declarar versión de nada que el BOM gestione. Después de generar el proyecto, ejecutar `mvn dependency:tree` y corregir en el diagrama de componentes cualquier valor que difiera.

---

## 5. Para la sustentación

- **"¿Cuál es la diferencia entre alto y bajo nivel en su diseño?"** Alto nivel: contexto, contenedores y despliegue (qué piezas hay y por qué). Detallado: paquetes, componentes, dominio, puertos, datos, API y secuencias (cómo funciona cada pieza).
- **"¿Por qué Spring Boot 4 y no 3?"** La 3.5 ya no tiene soporte abierto desde junio de 2026; un proyecto nuevo debe nacer en la línea vigente.
- **"¿Por qué no usaron el SDK de Twilio o Brevo?"** Cada adaptador solo necesita una llamada HTTPS; `RestClient` evita dependencias y mantiene el adaptador pequeño y probado con WireMock.
- **"¿Qué pasa si Brevo se cae al publicar?"** El Kudo ya está guardado; la notificación queda `FALLIDA`, se audita y se puede reintentar. Los otros canales no se ven afectados.
