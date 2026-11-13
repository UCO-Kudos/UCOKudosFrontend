import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { login } from '../api/cliente'
import { SesionContext, type Sesion } from '../hooks/useSesion'

const CLAVE_STORAGE = 'uco-kudos.token'

// sessionStorage puede fallar (modo privado, almacenamiento bloqueado): por eso el try/catch.
function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_STORAGE)
  } catch {
    return null
  }
}

function guardarToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(CLAVE_STORAGE, token)
    else sessionStorage.removeItem(CLAVE_STORAGE)
  } catch {
    // Si no se puede guardar, la sesión sigue funcionando solo en memoria.
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(leerToken)

  const iniciarSesion = useCallback(async (correo: string, clave: string) => {
    const respuesta = await login(correo, clave)
    guardarToken(respuesta.token)
    setToken(respuesta.token)
  }, [])

  const cerrarSesion = useCallback(() => {
    guardarToken(null)
    setToken(null)
  }, [])

  const valor = useMemo<Sesion>(
    () => ({ token, iniciarSesion, cerrarSesion }),
    [token, iniciarSesion, cerrarSesion],
  )

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
