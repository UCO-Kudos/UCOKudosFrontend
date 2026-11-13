# Registro de Decisiones Arquitectónicas (ADR) — UCO Kudos

Formato basado en el ejemplo del curso (Estado, criterios, candidatos, análisis, recomendación), en versión compacta por restricción de tiempo.

## Índice

| # | Título | Estado | Driver |
|---|---|---|---|
| [0001](adr-0001.md) | Monolito modular con arquitectura hexagonal | Aceptado | DRV-005, DRV-007 |
| [0002](adr-0002.md) | Stack: Java + Spring Boot y React PWA (Mobile First) | Aceptado | DRV-001 |
| [0003](adr-0003.md) | Persistencia en PostgreSQL y modelo de réplicas recursivas | Aceptado | DRV-002 |
| [0004](adr-0004.md) | Adjuntos en almacenamiento de objetos privado | Aceptado | DRV-004 |
| [0005](adr-0005.md) | Eventos de dominio asíncronos como mensajería interna | Aceptado | DRV-003 |
| [0006](adr-0006.md) | Notificaciones multicanal: Brevo, Twilio y SSE | Aceptado (con limitaciones) | DRV-003 |
| [0007](adr-0007.md) | Seguridad: Spring Security, JWT y RBAC | Aceptado | DRV-005 |
| [0008](adr-0008.md) | Observabilidad y auditoría de solo inserción | Aceptado | DRV-006 |
| [0009](adr-0009.md) | Estrategia de alta lectura: CQRS ligero y cachés | Aceptado | DRV-002 |
| [0010](adr-0010.md) | Despliegue gratuito: Vercel + Render + Supabase | Aceptado | DRV-007 |
| [0011](adr-0011.md) | DevSecOps: GitHub Actions, SonarQube Cloud y Trivy | Aceptado | DRV-007 |

## Convención

Cada ADR se numera en el orden en que se tomó la decisión. Si una decisión reemplaza a otra, la antigua se conserva y se marca "Reemplazado por ADR-XXXX".

## Estado de validación

Los ADR que dependen de un tercero (0006, 0010) incluyen una **evidencia pendiente** que se completa al construir la línea base (prueba real de envío y de despliegue).
