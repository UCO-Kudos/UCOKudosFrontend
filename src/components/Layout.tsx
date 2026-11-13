import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useNotificaciones, type EstadoConexion } from '../hooks/useNotificaciones'
import { useSesion } from '../hooks/useSesion'
import { Toasts } from './Toasts'

const TEXTO_ESTADO: Record<EstadoConexion, string> = {
  conectando: 'Conectando…',
  conectado: 'Avisos en vivo',
  reconectando: 'Reconectando…',
  desconectado: 'Avisos sin conexión',
}

/** Marco de las pantallas con sesión: encabezado, contenido, avisos y navegación inferior. */
export function Layout() {
  const { cerrarSesion } = useSesion()
  const { avisos, estado } = useNotificaciones()
  const navegar = useNavigate()

  function salir() {
    cerrarSesion() // el stream SSE se cierra al desmontarse la ruta protegida
    navegar('/login', { replace: true })
  }

  return (
    <div className="app">
      <header className="encabezado">
        <div className="encabezado-titulo">
          <span className="encabezado-marca">UCO Kudos</span>
          <span className={`estado-conexion estado-${estado}`}>{TEXTO_ESTADO[estado]}</span>
        </div>
        <button type="button" className="boton-secundario boton-compacto" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <Toasts />

      <main className="contenido">
        <Suspense fallback={<p className="cargando">Cargando…</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Navegación inferior: al alcance del pulgar en el celular */}
      <nav className="navegacion" aria-label="Secciones">
        <NavLink to="/publicar">Publicar</NavLink>
        <NavLink to="/avisos">
          Avisos
          {avisos.length > 0 && (
            <span className="insignia">
              {avisos.length}
              <span className="solo-lector"> recibidos</span>
            </span>
          )}
        </NavLink>
      </nav>
    </div>
  )
}
