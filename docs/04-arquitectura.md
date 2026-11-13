# 04 · Arquitectura

## 1. Estilo arquitectónico

**Monolito modular con arquitectura hexagonal (puertos y adaptadores)**, que implementa los principios de **Clean Architecture**.

- *Monolito*: un único backend desplegable, sin estado. Reduce la complejidad operativa y es suficiente para el volumen esperado (ver ADR-0001).
- *Modular*: el código se organiza por capacidades de negocio y por capas, de modo que podría separarse en servicios en el futuro.
- *Hexagonal*: el dominio y los casos de uso no conocen la tecnología; se comunican con el exterior solo a través de **puertos** (interfaces) que implementan los **adaptadores**.

```text
        ADAPTADORES DE ENTRADA                    ADAPTADORES DE SALIDA
   (quien invoca la aplicación)               (lo que la aplicación usa)

   Controlador REST ─┐                      ┌─► Repositorio PostgreSQL
   Listener de       │     ┌──────────┐     ├─► Almacenamiento (Supabase)
   eventos           ├────►│ Puertos  │─────┤─► Correo (Brevo)
   Stream SSE ───────┘     │ de       │     ├─► WhatsApp (Twilio)
                           │ entrada  │     ├─► Push (SSE)
                           └────┬─────┘     └─► Auditoría
                                │
                     ┌──────────▼──────────┐
                     │  Casos de uso        │  ← capa de servicios
                     │  (servicios.input)   │
                     └──────────┬──────────┘
                                │ usa
                     ┌──────────▼──────────┐
                     │  DOMINIO             │  ← entidades, reglas, eventos
                     └─────────────────────┘
```

## 2. Capas (Clean Architecture)

| Capa | Paquete | Responsabilidad | Puede depender de |
|---|---|---|---|
| **Dominio** | `co.edu.uco.kudos.dominio` | Entidades, objetos de valor, reglas de negocio e invariantes, eventos de dominio, excepciones de dominio. | **Nada** (Java puro). |
| **Servicios (aplicación)** | `co.edu.uco.kudos.servicios` | Casos de uso que orquestan el dominio; define los **puertos de entrada** y los **puertos de salida**; DTO. | Dominio. |
| **Infraestructura** | `co.edu.uco.kudos.infraestructura` | **Adaptadores** de entrada (REST, listeners, SSE) y de salida (BD, correo, WhatsApp, almacenamiento, auditoría); configuración y seguridad. | Servicios y dominio. |

## 3. Regla de dependencia

```text
infraestructura ──► servicios ──► dominio
```

Las dependencias **siempre apuntan hacia adentro**. El dominio nunca importa Spring, JDBC ni un SDK de proveedor. La inversión de dependencias se logra así: el caso de uso declara un puerto de salida (`EmailSenderPort`) y la infraestructura lo implementa (`BrevoEmailSenderAdapter`).

## 4. Reglas arquitectónicas (verificadas automáticamente con ArchUnit)

| ID | Regla |
|---|---|
| AR-01 | `dominio` no depende de `servicios` ni de `infraestructura`. |
| AR-02 | `dominio` no importa `org.springframework..`, `jakarta.persistence..` ni SDK de terceros. |
| AR-03 | `servicios` no depende de `infraestructura`. |
| AR-04 | Los controladores solo invocan **puertos de entrada** (nunca adaptadores de salida directamente). |
| AR-05 | Los casos de uso solo hablan con el exterior mediante **puertos de salida**. |
| AR-06 | Los adaptadores de salida implementan interfaces de `servicios.output.port`. |
| AR-07 | Las entidades JPA/filas de BD no se exponen en la API; se usan DTO. |
| AR-08 | Sin dependencias cíclicas entre paquetes. |

## 5. Estructura de paquetes

Se sigue la convención del curso (`servicios.input.port` / `.adapter` / `.dto`, `infraestructura.input.controlador`) y se extiende con puertos de salida.

