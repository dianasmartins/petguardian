import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Navbar from './components/Navbar'
import CookieBanner from './components/CookieBanner'
import { ToastProvider } from './components/Toast'
import Home from './pages/Home'
import Login from './pages/Login'
import Registo from './pages/Registo'
import Mapa from './pages/Mapa'
import Animais from './pages/Animais'
import RegistarAnimal from './pages/RegistarAnimal'
import Ocorrencias from './pages/Ocorrencias'
import IdentificarAnimal from './pages/IdentificarAnimal'
import Perfil from './pages/Perfil'
import Definicoes from './pages/Definicoes'
import SubmeterAvistamento from './pages/SubmeterAvistamento'
import Admin from './pages/Admin'
import AnimalPerfil from './pages/AnimalPerfil'
import Estatisticas from './pages/Estatisticas'
import ComoFunciona from './pages/ComoFunciona'
import Mensagens from './pages/Mensagens'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-green-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🐾</div>
        <div className="text-green-700 font-semibold">A carregar...</div>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <BrowserRouter>
        <Navbar session={session} />
        <CookieBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/animais" element={<Animais />} />
          <Route path="/animais/:id" element={<AnimalPerfil />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/identificar" element={<IdentificarAnimal />} />
          <Route path="/estatisticas" element={<Estatisticas />} />
          <Route path="/como-funciona" element={<ComoFunciona />} />
          <Route path="/avistamento/:animalId" element={<SubmeterAvistamento />} />
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/registo" element={!session ? <Registo /> : <Navigate to="/" />} />
          <Route path="/registar-animal" element={session ? <RegistarAnimal /> : <Navigate to="/login" />} />
          <Route path="/ocorrencias" element={session ? <Ocorrencias /> : <Navigate to="/login" />} />
          <Route path="/perfil" element={session ? <Perfil /> : <Navigate to="/login" />} />
          <Route path="/definicoes" element={session ? <Definicoes /> : <Navigate to="/login" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/mensagens" element={session ? <Mensagens /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
