import { createContext, useContext } from 'react'

/** Un aviso recibido por SSE (evento `kudo-publicado`). */
export interface Aviso {
  id: number
  recibidoEn: Date
  kudoId?: string
  traceId?: string
}

export type EstadoConexion = 'conectando' | 'conectado' | 'reconectando' | 'desconectado'

export interface Notificaciones {
  /** Avisos recibidos en esta sesión, el más reciente primero. */
  avisos: Aviso[]
  /** Avisos que se están mostrando como toast. */
  toasts: Aviso[]
  estado: EstadoConexion
  descartarToast: (id: number) => void
}

export const NotificacionesContext = createContext<Notificaciones | null>(null)

export function useNotificaciones(): Notificaciones {
  const valor = useContext(NotificacionesContext)
  if (!valor) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>')
  return valor
}