```text
co.edu.uco.kudos
├── dominio
│   ├── modelo              Kudo, Persona, Categoria, Adjunto, Contenido, Notificacion…
│   ├── evento              KudoPublicado
│   └── excepcion           ReglaDeNegocioException…
├── servicios
│   ├── input
│   │   ├── port            PublicarKudoUseCase, ListarKudosUseCase, SubirAdjuntoUseCase…
│   │   ├── adapter         PublicarKudoService… (implementan los casos de uso)
│   │   └── dto             PublicarKudoCommand, KudoResponse…
│   └── output
│       └── port            KudoRepositoryPort, FileStoragePort, EmailSenderPort,
│                           WhatsAppSenderPort, PushNotifierPort, AuditLogPort,
│                           DomainEventPublisherPort, TokenServicePort…
└── infraestructura
    ├── input
    │   ├── controlador     KudoController, AuthController, CategoriaController…
    │   ├── evento          NotificacionesKudoListener (escucha KudoPublicado y llama al puerto de entrada)
    │   └── stream          PushStreamController (SSE)
    ├── output
    │   └── adapter
    │       ├── persistencia   KudoJdbcRepository…
    │       ├── almacenamiento SupabaseStorageAdapter
    │       ├── correo         BrevoEmailSenderAdapter
    │       ├── whatsapp       TwilioWhatsAppSenderAdapter
    │       ├── push           SsePushNotifierAdapter
    │       └── auditoria      JdbcAuditLogAdapter
    └── configuracion       Seguridad, CORS, caché, ejecutores asíncronos, propiedades
```

> Módulos: los casos de uso se agrupan en subpaquetes por módulo funcional dentro de `servicios.input.port` y `.adapter` (`identidad`, `registro`, `aprobaciones`, `academico`, `categorias`, `kudos`, `interaccion`, `moderacion`, `auditoria`). El detalle de cada módulo está en el documento 10.

> Nota de nomenclatura: en la convención del curso la implementación del caso de uso vive en `servicios.input.adapter`. En la literatura hexagonal clásica a esa clase se la llama *servicio de aplicación*; es el mismo concepto.

## 6. Flujo detallado: Publicar Kudo

1. El **controlador REST** recibe `POST /api/kudos` (multipart si hay adjuntos), valida el formato (Bean Validation) y llama al puerto de entrada `PublicarKudoUseCase`.
2. El **caso de uso** (`PublicarKudoService`), dentro de una **transacción**:
   1. Verifica que autor y destinatario existen, están activos y son distintos; que la categoría existe y está activa.
   2. Crea el agregado `Kudo` (el dominio valida sus invariantes).
   3. Guarda adjuntos mediante `FileStoragePort` y su metadato.
   4. Persiste con `KudoRepositoryPort`.
   5. Registra `KUDO_PUBLICADO` con `AuditLogPort`.
   6. Publica el evento de dominio `KudoPublicado` con `DomainEventPublisherPort`.
