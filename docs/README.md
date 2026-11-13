# UCO Kudos — Documentación de Arquitectura

**Proyecto Integrador Final · Ingeniería del Software II · Universidad Católica de Oriente**
Modalidad: individual · Entrega y sustentación: viernes 13 de noviembre de 2026, 12:00 m.

> Estado: documentación v0.5 (borrador de trabajo). La documentación y el diseño cubren **todo** el alcance del enunciado; solo el código se limita a la línea base. Los diagramas se elaboran aparte, uno a uno, y se enlazan en la sección "Diagramas".

---

## 1. Resumen ejecutivo

UCO Kudos es la plataforma institucional de reconocimientos de la UCO. Permite que miembros de la comunidad académica publiquen **Kudos** (reconocimientos) a otras personas, con categorías, adjuntos, réplicas, calificaciones y moderación, dentro de una estructura jerárquica de roles institucionales.

La solución se construye como un **monolito modular con arquitectura hexagonal (puertos y adaptadores)**, aplicando Clean Architecture. Se entrega una **línea base ejecutable** que implementa completo el flujo *Publicar Kudo* (persistencia, correo, WhatsApp, push en tiempo real y auditoría) y se **diseña** el resto de la funcionalidad.

| Capa | Tecnología (SBB) |
|---|---|
| Frontend | React + Vite, PWA, Mobile First |
| Backend | Java (LTS) + Spring Boot, Maven |
| Base de datos | PostgreSQL (Supabase) |
| Adjuntos | Supabase Storage (bucket privado, URLs firmadas) |
| Correo | Brevo (API HTTPS) |
| WhatsApp | Twilio WhatsApp Sandbox |
| Push en tiempo real | Server-Sent Events (SSE) |
| Seguridad | Spring Security + JWT + BCrypt |
| Observabilidad | Actuator + Micrometer + logs JSON + tabla de auditoría |
| CI/CD | GitHub Actions |
| Calidad / Seguridad | SonarQube Cloud + Trivy |
| Despliegue | Vercel (front) · Render (back) · Supabase (datos) |

---

## 2. Alcance: implementado vs. diseñado

| Área del enunciado | Línea base (código) | Diseño (documentado) |
|---|---|---|
| Publicar Kudo (5 pasos) | ✅ Completo | ✅ |
| Login y roles base | ✅ (usuarios sembrados) | ✅ |
| Categorías (15 mínimas) | ✅ Catálogo sembrado y lectura | ✅ Administración por rol |
| Adjuntos | ✅ Carga y descarga firmada | ✅ Estrategias completas |
| Registro con verificación correo + celular | — | ✅ |
| Flujo de aprobaciones por jerarquía | — | ✅ |
| Gestión académica (programas/facultades) | Parcial (modelo y datos semilla) | ✅ |
| Réplicas ilimitadas, calificaciones 1–5 | — | ✅ |
| Reportes y vetos | — | ✅ |

> Justificación: el enunciado exige *implementar completamente* únicamente el flujo Publicar Kudo; la **documentación y el diseño sí cubren todo** (casos de uso, estados, permisos, datos y API en los documentos 10 y 11).

---

## 3. Índice

| # | Documento | Contenido |
|---|---|---|
| 01 | [Requisitos y dominio](01-requisitos-y-dominio.md) | Roles, reglas de negocio, flujos, modelo conceptual, supuestos |
| 02 | [Drivers y atributos de calidad](02-drivers-y-atributos-de-calidad.md) | DRV-001..007, escenarios de calidad, respuesta a alta lectura |
| 03 | [ABB y SBB](03-abb-sbb.md) | Bloques de arquitectura y de solución, evaluación de cada SBB |
| 04 | [Arquitectura](04-arquitectura.md) | Hexagonal / Clean Architecture, paquetes, flujo, patrones, SOLID, Clean Code |
| 05 | [Reactive y Twelve-Factor](05-reactive-y-twelve-factor.md) | Manifiesto Reactivo y matriz de los 12 factores |
| 06 | [Desarrollo seguro](06-seguridad.md) | Autenticación, autorización, secretos, validaciones, APIs, terceros, riesgos |
| 07 | [Adjuntos y observabilidad](07-adjuntos-y-observabilidad.md) | Estrategias de adjuntos; logs, métricas, trazas y auditoría |
| 08 | [Pruebas y DevSecOps](08-pruebas-y-devsecops.md) | Pirámide de pruebas, CI, CD, Sonar, Trivy, publicación |
| 09 | [Evidencias](09-evidencias.md) | Lista de evidencias obligatorias y estado |
| 10 | [Diseño funcional completo](10-diseno-funcional.md) | 28 casos de uso, módulos, permisos por rol, estados, puertos y secuencias |
| 11 | [Modelo de datos y API](11-modelo-de-datos-y-api.md) | Tablas, restricciones del enunciado en BD, índices y endpoints REST |
| 12 | [Diseño de alto nivel y detallado](12-diseno-alto-y-detallado.md) | Qué cubre cada nivel, contenedores, despliegue, Publicar Kudo clase a clase, versiones verificadas |
| — | [ADR](adr/README.md) | 11 decisiones arquitectónicas |

