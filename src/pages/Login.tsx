import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [erro, setErro] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        setErro('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setErro('Email ou password incorretos.')
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">PetGuardian</h1>
                <p className="text-center text-gray-500 mb-6">Entra na tua conta</p>

                {erro && <p className="text-red-500 text-sm mb-4 text-center">{erro}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Não tens conta?{' '}
                    <a href="/registo" className="text-blue-600 hover:underline">Regista-te</a>
                </p>
            </div>
        </div>
    )
}