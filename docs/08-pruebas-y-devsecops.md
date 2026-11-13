# 08 · Pirámide de pruebas y DevSecOps

## 1. Pirámide de pruebas

```text
           ▲
          /E2E\          pocas · lentas · escenarios completos
         /─────\
        /Integr.\        algunas · componentes reales (BD)
       /─────────\
      / Unitarias \      muchas · rápidas · componentes aislados
     /─────────────\
```

| Nivel | Qué prueba | Herramientas | Ejemplos de la línea base |
|---|---|---|---|
| **Unitarias** | Dominio y casos de uso, con dobles de los puertos (sin Spring, sin BD, sin red). | JUnit 5, Mockito, AssertJ; Vitest + Testing Library (frontend) | `Kudo.crear` rechaza autor = destinatario; `PublicarKudoService` invoca los tres canales y la auditoría; un canal que falla no impide a los demás. |
| **Integración** | Adaptadores reales contra dependencias reales o simuladas. | Spring Boot Test, **Testcontainers (PostgreSQL)**, WireMock (Brevo/Twilio/Supabase) | `KudoJdbcRepository` guarda y consulta; índices únicos parciales; `BrevoEmailSenderAdapter` arma la petición correcta y maneja el error 5xx; adjuntos con tipo no permitido. |
| **End-to-End** | Flujo completo desde la API/UI hasta la BD, con proveedores simulados. | RestAssured/MockMvc (API completa); **Playwright** (UI en viewport móvil) | Login → publicar Kudo con adjunto → el destinatario ve el Kudo → existen filas de `auditoria` y `notificacion`. |
| **Arquitectura** | Reglas AR-01..AR-08. | **ArchUnit** | Falla el build si `dominio` importa Spring. |
| **Seguridad** | Autorización y entradas inválidas. | Pruebas de integración/E2E | EC-01, EC-02, EC-09. |

Cobertura medida con **JaCoCo** y reportada a SonarQube. Meta: ≥ 80 % en dominio y casos de uso.

## 2. Integración Continua (CI)

**Disparador:** *push* y *pull request* a `main` y ramas de trabajo, en ambos repositorios.

| Paso (backend) | Herramienta |
|---|---|
| 1. Obtener código | `actions/checkout` |
| 2. Preparar Java | `actions/setup-java` (con caché de Maven) |
| 3. Compilar y probar (unitarias, integración con Testcontainers, ArchUnit) | `mvn verify` |
| 4. Cobertura | JaCoCo |
| 5. **Análisis estático** | SonarQube Cloud (`sonarqube-scan-action`) con *quality gate* |
| 6. **Escaneo de vulnerabilidades del código y dependencias** | Trivy (`fs`: vulnerabilidades, secretos, configuración) |
| 7. Construir imagen Docker | `docker build` |
| 8. **Escaneo de la imagen** | Trivy (`image`) |
| 9. Publicar reportes (SARIF/artefactos) | `upload-sarif`, `upload-artifact` |

| Paso (frontend) | Herramienta |
|---|---|
| Instalar y compilar | `npm ci`, `npm run build` |
| Pruebas | Vitest; Playwright (E2E) |
| Calidad y seguridad | SonarQube Cloud + Trivy (`fs`) |

**Políticas:** el pipeline **falla** si fallan las pruebas, el *quality gate* de Sonar o Trivy encuentra severidad `HIGH`/`CRITICAL` corregible (umbral configurable y documentado).

## 3. Despliegue Continuo (CD)

**Disparador:** el CI de `main` termina en verde.

| Componente | Mecanismo |
|---|---|
| **Backend → Render** | El pipeline construye la imagen versionada con el SHA del *commit* y dispara el despliegue en Render mediante su *deploy hook* (guardado como GitHub Secret). Render ejecuta las migraciones Flyway al arrancar. |
| **Frontend → Vercel** | El pipeline compila y despliega a producción con la CLI de Vercel usando un token (GitHub Secret). |
| **Verificación post-despliegue** | Prueba de humo: `GET /actuator/health` y carga de la página inicial; si falla, el pipeline lo reporta. |
| **Reversión** | Redesplegar el SHA anterior (imagen inmutable). |

## 4. Otros agentes de los repositorios

| Agente | Función |
|---|---|
| **Dependabot** | Propone actualizaciones de dependencias vulnerables o desactualizadas. |
| **Escaneo de secretos de GitHub** | Detecta claves subidas por error. |
| **Protección de rama `main`** | Requiere CI en verde y *pull request* para integrar. |
| **CodeQL** (opcional) | Análisis semántico de seguridad adicional. |

## 5. SonarQube Cloud y Trivy: qué se evidencia

| Herramienta | Evidencia |
|---|---|
| **SonarQube Cloud** | Panel del proyecto con *quality gate*, cobertura, bugs, vulnerabilidades, *code smells*, duplicación y *security hotspots*, para ambos repositorios. |
| **Trivy** | Log del job y reporte con vulnerabilidades por severidad (código/dependencias e imagen), y el escaneo de secretos en verde. |

Los repositorios serán **públicos**: es lo que habilita el plan gratuito de SonarQube Cloud.

## 6. Publicación

| Pieza | Plataforma | Resultado |
|---|---|---|
| Frontend | Vercel | URL pública HTTPS |
| Backend | Render (Docker) | URL pública HTTPS del API |
| Base de datos y archivos | Supabase | Servicios gestionados |

Precauciones documentadas: el servicio gratuito de Render se suspende por inactividad (se despierta con una petición a `/actuator/health` antes de sustentar y se deja un monitor de "ping" opcional); el proyecto gratuito de Supabase puede pausarse por inactividad, por lo que se verifica el mismo día.

El docente podrá acceder con la URL pública y con usuarios de demostración (ver Manual de puesta a punto) para validar el flujo de publicación de Kudos.

## 7. Para la sustentación

- **"¿Qué pasa cuando hago un push?"** CI compila, ejecuta las pruebas, Sonar evalúa la calidad, Trivy busca vulnerabilidades y construye la imagen; si todo pasa, CD despliega en Render y Vercel y hace una prueba de humo.
- **"¿Qué hace Trivy que no haga Sonar?"** Sonar analiza la calidad y seguridad del *código fuente*; Trivy busca *vulnerabilidades conocidas en dependencias e imagen*, secretos y configuraciones inseguras.
