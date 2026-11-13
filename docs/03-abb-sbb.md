# 03 · Architecture Building Blocks (ABB) y Solution Building Blocks (SBB)

**ABB** = capacidad arquitectónica abstracta (*qué* necesita el sistema), independiente de tecnología.
**SBB** = producto o tecnología concreta que la materializa (*con qué*).

En la arquitectura hexagonal cada ABB de infraestructura se expresa como un **puerto** (interfaz en `servicios.output.port`) y cada SBB como un **adaptador** (clase en `infraestructura.output.adapter`). Cambiar de SBB equivale a escribir otro adaptador.

## 1. Mapa ABB → Puerto → SBB

| # | ABB | Puerto (hexagonal) | SBB seleccionado | ADR |
|---|---|---|---|---|
| 1 | Presentación móvil | — (adaptador de entrada) | React + Vite, PWA | 0002 |
| 2 | Gestión de identidad | `PersonaRepositoryPort` | PostgreSQL (tablas `persona`, `asignacion_rol`) | 0003 |
| 3 | Autenticación | `TokenServicePort`, `PasswordHasherPort` | Spring Security + JWT + BCrypt | 0007 |
| 4 | Autorización | (reglas en casos de uso + `@PreAuthorize`) | Spring Security (RBAC por rol) | 0007 |
| 5 | Persistencia | `KudoRepositoryPort`, `CategoriaRepositoryPort`, … | PostgreSQL (Supabase) + JDBC/JPA + Flyway | 0003 |
| 6 | Gestión documental y de archivos | `FileStoragePort` | Supabase Storage (bucket privado) | 0004 |
| 7 | Mensajería interna | `DomainEventPublisherPort` | Eventos de dominio de Spring (`@Async`, tras *commit*) | 0005 |
| 8 | Notificación por correo | `EmailSenderPort` | Brevo (API HTTPS) | 0006 |
| 9 | Notificación por WhatsApp | `WhatsAppSenderPort` | Twilio WhatsApp Sandbox | 0006 |
| 10 | Notificación push en tiempo real | `PushNotifierPort` | Server-Sent Events (SSE) | 0006 |
| 11 | Auditoría | `AuditLogPort` | Tabla `auditoria` (solo inserción) en PostgreSQL | 0008 |
| 12 | Logging | — (transversal) | SLF4J + Logback en JSON a la salida estándar | 0008 |
| 13 | Observabilidad | — (transversal) | Spring Boot Actuator + Micrometer (métricas/trazas) | 0008 |
| 14 | Caché | `CachePort` / anotaciones | Caffeine | 0009 |
| 15 | Gestión de configuración | — | Variables de entorno (Spring `@ConfigurationProperties`) | 0010 |
| 16 | Gestión de secretos | — | Variables de entorno de Render/Vercel y GitHub Secrets | 0007 |
| 17 | Seguridad (perímetro) | — | CORS restringido, límite de tasa (Bucket4j), cabeceras seguras | 0007 |
| 18 | Resiliencia | — (decorador de adaptadores) | Resilience4j (reintento, *circuit breaker*, *timeout*) | 0006 |
| 19 | Hospedaje / despliegue | — | Vercel + Render (Docker) + Supabase | 0010 |
| 20 | DevSecOps | — | GitHub Actions + SonarQube Cloud + Trivy + Dependabot | 0011 |

## 2. Criterios de selección de SBB

Escala: ●●● muy favorable · ●● aceptable · ● débil.

### 2.1 Plataforma y lenguaje

| SBB | Costo | Complejidad | Escalabilidad | Riesgo | Mantenibilidad | Evolución futura | Notas |
|---|---|---|---|---|---|---|---|
| **Java + Spring Boot** *(elegido)* | ●●● gratis | ●● | ●●● | ●●● bajo | ●●● | ●●● | Dominio de la persona; Sonar, JUnit, ArchUnit y Testcontainers maduros. |
| NestJS (TypeScript) | ●●● | ●●● | ●● | ●● | ●●● | ●● | Descartado: menor dominio para sustentar en vivo. |
| FastAPI (Python) | ●●● | ●●● | ●● | ●● | ●● | ●● | Descartado: tipado y herramientas de arquitectura menos maduros. |
| **React + Vite (PWA)** *(elegido)* | ●●● | ●●● | ●●● | ●●● | ●●● | ●●● | Tiempo de build corto; PWA con *service worker*. |
| Angular | ●●● | ● | ●●● | ●● | ●●● | ●●● | Descartado: mayor ceremonia con tiempo limitado. |

### 2.2 Datos y archivos

