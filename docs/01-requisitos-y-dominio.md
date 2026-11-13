# 01 · Requisitos y dominio

## 1. Estructura organizacional

```text
Administrador del Sistema
        │
        ▼
      Rector
        │
        ▼
Coordinador Académico
        │
        ▼
Coordinador de Facultad (Decano)
        │
        ▼
Coordinador de Programa
        │
        ▼
Docentes y Estudiantes
```

## 2. Roles institucionales

| Código | Rol |
|---|---|
| `ADMIN` | Administrador del Sistema |
| `RECTOR` | Rector |
| `COORD_ACADEMICO` | Coordinador Académico |
| `COORD_FACULTAD` | Coordinador de Facultad (Decano) |
| `COORD_PROGRAMA` | Coordinador de Programa |
| `DOCENTE` | Docente |
| `ESTUDIANTE` | Estudiante |

## 3. Reglas de negocio

| ID | Regla | Cómo se garantiza |
|---|---|---|
| RN-01 | **Exclusividad:** cada persona tiene un único rol activo. | Índice único parcial sobre `asignacion_rol(persona_id) WHERE activo` + validación en el dominio. |
| RN-02 | **Unicidad:** un Rector activo y un Coordinador Académico activo en la universidad. | Índice único parcial por rol (`WHERE activo`). |
| RN-03 | Un Coordinador de Facultad activo por facultad. | Índice único parcial `(facultad_id) WHERE rol='COORD_FACULTAD' AND activo`. |
| RN-04 | Un Coordinador de Programa activo por programa. | Índice único parcial `(programa_id) WHERE rol='COORD_PROGRAMA' AND activo`. |
| RN-05 | Registro con correo institucional y celular. | Validación de formato y unicidad. |
| RN-06 | Cuenta activa solo con **solicitud aprobada + correo verificado + celular verificado**. | Máquina de estados de la cuenta (§5). |
| RN-07 | Un estudiante puede estudiar varios programas; debe poder consultarse cuáles. | Relación N:M `persona_programa` con vínculo `ESTUDIANTE`. |
| RN-08 | Un docente puede enseñar en varios programas; debe poder consultarse cuáles. | Misma relación con vínculo `DOCENTE`. |
| RN-09 | Un Coordinador de Programa conoce su programa; administra sus estudiantes y docentes. | `asignacion_rol.programa_id`. |
| RN-10 | Un Coordinador de Facultad conoce su facultad; administra los coordinadores de programa de su facultad. | `asignacion_rol.facultad_id`. |
| RN-11 | Solo `ADMIN`, `RECTOR` y `COORD_ACADEMICO` administran categorías. | Autorización por rol en el caso de uso. |
| RN-12 | Todo Kudo tiene autor, destinatario, categoría, fecha, contenido y adjuntos (opcionales). El contenido no tiene límite de longitud. | Columna `TEXT`; límite técnico solo de tamaño de petición (ver ADR-0007). |
| RN-13 | Réplicas sobre Kudos y sobre otras réplicas, sin límite de profundidad, cantidad ni longitud. | Auto-referencia `padre_id` + consulta recursiva. |
| RN-14 | Calificación de 1 a 5 estrellas sobre Kudos y réplicas; **una calificación activa por usuario y contenido**. | `UNIQUE (contenido_id, usuario_id)` y `CHECK (estrellas BETWEEN 1 AND 5)`. |
| RN-15 | Todos los usuarios pueden **reportar** contenido. | Caso de uso abierto a cualquier cuenta activa. |
| RN-16 | Solo `RECTOR` y `COORD_ACADEMICO` pueden **vetar**. | Autorización por rol. |

## 4. Matrices de aprobación y administración

### Quién aprueba cada solicitud de registro

| Solicitud de | Aprobador |
|---|---|
| Estudiante | Coordinador de Programa |
| Coordinador de Programa | Coordinador de Facultad |
| Coordinador de Facultad | Coordinador Académico |
| Coordinador Académico | Rector |
| Rector | Administrador |
| Administrador | Administrador |

> Docente: el enunciado no define su aprobador. Ver supuesto **S-02**.

### Quién administra a quién

| Rol | Administra |
|---|---|
| Administrador | Administradores y Rectores |
| Rector | Coordinadores Académicos |
| Coordinador Académico | Coordinadores de Facultad |
| Coordinador de Facultad | Coordinadores de Programa de su facultad |
| Coordinador de Programa | Estudiantes y docentes de su programa |

## 5. Ciclo de vida de la cuenta

```text
REGISTRADA ──(solicitud aprobada)──► APROBADA
     │                                   │
     │        correo verificado  +  celular verificado
     ▼                                   ▼
 RECHAZADA                             ACTIVA ◄──► SUSPENDIDA
```

La cuenta pasa a `ACTIVA` únicamente cuando se cumplen las tres condiciones simultáneamente (RN-06).

## 6. Categorías mínimas de Kudos

Rendimiento Académico · Mejor Investigador · Empatía · Comunicación Asertiva · Orientación al Logro · Trabajo en Equipo · Trabajo Bajo Presión · Visión Estratégica · Innovación · Liderazgo · Transformación Digital · Mentor Inspirador · Espíritu UCO · Servicio a la Comunidad · Compromiso Institucional.

## 7. Flujo obligatorio de la línea base: Publicar Kudo

