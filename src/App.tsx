import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Registo from './pages/Registo'
import Mapa from './pages/Mapa'
import RegistarAnimal from './pages/RegistarAnimal'
import Home from './pages/Home'
import Animais from './pages/Animais'
import IdentificarAnimal from './pages/IdentificarAnimal'

export default function App() {
  const [sessao, setSessao] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      A carregar...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={!sessao ? <Login /> : <Navigate to="/mapa" />} />
        <Route path="/registo" element={!sessao ? <Registo /> : <Navigate to="/mapa" />} />
        <Route path="/mapa" element={sessao ? <Mapa /> : <Navigate to="/login" />} />
        <Route path="/registar-animal" element={sessao ? <RegistarAnimal /> : <Navigate to="/login" />} />
        <Route path="/animais" element={<Animais />} />
        <Route path="/identificar" element={<IdentificarAnimal />} />
      </Routes>
    </BrowserRouter>
  )
}