| SBB | Costo | Complejidad | Escalabilidad | Riesgo | Mantenibilidad | Evolución futura | Notas |
|---|---|---|---|---|---|---|---|
| **PostgreSQL en Supabase** *(elegido)* | ●●● plan gratuito | ●●● | ●● | ●● | ●●● | ●●● | Consultas recursivas, índices parciales, `CHECK`. El proyecto gratuito puede pausarse por inactividad: se verifica antes de sustentar. |
| PostgreSQL en Neon | ●●● | ●●● | ●● | ●● | ●●● | ●●● | Alternativa equivalente (mismo motor, otro adaptador de conexión). |
| MongoDB Atlas | ●●● | ●● | ●●● | ●● | ●● | ●● | Descartado: el dominio es relacional y exige restricciones de unicidad. |
| **Supabase Storage** *(elegido)* | ●●● | ●●● | ●● | ●● | ●●● | ●●● | Mismo proveedor que la BD; URLs firmadas; bucket privado. |
| Amazon S3 | ●● | ●● | ●●● | ●●● | ●●● | ●●● | Más configuración (IAM); evolución natural por el puerto. |
| Guardar en la BD (BLOB) | ●●● | ●●● | ● | ● | ● | ● | Descartado: encarece lecturas y respaldos. |

### 2.3 Notificaciones

| SBB | Costo | Complejidad | Escalabilidad | Riesgo | Mantenibilidad | Evolución futura | Notas |
|---|---|---|---|---|---|---|---|
| **Brevo (API HTTPS)** *(elegido)* | ●●● 300/día gratis | ●●● | ●● | ●● | ●●● | ●●● | Funciona sobre HTTPS, por lo que no depende de puertos SMTP bloqueados. Requiere verificar el remitente. |
| SMTP de Gmail | ●●● | ●● | ● | ● | ●● | ● | **Descartado:** Render gratuito bloquea SMTP (25/465/587). |
| Resend | ●●● | ●●● | ●● | ● | ●●● | ●●● | Descartado para la demostración: sin dominio propio solo envía al correo de la cuenta. Es alternativa si se verifica un dominio. |
| **Twilio WhatsApp Sandbox** *(elegido)* | ●●● | ●●● | ● | ● | ●●● | ●●● | Solo escribe a quien envió el código *join*; la sesión vence a los 3 días; mensajes libres solo dentro de la ventana de 24 h. Evolución: remitente de WhatsApp registrado con plantillas aprobadas. |
| Meta WhatsApp Cloud API | ●●● | ●● | ●●● | ●● | ●● | ●●● | Más pasos de alta; mismas restricciones de plantillas fuera de la ventana. |
| **SSE** *(elegido, push)* | ●●● | ●●● | ●● | ●● | ●●● | ●● | Unidireccional y estándar; suficiente porque "si está conectado". Con varias instancias requiere un bus (Redis). |
| WebSocket | ●●● | ●● | ●● | ●● | ●● | ●●● | Descartado: bidireccionalidad no necesaria. |
| Firebase Cloud Messaging | ●●● | ●● | ●●● | ●● | ●● | ●●● | Evolución para Web Push con la app cerrada. |

### 2.4 Seguridad, observabilidad y DevSecOps

| SBB | Costo | Complejidad | Escalabilidad | Riesgo | Mantenibilidad | Evolución futura | Notas |
|---|---|---|---|---|---|---|---|
| **Spring Security + JWT** *(elegido)* | ●●● | ●● | ●●● (sin estado) | ●● | ●●● | ●● | Sin dependencia externa; evolución a OIDC/SSO institucional. |
| Firebase Auth / Auth0 | ●● | ●●● | ●●● | ●● | ●●● | ●●● | Descartados por tiempo y por no controlar el modelo de roles jerárquico. |
| **Actuator + Micrometer** *(elegido)* | ●●● | ●●● | ●●● | ●●● | ●●● | ●●● | Estándar de Spring; exportable a Prometheus/Grafana. |
| **GitHub Actions** *(elegido)* | ●●● | ●●● | ●●● | ●●● | ●●● | ●●● | Integrado con los repositorios. |
| **SonarQube Cloud** *(elegido)* | ●●● gratis (repos públicos) | ●●● | ●●● | ●●● | ●●● | ●●● | Requiere repositorios públicos para el plan gratuito. |
| **Trivy** *(elegido)* | ●●● | ●●● | ●●● | ●●● | ●●● | ●●● | Escaneo de dependencias, secretos, configuración e imagen. |

## 3. Para la sustentación

- **"¿Qué es un ABB y qué es un SBB?"** El ABB dice *qué capacidad* necesito (notificar por correo); el SBB dice *con qué producto* lo resuelvo (Brevo). En el código, el ABB es una interfaz (puerto) y el SBB una clase (adaptador).
- **"¿Por qué cambió el correo si Gmail es gratis?"** Porque el despliegue gratuito de Render bloquea los puertos SMTP; se eligió un proveedor por API HTTPS. Gracias al puerto, el cambio fue solo un adaptador.
