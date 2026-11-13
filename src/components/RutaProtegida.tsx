import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '../hooks/useSesion'
import { NotificacionesProvider } from './NotificacionesProvider'

/**
 * Deja pasar solo con sesión; si no, lleva al login recordando a dónde se quería ir.
 * Con sesión abre el stream de notificaciones (se cierra al salir de aquí, es decir, al cerrar sesión).
 */
export function RutaProtegida() {
  const { token } = useSesion()
  const ubicacion = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  }
  return (
    <NotificacionesProvider>
      <Outlet />
    </NotificacionesProvider>
  )
}
