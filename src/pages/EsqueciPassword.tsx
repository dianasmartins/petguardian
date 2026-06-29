import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function EsqueciPassword() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/redefinir-password'
    })
    if (error) {
      setErro('Não foi possível enviar o email. Verifica o endereço e tenta novamente.')
    } else {
      setEnviado(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f7fee7' }}>
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md border" style={{ borderColor: '#d9f99d' }}>
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
            Recuperar password
          </h1>
          <p className="text-stone-500 text-sm mt-2">
            Introduz o teu email e enviamos um link para redefinires a password.
          </p>
        </div>

        {enviado ? (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <div className="rounded-2xl p-5 mb-6" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h2 className="font-bold text-stone-900 mb-2">Email enviado!</h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Enviámos um link para <strong>{email}</strong>.<br />
                Clica no link do email para redefinir a tua password.<br />
                Verifica também a pasta de spam.
              </p>
            </div>
            <Link to="/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white"
              style={{ background: '#65a30d' }}>
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">Email da conta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="o.teu@email.com"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: '#d9f99d', background: '#f7fee7' }}
              />
            </div>
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: '#65a30d' }}>
              {loading ? 'A enviar...' : 'Enviar link de recuperação'}
            </button>
            <Link to="/login" className="text-center text-sm hover:underline" style={{ color: '#65a30d' }}>
              ← Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
