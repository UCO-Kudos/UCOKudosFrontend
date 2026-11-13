import { useNotificaciones } from '../hooks/useNotificaciones'

function hora(fecha: Date): string {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

export default function AvisosPage() {
  const { avisos } = useNotificaciones()

  return (
    <section className="pagina">
      <h1>Avisos</h1>
      <h2>Recibidos en esta sesión</h2>

      {avisos.length === 0 ? (
        <p className="vacio">
          Todavía no has recibido Kudos en esta sesión. Cuando alguien te reconozca, el aviso aparecerá
          aquí al instante.
        </p>
      ) : (
        <ol className="lista-avisos">
          {avisos.map((aviso) => (
            <li key={aviso.id}>
              <span className="aviso-titulo">
                <strong>¡Recibiste un Kudo!</strong>
                <time dateTime={aviso.recibidoEn.toISOString()}>{hora(aviso.recibidoEn)}</time>
              </span>
              {aviso.traceId && (
                <span className="ayuda">
                  Código de seguimiento: <code>{aviso.traceId}</code>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="nota">
        Los avisos en tiempo real llegan mientras la aplicación está abierta. Si está cerrada, te
        avisamos por correo y WhatsApp.
      </p>
    </section>
  )
}