3. Al **confirmarse la transacción**, el evento se entrega de forma **asíncrona** al `NotificacionesKudoListener`.
4. El listener (adaptador de entrada) invoca el puerto de entrada `NotificarKudoPublicadoUseCase`. Su implementación, `NotificarKudoPublicadoService`, dispara **tres envíos independientes**, cada uno con su puerto de salida: `EmailSenderPort`, `WhatsAppSenderPort`, `PushNotifierPort`.
5. Cada envío: registra la `notificacion` (estado y reintentos), aplica reintento/*circuit breaker* y audita el resultado (éxito, fallo u omitido).
6. El controlador responde `201 Created` **sin esperar** a las notificaciones.

> Consistencia: el Kudo es la fuente de verdad. Si un canal falla, queda `FALLIDA` en `notificacion` y puede reintentarse. Evolución: patrón *transactional outbox* con un bus de mensajes.

## 7. Patrones de diseño

No se evalúa la cantidad sino la **pertinencia, aplicación correcta y beneficio**.

| Patrón | Dónde | Por qué es pertinente | Beneficio |
|---|---|---|---|
| **Puertos y adaptadores (Hexagonal)** | Toda la arquitectura | Aísla el dominio de la tecnología. | Cambio de proveedor sin tocar el negocio; pruebas aisladas. |
| **Repository** | `KudoRepositoryPort` y adaptadores | Abstrae la persistencia. | Dominio ignorante de SQL; se prueba con dobles. |
| **Strategy** | Canales (`EmailSenderPort`, `WhatsAppSenderPort`, `PushNotifierPort`) | Tres formas intercambiables de "notificar". | Agregar un canal = agregar una clase. |
| **Observer / Evento de dominio** | `KudoPublicado` → listener | El publicador no debe conocer a los suscriptores. | Bajo acoplamiento; notificaciones asíncronas. |
| **Adapter** | Brevo, Twilio, Supabase | Adaptan SDK/HTTP externo a nuestro puerto. | Aísla al proveedor. |
| **Decorator** | `AuditedNotificationSender` y decoradores de resiliencia sobre los adaptadores | Añadir auditoría y reintentos sin modificar cada adaptador. | Responsabilidad única; reutilizable. |
| **Circuit Breaker + Retry** | Llamadas a Brevo y Twilio | Los terceros fallan. | Resiliencia; evita saturar un proveedor caído. |
| **Factory Method estático** | `Kudo.crear(...)` | Garantiza que un Kudo nace válido. | Invariantes en un solo lugar. |
| **DTO / Mapper** | Frontera REST | Evita exponer entidades. | API estable y segura. |
| **State** | Ciclo de vida de la cuenta (diseño) | El comportamiento depende del estado. | Evita condicionales dispersos. |

## 8. Principios SOLID

| Principio | Aplicación |
|---|---|
| **S** — Responsabilidad única | Un caso de uso por clase (`PublicarKudoService`); cada adaptador habla con un solo proveedor. |
| **O** — Abierto/cerrado | Nuevo canal o proveedor = nueva clase que implementa el puerto. |
| **L** — Sustitución de Liskov | Cualquier implementación de `EmailSenderPort` (Brevo, doble de prueba) es intercambiable sin alterar el caso de uso. |
| **I** — Segregación de interfaces | Puertos pequeños y específicos (uno por capacidad) en lugar de una interfaz gigante. |
| **D** — Inversión de dependencias | Los casos de uso dependen de puertos (abstracciones); la infraestructura los implementa. |

## 9. Clean Code

| Práctica | Criterio aplicado |
|---|---|
| Nombres expresivos | Intención clara: `PublicarKudoService`, `destinatarioEstaConectado()`; sin abreviaturas. |
| Métodos cohesivos | Un método hace una cosa; objetivo ≤ 20 líneas. |
| Responsabilidades claras | Cada clase tiene una razón para cambiar. |
| Bajo acoplamiento | Comunicación por puertos y eventos. |
| Alta cohesión | Cada paquete agrupa lo que cambia junto. |
| Sin comentarios que expliquen "qué" | El código se explica por sí mismo; se comenta el "por qué". |
| Errores explícitos | Excepciones de dominio con mensaje claro; sin `null` como señal. |
| Verificación | SonarQube (code smells, duplicación, complejidad) y ArchUnit en cada *pull request*. |

## 10. Para la sustentación

- **"¿Por qué hexagonal?"** Porque el negocio (publicar un Kudo) no debe depender de cómo se envía un correo o dónde se guarda. Los puertos son contratos; los adaptadores, enchufes.
- **"¿Dónde está Clean Architecture?"** En la regla de dependencia: `infraestructura → servicios → dominio`, comprobada por ArchUnit.
- **"Cámbieme Twilio por otro proveedor."** Se crea un adaptador nuevo que implemente `WhatsAppSenderPort` y se cambia la propiedad de configuración; el caso de uso no cambia.
