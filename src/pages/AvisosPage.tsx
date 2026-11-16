import { useEffect, useState } from 'react'
import { ErrorApi, kudos as pedirKudos, type KudoResumen } from '../api/cliente'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { useSesion } from '../hooks/useSesion'

function hora(fecha: Date): string {
  return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function fechaYHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AvisosPage() {
  const { avisos } = useNotificaciones()
  const { token, cerrarSesion } = useSesion()

  // Historial de Kudos (null = todavía no ha llegado la primera respuesta)
  const [misKudos, setMisKudos] = useState<KudoResumen[] | null>(null)
  const [errorKudos, setErrorKudos] = useState<string | null>(null)
  const totalAvisos = avisos.length

  // Carga el historial al entrar y lo vuelve a pedir cuando llega un aviso nuevo.
  useEffect(() => {
    if (!token) return
    let vigente = true
    pedirKudos(token)
      .then((lista) => {
        if (!vigente) return
        setMisKudos(lista)
        setErrorKudos(null)
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (e instanceof ErrorApi && e.status === 401) return cerrarSesion()
        setErrorKudos(e instanceof ErrorApi ? e.message : 'No se pudieron cargar tus Kudos.')
      })
    return () => {
      vigente = false
    }
  }, [token, cerrarSesion, totalAvisos])

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

      <h2>Mis Kudos</h2>

      {errorKudos && (
        <div className="alerta alerta-error" role="alert">
          <p>{errorKudos}</p>
        </div>
      )}

      {misKudos === null ? (
        !errorKudos && <p className="ayuda">Cargando tus Kudos…</p>
      ) : misKudos.length === 0 ? (
        <p className="vacio">Aún no has enviado ni recibido Kudos.</p>
      ) : (
        <ol className="lista-avisos">
          {misKudos.map((kudo) => (
            <li key={kudo.id}>
              <span className="aviso-titulo">
                <strong>
                  {kudo.direccion === 'RECIBIDO' ? `De ${kudo.autor}` : `Para ${kudo.destinatario}`}
                </strong>
                <time dateTime={kudo.creadoEn}>{fechaYHora(kudo.creadoEn)}</time>
              </span>
              <span className="ayuda">{kudo.categoria}</span>
              <span>{kudo.texto}</span>
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