| Paso | Qué ocurre | Evidencia de auditoría |
|---|---|---|
| 1 | El Kudo se almacena (transacción confirmada). | `KUDO_PUBLICADO` |
| 2 | El destinatario recibe un correo. | `NOTIFICACION_CORREO_ENVIADA` o `_FALLIDA` |
| 3 | El destinatario recibe un mensaje de WhatsApp. | `NOTIFICACION_WHATSAPP_ENVIADA` o `_FALLIDA` |
| 4 | Si el destinatario está conectado, recibe un push en tiempo real. | `NOTIFICACION_PUSH_ENVIADA` o `_OMITIDA_DESCONECTADO` |
| 5 | Todo el proceso queda auditado con un identificador de traza común. | Registros en `auditoria` con el mismo `trace_id` |

Los pasos 2 a 4 son **independientes entre sí** y **posteriores a la confirmación del Kudo**: la falla de un canal no deshace el Kudo ni bloquea a los demás (ver 05 §1).

## 8. Modelo conceptual (base del diagrama de dominio)

> Es la descripción en texto del diagrama de dominio (`diagramas/UCO-Kudos.drawio`, pág. 3). El diagrama sigue el estilo del ejemplo del curso: entidades con su identificador y multiplicidades, sin atributos; los atributos están en esta tabla.

| Entidad | Atributos principales | Relaciones |
|---|---|---|
| **Persona** | id, correo_institucional (único), celular, nombres, apellidos, hash_clave, estado_cuenta, correo_verificado, celular_verificado | 1—1..* AsignacionRol (histórico; una activa); 1—0..* PersonaPrograma, SolicitudRegistro, Verificacion, Contenido (autor), Kudo (destinatario), Calificacion, Reporte, Veto, Notificacion; 0..1—0..* Auditoria (actor) |
| **AsignacionRol** | id, persona_id, rol, facultad_id?, programa_id?, activo, desde, hasta | N—1 Persona; N—0..1 Facultad; N—0..1 Programa |
| **Facultad** | id, nombre | 1—0..* ProgramaAcademico |
| **ProgramaAcademico** | id, nombre, facultad_id | N—M Persona (vía PersonaPrograma) |
| **PersonaPrograma** | persona_id, programa_id, vinculo (`ESTUDIANTE`/`DOCENTE`) | |
| **SolicitudRegistro** | id, persona_id, rol_solicitado, aprobador_rol, estado, decidido_por, decidido_en | N—1 Persona |
| **Verificacion** | id, persona_id, tipo (`CORREO`/`CELULAR`), codigo_hash, expira_en, intentos, verificado_en | N—1 Persona |
| **Categoria** | id, nombre (único), activa | 1—0..* Kudo |
| **Contenido** *(supertipo)* | id, autor_id, texto (TEXT), creado_en, estado (`ACTIVO`/`VETADO`) | Especializado en Kudo y Réplica |
| **Kudo** | destinatario_id, categoria_id | 1—0..* Adjunto; 1—0..* Réplica |
| **Réplica** | padre_id (Kudo o Réplica), kudo_raiz_id | Auto-referencia sin límite de profundidad |
| **Adjunto** | id, kudo_id, nombre_original, tipo_mime, tamano_bytes, sha256, clave_almacenamiento, subido_por, subido_en | N—1 Kudo |
| **Calificacion** | id, contenido_id, usuario_id, estrellas (1–5), actualizado_en | Único (contenido, usuario) |
| **Reporte** | id, contenido_id, reportante_id, motivo, estado, creado_en | |
| **Veto** | id, contenido_id, vetado_por, motivo, fecha | |
| **Notificacion** | id, kudo_id, destinatario_id, canal, estado, intentos, ultimo_error, creado_en, enviada_en | |
| **Auditoria** | id, ocurrido_en, actor_id, accion, recurso_tipo, recurso_id, resultado, trace_id, detalle (JSON) | Solo inserción |

Subconjunto que implementa la línea base: Persona, AsignacionRol (rol activo), Categoria, Kudo/Contenido, Adjunto, Notificacion, Auditoria.

## 9. Supuestos (a confirmar con el docente)

| ID | Supuesto |
|---|---|
| S-01 | Cualquier usuario con cuenta activa puede publicar un Kudo a cualquier otro usuario activo (autor ≠ destinatario). |
| S-02 | El enunciado no define el aprobador de un Docente; se propone que lo apruebe el Coordinador de Programa del programa donde enseña. |
| S-03 | En la línea base los usuarios existen por datos semilla y llegan con correo y celular verificados; el flujo de registro y verificación solo se diseña. |
| S-04 | "Sin límite de longitud" se interpreta como ausencia de límite de negocio; existe un tope técnico de tamaño de petición HTTP configurable. |
| S-05 | La calificación activa puede modificarse (se reemplaza), pero nunca existen dos activas del mismo usuario sobre el mismo contenido. |
| S-06 | La solicitud de un Administrador la aprueba **otro** administrador; el primero se crea por datos semilla. |
| S-07 | Para reemplazar a un titular único (Rector, Coord. Académico, de Facultad o de Programa) quien lo administra lo da de baja y luego se aprueba al nuevo; el historial se conserva. |
| S-08 | El enunciado no dice quién gestiona facultades y programas; se asigna al Administrador del Sistema. |
| S-09 | Un usuario no califica su propio contenido. |
| S-10 | Quienes pueden vetar (Rector y Coordinador Académico) también pueden levantar un veto. |
