import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RedefinirPassword() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [requisitos, setRequisitos] = useState({ len: false, maiuscula: false, minuscula: false, numero: false, simbolo: false })
  const navigate = useNavigate()

  useEffect(() => {
    setRequisitos({
      len: password.length >= 8,
      maiuscula: /[A-Z]/.test(password),
      minuscula: /[a-z]/.test(password),
      numero: /[0-9]/.test(password),
      simbolo: /[^A-Za-z0-9]/.test(password),
    })
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmar) { setErro('As passwords não coincidem.'); return }
    if (!Object.values(requisitos).every(Boolean)) { setErro('A password não cumpre todos os requisitos.'); return }
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErro('Erro ao redefinir a password. O link pode ter expirado.')
    } else {
      setSucesso(true)
      setTimeout(() => navigate('/'), 2000)
    }
    setLoading(false)
  }

  const req = [
    { ok: requisitos.len, label: 'Mínimo 8 caracteres' },
    { ok: requisitos.maiuscula, label: 'Uma letra maiúscula' },
    { ok: requisitos.minuscula, label: 'Uma letra minúscula' },
    { ok: requisitos.numero, label: 'Um número' },
    { ok: requisitos.simbolo, label: 'Um símbolo (!@#...)' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f7fee7' }}>
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md border" style={{ borderColor: '#d9f99d' }}>
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
            Nova password
          </h1>
          <p className="text-stone-500 text-sm mt-2">Define uma nova password segura para a tua conta.</p>
        </div>

        {sucesso ? (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <div className="rounded-2xl p-5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h2 className="font-bold text-stone-900 mb-2">Password redefinida!</h2>
              <p className="text-sm text-stone-600">A redirecionar para a página inicial...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">Nova password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              <div className="grid grid-cols-2 gap-1 mt-1">
                {req.map(r => (
                  <div key={r.label} className="flex items-center gap-1.5 text-xs">
                    <span style={{ color: r.ok ? '#65a30d' : '#d1d5db' }}>{r.ok ? '✓' : '○'}</span>
                    <span style={{ color: r.ok ? '#365314' : '#9ca3af' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">Confirmar password</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: confirmar && confirmar !== password ? '#fecaca' : '#d9f99d', background: '#f7fee7' }} />
              {confirmar && confirmar !== password && (
                <p className="text-xs text-red-500">As passwords não coincidem</p>
              )}
            </div>
            {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-60"
              style={{ background: '#65a30d' }}>
              {loading ? 'A guardar...' : 'Definir nova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
