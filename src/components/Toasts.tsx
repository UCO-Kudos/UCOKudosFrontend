import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNotificaciones, type Aviso } from '../hooks/useNotificaciones'

const DURACION_MS = 6000

function Toast({ aviso, descartar }: { aviso: Aviso; descartar: (id: number) => void }) {
  // Se cierra solo a los pocos segundos.
  useEffect(() => {
    const temporizador = setTimeout(() => descartar(aviso.id), DURACION_MS)
    return () => clearTimeout(temporizador)
  }, [aviso.id, descartar])

  return (
    <div className="toast">
      <div className="toast-texto">
        <strong>¡Recibiste un Kudo!</strong>
        <span>
          Alguien te reconoció. <Link to="/avisos">Ver avisos</Link>
        </span>
      </div>
      <button
        type="button"
        className="toast-cerrar"
        onClick={() => descartar(aviso.id)}
        aria-label="Cerrar aviso"
      >
        ✕
      </button>
    </div>
  )
}

/** Región de avisos emergentes; aria-live hace que el lector de pantalla los anuncie. */
export function Toasts() {
  const { toasts, descartarToast } = useNotificaciones()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((aviso) => (
        <Toast key={aviso.id} aviso={aviso} descartar={descartarToast} />
      ))}
    </div>
  )
}
