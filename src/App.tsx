import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RutaProtegida } from './components/RutaProtegida'
import { SesionProvider } from './components/SesionProvider'

// Carga perezosa por ruta (DRV-001: menos JavaScript en la primera carga en red móvil).
const LoginPage = lazy(() => import('./pages/LoginPage'))
const PublicarKudoPage = lazy(() => import('./pages/PublicarKudoPage'))
const AvisosPage = lazy(() => import('./pages/AvisosPage'))

export default function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="cargando">Cargando…</p>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RutaProtegida />}>
              <Route element={<Layout />}>
                <Route path="/publicar" element={<PublicarKudoPage />} />
                <Route path="/avisos" element={<AvisosPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/publicar" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SesionProvider>
  )
}
