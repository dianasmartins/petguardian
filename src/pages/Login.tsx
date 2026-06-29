import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingGoogle, setLoadingGoogle] = useState(false)
    const [loadingApple, setLoadingApple] = useState(false)
    const [erro, setErro] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErro('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setErro('Email ou password incorretos. Tenta novamente.')
        else navigate('/')
        setLoading(false)
    }

    const handleGoogle = async () => {
        setLoadingGoogle(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        })
        if (error) setErro('Erro ao entrar com Google.')
        setLoadingGoogle(false)
    }

    const handleApple = async () => {
        setLoadingApple(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo: window.location.origin }
        })
        if (error) setErro('Erro ao entrar com Apple.')
        setLoadingApple(false)
    }

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md border border-green-100">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">🐾</div>
                    <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Entrar na conta</h1>
                    <p className="text-stone-500 text-sm mt-1">Bem-vindo de volta ao PetGuardian</p>
                </div>

                {/* Social login */}
                <div className="flex flex-col gap-3 mb-6">
                    <button onClick={handleGoogle} disabled={loadingGoogle}
                        className="w-full flex items-center justify-center gap-3 border-2 border-stone-200 py-3 rounded-xl font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors disabled:opacity-60 text-sm">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {loadingGoogle ? 'A entrar...' : 'Entrar com Google'}
                    </button>

                    <button onClick={handleApple} disabled={loadingApple}
                        className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white py-3 rounded-xl font-semibold hover:bg-stone-800 transition-colors disabled:opacity-60 text-sm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        {loadingApple ? 'A entrar...' : 'Entrar com Apple'}
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-stone-200"></div>
                    <span className="text-xs text-stone-400 font-medium">ou com email</span>
                    <div className="flex-1 h-px bg-stone-200"></div>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-stone-500">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="o.teu@email.com"
                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-stone-500">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
                    </div>
                    {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}
                    <button type="submit" disabled={loading}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 mt-1">
                        {loading ? 'A entrar...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-sm text-stone-500 mt-6">
                    Não tens conta?{' '}
                    <Link to="/registo" className="text-green-700 font-semibold hover:underline">Regista-te gratuitamente</Link>
                </p>

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs text-center">
                    ⚠️ Login com Google/Apple requer configuração OAuth no Supabase Dashboard → Authentication → Providers
                </div>
            </div>
        </div>
    )
}