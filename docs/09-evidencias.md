# 09 · Evidencias obligatorias

Cada evidencia debe ser **verificable** (captura con fecha/hora y URL visible, o enlace) y guardarse en `evidencias/`.

| # | Evidencia | Qué mostrar | Dónde obtenerla | Archivo | Estado |
|---|---|---|---|---|---|
| 1 | **CI** | Ejecución verde del workflow de CI (ambos repos) | GitHub → Actions | `evidencias/01-ci-*.png` | ☐ |
| 2 | **CD** | Ejecución verde del workflow de despliegue | GitHub → Actions | `evidencias/02-cd-*.png` | ☐ |
| 3 | **Sonar** | Panel con *quality gate* y métricas (ambos repos) | SonarQube Cloud | `evidencias/03-sonar-*.png` | ☐ |
| 4 | **Trivy** | Log/reporte de escaneo (código e imagen) | Job de Actions / Security | `evidencias/04-trivy-*.png` | ☐ |
| 5 | **Publicación** | URL pública funcionando (frontend y API) | Navegador | `evidencias/05-publicacion-*.png` | ☐ |
| 6 | **Despliegue** | Servicios desplegados y versión en ejecución | Panel de Render y Vercel | `evidencias/06-despliegue-*.png` | ☐ |
| 7 | **Correo** | Correo recibido por el destinatario | Bandeja de entrada | `evidencias/07-correo-*.png` | ☐ |
| 8 | **WhatsApp** | Mensaje recibido en el celular | Captura del chat | `evidencias/08-whatsapp-*.png` | ☐ |
| 9 | **Push** | Notificación en tiempo real en pantalla (grabación corta recomendada) | Aplicación | `evidencias/09-push-*.png/.mp4` | ☐ |
| 10 | **Auditoría** | Consulta por `trace_id` con todos los pasos | BD / endpoint de auditoría | `evidencias/10-auditoria-*.png` | ☐ |
| 11 | **Observabilidad** | `/actuator/health`, métricas, logs con `trace_id` | Aplicación / Render logs | `evidencias/11-observabilidad-*.png` | ☐ |
| 12 | **Pruebas** | Reporte de unitarias, integración, E2E y cobertura | Salida de `mvn verify` / Playwright / Sonar | `evidencias/12-pruebas-*.png` | ☐ |
| 13 | *(extra, DRV-001)* **Móvil/PWA** | App instalada en un celular real y Lighthouse móvil | Celular / DevTools | `evidencias/13-movil-*.png` | ☐ |

## Lista de verificación de la entrega (12:00 m. del 13-nov-2026)

☐ Documentación entregada · ☐ Front-End entregado · ☐ Back-End entregado · ☐ Manual entregado · ☐ Evidencias entregadas · ☐ Aplicación desplegada · ☐ URL pública funcional · ☐ Sonar ejecutado · ☐ Trivy ejecutado · ☐ CI funcional · ☐ CD funcional · ☐ Flujo Publicar Kudo implementado · ☐ Correo funcionando · ☐ WhatsApp funcionando · ☐ Push funcionando · ☐ **Sustentación realizada**

## Condiciones previas para las evidencias de notificación

- **WhatsApp:** el celular destinatario debe haber enviado el mensaje *join* al número del sandbox de Twilio **el mismo día** (la sesión vence a los 3 días y los mensajes libres solo se permiten dentro de la ventana de 24 h). Si el docente quiere recibir el WhatsApp en su celular, debe unirse al sandbox antes de la prueba.
- **Correo:** el remitente debe estar verificado en Brevo.
- **Push:** el destinatario debe tener la aplicación abierta y la sesión iniciada en otro navegador o dispositivo.
