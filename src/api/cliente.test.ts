import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, login } from './cliente'

function respuestaJson(cuerpo: unknown, status: number, tipo = 'application/json') {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': tipo } })
}

describe('cliente de API · login', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://api.prueba/api/')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('envía correo y clave a POST /auth/login y devuelve el token', async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(respuestaJson({ token: 'jwt-123' }, 200))
    vi.stubGlobal('fetch', fetchSimulado)

    const respuesta = await login('autor@uco-kudos.local', 'Kudos2026*')

    expect(respuesta.token).toBe('jwt-123')
    const [url, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.prueba/api/auth/login')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual({
      correo: 'autor@uco-kudos.local',
      clave: 'Kudos2026*',
    })
  })

  it('convierte un 401 problem+json en ErrorApi con el detail y el traceId', async () => {
    const problema = { title: 'Unauthorized', status: 401, detail: 'Credenciales inválidas', traceId: 't-1' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(problema, 401, 'application/problem+json')))

    const error = await login('autor@uco-kudos.local', 'mala').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ErrorApi)
    expect(error).toMatchObject({ message: 'Credenciales inválidas', status: 401, traceId: 't-1' })
  })

  it('informa un error de conexión legible si el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(login('a@uco.edu.co', 'x')).rejects.toThrow('No se pudo conectar con el servidor')
  })
})
