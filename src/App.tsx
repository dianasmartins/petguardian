import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Registo from './pages/Registo'

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
        <Route path="/login" element={!sessao ? <Login /> : <Navigate to="/" />} />
        <Route path="/registo" element={!sessao ? <Registo /> : <Navigate to="/" />} />
        <Route path="/" element={sessao ? (
          <div className="p-8">
            <p className="text-xl mb-4">Bem-vinda, {sessao.user.email}!</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Sair
            </button>
          </div>
        ) : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}