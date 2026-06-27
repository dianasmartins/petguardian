import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErro('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setErro('Email ou password incorretos. Tenta novamente.')
        } else {
            navigate('/')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">🐾</div>
                    <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Entrar na conta</h1>
                    <p className="text-stone-500 text-sm mt-1">Bem-vindo de volta ao PetGuardian</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-stone-500">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="o.teu@email.com"
                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-stone-500">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm"
                        />
                    </div>

                    {erro && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60 mt-2"
                    >
                        {loading ? 'A entrar...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-sm text-stone-500 mt-6">
                    Não tens conta?{' '}
                    <Link to="/registo" className="text-orange-600 font-semibold hover:underline">
                        Regista-te gratuitamente
                    </Link>
                </p>
            </div>
        </div>
    )
}
