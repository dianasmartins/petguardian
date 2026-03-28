import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Registo() {
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [telemovel, setTelemovel] = useState('')
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleRegisto = async () => {
        setErro('')

        if (!nome || !email || !password || !telemovel) {
            setErro('Preenche todos os campos.')
            return
        }

        if (password.length < 6) {
            setErro('A password deve ter pelo menos 6 caracteres.')
            return
        }

        setLoading(true)

        const { data, error } = await supabase.auth.signUp({ email, password })

        if (error) {
            setErro('Erro ao criar conta. Tenta novamente.')
            setLoading(false)
            return
        }

        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                nome,
                telemovel
            })
        }

        setSucesso(true)
        setLoading(false)
    }

    if (sucesso) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Conta criada!</h2>
                    <p className="text-gray-500 mb-4">Verifica o teu email para confirmar o registo.</p>
                    <a href="/login" className="text-blue-600 hover:underline">Ir para o Login</a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">PetGuardian</h1>
                <p className="text-center text-gray-500 mb-6">Cria a tua conta</p>

                {erro && <p className="text-red-500 text-sm mb-4 text-center">{erro}</p>}

                <input
                    type="text"
                    placeholder="Nome completo"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                    type="tel"
                    placeholder="Telemóvel"
                    value={telemovel}
                    onChange={e => {
                        const valor = e.target.value.replace(/\D/g, '')
                        if (valor.length <= 9) setTelemovel(valor)
                    }}
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
                    onClick={handleRegisto}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {loading ? 'A criar conta...' : 'Criar conta'}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    Já tens conta?{' '}
                    <a href="/login" className="text-blue-600 hover:underline">Entra aqui</a>
                </p>
            </div>
        </div>
    )
}