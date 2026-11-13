import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  categorias as pedirCategorias,
  destinatarios as pedirDestinatarios,
  ErrorApi,
  publicarKudo,
  type Categoria,
  type Destinatario,
  type KudoCreado,
} from '../api/cliente'
import { useSesion } from '../hooks/useSesion'

// Reglas de adjuntos (las mismas que valida el backend): PDF, PNG o JPG de hasta 5 MB cada uno.
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg']
const EXTENSIONES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg']
const TAMANO_MAXIMO = 5 * 1024 * 1024

function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Devuelve por qué se rechaza un archivo, o null si es válido. */
function motivoRechazo(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase()
  const tipoValido =
    TIPOS_PERMITIDOS.includes(archivo.type) ||
    (archivo.type === '' && EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext)))
  if (!tipoValido) return 'formato no permitido (solo PDF, PNG o JPG)'
  if (archivo.size === 0) return 'el archivo está vacío'
  if (archivo.size > TAMANO_MAXIMO) return `pesa ${tamanoLegible(archivo.size)} y el máximo es 5 MB`
  return null
}

function mismoArchivo(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
}

type EstadoCatalogos = 'cargando' | 'listo' | 'error'

export default function PublicarKudoPage() {
  const { token, cerrarSesion } = useSesion()

  // Catálogos del backend
  const [listaDestinatarios, setListaDestinatarios] = useState<Destinatario[]>([])
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>([])
  const [estadoCatalogos, setEstadoCatalogos] = useState<EstadoCatalogos>('cargando')
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null)
  const [recargar, setRecargar] = useState(0)

  // Formulario
  const [destinatarioId, setDestinatarioId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [contenido, setContenido] = useState('')
  const [adjuntos, setAdjuntos] = useState<File[]>([])
  const [rechazados, setRechazados] = useState<string[]>([])
  const [validar, setValidar] = useState(false)

  // Envío
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<{ mensaje: string; traceId?: string } | null>(null)
  const [publicado, setPublicado] = useState<KudoCreado | null>(null)
  const refResultado = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    let vigente = true
    Promise.all([pedirDestinatarios(token), pedirCategorias(token)])
      .then(([personas, cats]) => {
        if (!vigente) return
        setListaDestinatarios(personas)
        setListaCategorias(cats)
        setEstadoCatalogos('listo')
      })
      .catch((e: unknown) => {
        if (!vigente) return
        if (e instanceof ErrorApi && e.status === 401) return cerrarSesion()
        setErrorCatalogos(e instanceof Error ? e.message : 'No se pudieron cargar los datos.')
        setEstadoCatalogos('error')
      })
    return () => {
      vigente = false
    }
  }, [token, cerrarSesion, recargar])

  // Lleva el foco (y la vista) al mensaje de éxito o error tras enviar.
  useEffect(() => {
    if (publicado || error) refResultado.current?.focus()
  }, [publicado, error])

  function agregarArchivos(evento: ChangeEvent<HTMLInputElement>) {
    const elegidos = Array.from(evento.target.files ?? [])
    evento.target.value = '' // permite volver a elegir el mismo archivo después de quitarlo
    const nuevosRechazos: string[] = []
    const validos: File[] = []
    for (const archivo of elegidos) {
      const motivo = motivoRechazo(archivo)
      if (motivo) nuevosRechazos.push(`${archivo.name}: ${motivo}.`)
      else validos.push(archivo)
    }
    setRechazados(nuevosRechazos)
    setAdjuntos((actuales) => [
      ...actuales,
      ...validos.filter((nuevo) => !actuales.some((a) => mismoArchivo(a, nuevo))),
    ])
  }

  function quitarArchivo(indice: number) {
    setAdjuntos((actuales) => actuales.filter((_, i) => i !== indice))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!token) return
    setValidar(true)
    setPublicado(null)

    if (!destinatarioId || !categoriaId || !contenido.trim()) {
      setError({ mensaje: 'Elige el destinatario, la categoría y escribe el mensaje del Kudo.' })
      return
    }

    setError(null)
    setEnviando(true)
    try {
      const kudo = await publicarKudo(token, {
        destinatarioId,
        categoriaId,
        contenido: contenido.trim(),
        adjuntos,
      })
      setPublicado(kudo)
      setDestinatarioId('')
      setCategoriaId('')
      setContenido('')
      setAdjuntos([])
      setRechazados([])
      setValidar(false)
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 401) return cerrarSesion()
      // 400/422 y demás: se muestra el `detail` que envía el backend.
      setError(
        e instanceof ErrorApi
          ? { mensaje: e.message, traceId: e.traceId }
          : { mensaje: 'No se pudo publicar el Kudo.' },
      )
    } finally {
      setEnviando(false)
    }
  }

  function reintentarCarga() {
    setEstadoCatalogos('cargando')
    setRecargar((n) => n + 1)
  }

  if (estadoCatalogos === 'cargando') {
    return <p className="cargando">Cargando destinatarios y categorías…</p>
  }

  if (estadoCatalogos === 'error') {
    return (
      <section className="pagina">
        <h1>Publicar Kudo</h1>
        <div className="alerta alerta-error" role="alert">
          <p>{errorCatalogos}</p>
        </div>
        <button type="button" className="boton-primario" onClick={reintentarCarga}>
          Reintentar
        </button>
      </section>
    )
  }

  const faltaDestinatario = validar && !destinatarioId
  const faltaCategoria = validar && !categoriaId
  const faltaContenido = validar && !contenido.trim()

  return (
    <section className="pagina">
      <h1>Publicar Kudo</h1>

      <div ref={refResultado} tabIndex={-1} className="resultado">
        {publicado && (
          <div className="alerta alerta-exito" role="status">
            <p>
              <strong>¡Kudo publicado!</strong> Le avisaremos al destinatario.
            </p>
            <p>
              Código de seguimiento: <code>{publicado.traceId}</code>
            </p>
          </div>
        )}
        {error && (
          <div className="alerta alerta-error" role="alert">
            <p>{error.mensaje}</p>
            {error.traceId && (
              <p>
                Código de seguimiento: <code>{error.traceId}</code>
              </p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={enviar} noValidate aria-busy={enviando}>
        <div className="campo">
          <label htmlFor="destinatario">Destinatario</label>
          <select
            id="destinatario"
            value={destinatarioId}
            onChange={(e) => setDestinatarioId(e.target.value)}
            required
            aria-invalid={faltaDestinatario}
          >
            <option value="">Elige una persona</option>
            {listaDestinatarios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            required
            aria-invalid={faltaCategoria}
          >
            <option value="">Elige una categoría</option>
            {listaCategorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="contenido">Mensaje</label>
          <textarea
            id="contenido"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={6}
            autoCapitalize="sentences"
            placeholder="Cuéntale por qué merece este reconocimiento"
            required
            aria-invalid={faltaContenido}
          />
        </div>

        <div className="campo">
          <span className="etiqueta" id="etiqueta-adjuntos">
            Adjuntos (opcional)
          </span>
          <p className="ayuda" id="ayuda-adjuntos">
            Fotos o PDF (PNG, JPG o PDF), máximo 5 MB cada uno.
          </p>
          <div className="selector-archivos">
            <input
              id="adjuntos"
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="solo-lector"
              onChange={agregarArchivos}
              aria-labelledby="etiqueta-adjuntos boton-adjuntos"
              aria-describedby="ayuda-adjuntos"
            />
            <label htmlFor="adjuntos" id="boton-adjuntos" className="boton boton-secundario">
              Agregar foto o PDF
            </label>
          </div>

          {rechazados.length > 0 && (
            <div className="alerta alerta-error" role="alert">
              <p>No se agregaron estos archivos:</p>
              <ul>
                {rechazados.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {adjuntos.length > 0 && (
            <ul className="lista-archivos" aria-label="Archivos adjuntos">
              {adjuntos.map((archivo, i) => (
                <li key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}>
                  <span className="archivo-datos">
                    <span className="archivo-nombre">{archivo.name}</span>
                    <span className="archivo-tamano">{tamanoLegible(archivo.size)}</span>
                  </span>
                  <button
                    type="button"
                    className="boton-texto"
                    onClick={() => quitarArchivo(i)}
                    aria-label={`Quitar ${archivo.name}`}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Botón principal fijo abajo, al alcance del pulgar */}
        <div className="acciones-fijas">
          <button type="submit" className="boton-primario" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar Kudo'}
          </button>
        </div>
      </form>
    </section>
  )
}
