import { createContext, useContext } from 'react'

export interface Sesion {
  /** JWT en memoria (y copia en sessionStorage para sobrevivir a recargas). null = sin sesión. */
  token: string | null
  iniciarSesion: (correo: string, clave: string) => Promise<void>
  cerrarSesion: () => void
}

export const SesionContext = createContext<Sesion | null>(null)

/** Acceso al estado de sesión desde cualquier componente dentro de <SesionProvider>. */
export function useSesion(): Sesion {
  const sesion = useContext(SesionContext)
  if (!sesion) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return sesion
}
