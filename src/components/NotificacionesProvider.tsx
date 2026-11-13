import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { urlApi } from '../api/cliente'
import { useSesion } from '../hooks/useSesion'
import {
  NotificacionesContext,
  type Aviso,
  type EstadoConexion,
  type Notificaciones,
} from '../hooks/useNotificaciones'

const EVENTO_KUDO = 'kudo-publicado'
const MAX_TOASTS = 3
const ESPERA_MAXIMA_MS = 30_000

/** Error que detiene los reintentos (token inválido o sin permiso). */
class ErrorFatal extends Error {
  readonly status: number
  constructor(status: number) {
    super(`El stream respondió ${status}`)
    this.status = status
  }
}

/** Lee el JSON del evento sin fallar si llega en otro formato. */
function leerDatos(datos: string): Pick<Aviso, 'kudoId' | 'traceId'> {
  try {
    const json = JSON.parse(datos) as Record<string, unknown>
    const kudoId = json.kudoId ?? json.id
    return {
      kudoId: typeof kudoId === 'string' ? kudoId : undefined,
      traceId: typeof json.traceId === 'string' ? json.traceId : undefined,
    }
  } catch {
    return {}
  }
}

/**
 * Abre GET /notificaciones/stream (SSE) con el token en la cabecera Authorization.
 * Se monta solo con sesión iniciada y se cierra al cerrar sesión (desmontaje o token nulo).
 */
export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const { token, cerrarSesion } = useSesion()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [toasts, setToasts] = useState<Aviso[]>([])
  const [estado, setEstado] = useState<EstadoConexion>('conectando')
  const siguienteId = useRef(1)

  const agregarAviso = useCallback((datos: string) => {
    const aviso: Aviso = { id: siguienteId.current++, recibidoEn: new Date(), ...leerDatos(datos) }
    setAvisos((actuales) => [aviso, ...actuales])
    setToasts((actuales) => [...actuales, aviso].slice(-MAX_TOASTS))
  }, [])

  const descartarToast = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    if (!token) return
    let controlador: AbortController | null = null
    let intentos = 0

    function conectar() {
      controlador?.abort() // cierra la conexión anterior, si la hay
      const actual = new AbortController()
      controlador = actual

      let url: string
      try {
        url = `${urlApi()}/notificaciones/stream`
      } catch {
        setEstado('desconectado')
        return
      }

      fetchEventSource(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: EventStreamContentType },
        signal: actual.signal,
        // La librería cerraría el stream al ocultar la pestaña; preferimos controlarlo
        // nosotros con visibilitychange (abajo) para que sea explícito.
        openWhenHidden: true,

        async onopen(respuesta) {
          const tipo = respuesta.headers.get('Content-Type') ?? ''
          if (respuesta.ok && tipo.includes(EventStreamContentType)) {
            intentos = 0
            setEstado('conectado')
            return
          }
          if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorFatal(respuesta.status)
          throw new Error(`El stream respondió ${respuesta.status}`) // se reintenta
        },

        onmessage(evento) {
          if (evento.event === EVENTO_KUDO) agregarAviso(evento.data)
        },

        onclose() {
          throw new Error('El servidor cerró el stream') // se reintenta
        },

        // Reconexión automática con espera creciente: 2 s, 4 s, 8 s… hasta 30 s.
        onerror(error) {
          if (error instanceof ErrorFatal) throw error // detiene los reintentos
          intentos++
          setEstado('reconectando')
          return Math.min(ESPERA_MAXIMA_MS, 1000 * 2 ** Math.min(intentos, 5))
        },
      }).catch((error: unknown) => {
        if (actual.signal.aborted) return
        if (error instanceof ErrorFatal && error.status === 401) cerrarSesion()
        else setEstado('desconectado')
      })
    }

    // En el celular el navegador suspende la conexión con la pantalla bloqueada o la app
    // en segundo plano: al volver se abre una conexión nueva.
    function alCambiarVisibilidad() {
      if (document.visibilityState !== 'visible') return
      intentos = 0
      setEstado('conectando')
      conectar()
    }

    function alRecuperarRed() {
      intentos = 0
      setEstado('conectando')
      conectar()
    }

    function alPerderRed() {
      controlador?.abort()
      setEstado('desconectado')
    }

    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    window.addEventListener('online', alRecuperarRed)
    window.addEventListener('offline', alPerderRed)
    conectar()

    // Al cerrar sesión (token nulo) o desmontar: se cierra el stream y se quitan los oyentes.
    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      window.removeEventListener('online', alRecuperarRed)
      window.removeEventListener('offline', alPerderRed)
      controlador?.abort()
    }
  }, [token, cerrarSesion, agregarAviso])

  const valor = useMemo<Notificaciones>(
    () => ({ avisos, toasts, estado, descartarToast }),
    [avisos, toasts, estado, descartarToast],
  )

  return <NotificacionesContext.Provider value={valor}>{children}</NotificacionesContext.Provider>
}
