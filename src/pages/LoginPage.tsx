import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ErrorApi } from '../api/cliente'
import { useSesion } from '../hooks/useSesion'

export default function LoginPage() {
  const { token, iniciarSesion } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/publicar'

  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (token) return <Navigate to={destino} replace />

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!correo.trim() || !clave) {
      setError('Escribe tu correo y tu clave.')
      return
    }
    setError(null)
    setCargando(true)
    try {
      await iniciarSesion(correo.trim(), clave)
      navegar(destino, { replace: true })
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.status === 401
          ? 'Correo o clave incorrectos.'
          : e instanceof Error
            ? e.message
            : 'No se pudo iniciar sesión.',
      )
      setCargando(false)
    }
  }

  return (
    <main className="pantalla-login">
      <div className="login-marca">
        <img src="/icons/icon-192.png" alt="" width="64" height="64" />
        <h1>UCO Kudos</h1>
        <p>Reconoce a quienes hacen la diferencia en la UCO.</p>
      </div>

      <form className="login-formulario" onSubmit={enviar} noValidate aria-busy={cargando}>
        <h2>Iniciar sesión</h2>

        {error && (
          <div className="alerta alerta-error" role="alert">
            {error}
          </div>
        )}

        <div className="campo">
          <label htmlFor="correo">Correo institucional</label>
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="username"
            inputMode="email"
            enterKeyHint="next"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            aria-invalid={error !== null && !correo.trim()}
          />
        </div>

        <div className="campo">
          <label htmlFor="clave">Clave</label>
          <div className="campo-con-boton">
            <input
              id="clave"
              name="clave"
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="go"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              aria-invalid={error !== null && !clave}
            />
            <button
              type="button"
              className="boton-secundario"
              onClick={() => setVerClave((v) => !v)}
              aria-pressed={verClave}
              aria-controls="clave"
            >
              {verClave ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <button type="submit" className="boton-primario" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