---

## 4. Diagramas (se aprueban uno a uno)

Todos están en `diagramas/UCO-Kudos.drawio` (una página por diagrama).

| Diagrama | Archivo | Estado |
|---|---|---|
| Nivel 1 — Contexto (C4) | pág. 1 | Entregado, por revisar (v0.3: se quitó Supabase como externo; la BD y el almacén son contenedores del nivel 2) |
| Nivel 2 — Contenedores (C4) | pág. 2 | Entregado, por revisar |
| Modelo de dominio | pág. 3 | Entregado, por revisar |
| Componentes (backend) | pág. 4 | Entregado, por revisar (3 versiones por fijar, ver 12 §4) |
| Paquetes | pág. 5 | Entregado, por revisar |
| Secuencia — Publicar Kudo (1/2: guardar, síncrono hasta el COMMIT) | pág. 6 | Entregado, por revisar |
| Secuencia — Publicar Kudo (2/2: notificaciones, asíncrono) | pág. 7 | Entregado, por revisar |
| Secuencia — registro y activación | pág. 8 | Pendiente |
| Secuencia — aprobación jerárquica | pág. 9 | Pendiente |
| Secuencia — réplica y lectura de hilo | pág. 10 | Pendiente |
| Secuencia — calificar | pág. 11 | Pendiente |
| Secuencia — reportar y vetar | pág. 12 | Pendiente |

---

## 5. Trazabilidad con el enunciado

| Requisito del enunciado | Dónde se cubre |
|---|---|
| Arquitectura objetivo, diseño alto nivel y detallado | 04 + diagramas |
| Drivers y atributos de calidad | 02 |
| ABB / SBB | 03 |
| Clean Architecture (capas, dependencias, responsabilidades, reglas) | 04 §2–§5 |
| Reactive Manifesto | 05 §1 |
| Twelve-Factor (matriz) | 05 §2 |
| Clean Code, SOLID | 04 §8–§9 |
| Patrones de diseño | 04 §7 |
| Desarrollo seguro | 06 |
| Pirámide de pruebas | 08 §1 |
| CI, CD, Sonar, Trivy | 08 §2–§5 |
| Publicación (URL pública) | 08 §6, ADR-0010 |
| Registro, activación y aprobaciones jerárquicas | 10 §3 (M2, M3), 11 |
| Gestión académica y administración por rol | 10 §3 (M4), 10 §4 |
| Réplicas, calificaciones, reportes y vetos | 10 §3 (M7, M8), 11 §1.3 |
| Estrategias de adjuntos (almacenamiento, seguridad, recuperación, trazabilidad) | 07 §1 |
| Observabilidad y auditoría | 07 §2 |
| Evidencias obligatorias | 09 |
| Manual de puesta a punto | `MANUAL-PUESTA-A-PUNTO.md` (se redacta con el código) |

---

## 6. Referencias externas verificadas el 9-nov-2026

- Render: los servicios web gratuitos no permiten tráfico saliente a los puertos SMTP 25, 465 y 587 (vigente desde septiembre de 2025). <https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports>
- Twilio WhatsApp Sandbox: solo envía a quienes enviaron el mensaje *join*; la sesión vence a los 3 días; fuera de la ventana de 24 h solo admite plantillas aprobadas. <https://www.twilio.com/docs/whatsapp/sandbox.md>
- SonarQube Cloud: plan gratuito para proyectos públicos. <https://community.sonarsource.com/t/introducing-the-new-free-oss-plan-in-sonarqube-cloud/176923>
- Resend: con el dominio de pruebas solo envía al correo de la propia cuenta. <https://www.resend.com/docs/knowledge-base/403-error-resend-dev-domain.md>
- Brevo: plan gratuito de 300 correos por día. <https://www.tajo.io/blog/brevo-free-plan-guide>
