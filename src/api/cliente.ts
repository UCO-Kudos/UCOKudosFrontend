// Cliente HTTP del backend. Solo usa los endpoints del contrato
// (docs/11-modelo-de-datos-y-api.md): login, categorías, destinatarios y publicar Kudo.

export interface RespuestaLogin {
  token: string
  [campo: string]: unknown
}

export interface Categoria {
  id: string
  nombre: string
}

export interface Destinatario {
  id: string
  nombre: string
}

export interface KudoCreado {
  id: string
  destinatarioId: string
  categoriaId: string
  creadoEn: string
  adjuntos: number
  traceId: string
}

export interface NuevoKudo {
  destinatarioId: string
  categoriaId: string
  contenido: string
  adjuntos: File[]
}

/** Error con un mensaje apto para mostrar al usuario (el `detail` de problem+json). */
export class ErrorApi extends Error {
  readonly status: number
  readonly traceId?: string

  constructor(mensaje: string, status: number, traceId?: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
    this.traceId = traceId
  }
}

/** URL base leída de VITE_API_URL (se lee en cada llamada para poder cambiarla en pruebas). */
export function urlApi(): string {
  const base = import.meta.env.VITE_API_URL
  if (!base) {
    throw new ErrorApi('La aplicación no tiene configurada la variable VITE_API_URL.', 0)
  }
  return base.replace(/\/+$/, '')
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con otra existente.',
  413: 'Los archivos son demasiado grandes.',
  422: 'La solicitud incumple una regla de negocio.',
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
}

/** Convierte una respuesta con error (idealmente application/problem+json) en un ErrorApi legible. */
export async function aErrorApi(respuesta: Response): Promise<ErrorApi> {
  let detalle: string | undefined
  let traceId: string | undefined = respuesta.headers.get('X-Trace-Id') ?? undefined

  const tipo = respuesta.headers.get('Content-Type') ?? ''
  if (tipo.includes('json')) {
    try {
      const problema = (await respuesta.json()) as Record<string, unknown>
      const texto = problema.detail ?? problema.title
      if (typeof texto === 'string' && texto.trim()) detalle = texto
      const traza = problema.traceId ?? problema.trace_id
      if (typeof traza === 'string') traceId = traza
    } catch {
      // Cuerpo vacío o JSON inválido: se usa el mensaje genérico.
    }
  }

  const generico =
    respuesta.status >= 500
      ? 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.'
      : (MENSAJES_POR_ESTADO[respuesta.status] ?? `Error inesperado (${respuesta.status}).`)

  return new ErrorApi(detalle ?? generico, respuesta.status, traceId)
}

/** fetch con manejo uniforme de errores de red y de respuestas no exitosas. */
async function pedir<T>(ruta: string, opciones: RequestInit): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${urlApi()}${ruta}`, opciones)
  } catch (error) {
    if (error instanceof ErrorApi) throw error
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 0)
  }
  if (!respuesta.ok) throw await aErrorApi(respuesta)
  return (await respuesta.json()) as T
}

function conToken(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

/** POST /auth/login {correo, clave} → {token, ...} */
export function login(correo: string, clave: string): Promise<RespuestaLogin> {
  return pedir<RespuestaLogin>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ correo, clave }),
  })
}

/** GET /categorias (Bearer) */
export function categorias(token: string): Promise<Categoria[]> {
  return pedir<Categoria[]>('/categorias', { headers: conToken(token) })
}

/** GET /personas/destinatarios (Bearer) */
export function destinatarios(token: string): Promise<Destinatario[]> {
  return pedir<Destinatario[]>('/personas/destinatarios', { headers: conToken(token) })
}

/** POST /kudos multipart: destinatarioId, categoriaId, contenido, adjuntos[] → 201 */
export function publicarKudo(token: string, kudo: NuevoKudo): Promise<KudoCreado> {
  const formulario = new FormData()
  formulario.append('destinatarioId', kudo.destinatarioId)
  formulario.append('categoriaId', kudo.categoriaId)
  formulario.append('contenido', kudo.contenido)
  // La lista adjuntos[] se envía repitiendo la parte "adjuntos" (una por archivo).
  for (const archivo of kudo.adjuntos) formulario.append('adjuntos', archivo, archivo.name)

  // Sin Content-Type: el navegador lo pone con el boundary del multipart.
  return pedir<KudoCreado>('/kudos', { method: 'POST', headers: conToken(token), body: formulario })
}
