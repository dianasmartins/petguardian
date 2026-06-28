import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Perfil() {
    const [nome, setNome] = useState('')
    const [telemovel, setTelemovel] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [erro, setErro] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const fetchPerfil = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { navigate('/login'); return }

            setEmail(user.email || '')

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setNome(data.nome || '')
                setTelemovel(data.telemovel || '')
            }
            setLoading(false)
        }
        fetchPerfil()
    }, [])

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        setGuardando(true)
        setErro('')
        setSucesso(false)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (telemovel && !/^\d{9}$/.test(telemovel)) {
            setErro('O telemóvel deve ter exatamente 9 dígitos.')
            setGuardando(false)
            return
        }

        const { error } = await supabase
            .from('profiles')
            .update({ nome, telemovel: telemovel || null })
            .eq('id', user.id)

        if (error) {
            setErro('Erro ao guardar. Tenta novamente.')
        } else {
            setSucesso(true)
            setTimeout(() => setSucesso(false), 3000)
        }
        setGuardando(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>
    )

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-2xl mx-auto px-4 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                        Editar perfil
                    </h1>
                    <p className="text-stone-500 mt-1">Atualiza os teus dados pessoais</p>
                </div>

                {/* Avatar */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
                        </div>
                        <div>
                            <div className="font-bold text-stone-900 text-lg">{nome || 'Utilizador'}</div>
                            <div className="text-stone-400 text-sm">{email}</div>
                            <div className="text-xs text-stone-300 mt-1">Membro do PetGuardian</div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                    <h2 className="font-bold text-stone-900 mb-5">Informações pessoais</h2>

                    <form onSubmit={handleGuardar} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Nome completo *</label>
                            <input
                                type="text"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                required
                                placeholder="O teu nome"
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Email</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-3 border-2 border-stone-100 rounded-xl bg-stone-50 text-stone-400 text-sm cursor-not-allowed"
                            />
                            <p className="text-xs text-stone-400">O email não pode ser alterado.</p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Telemóvel</label>
                            <input
                                type="tel"
                                value={telemovel}
                                onChange={e => setTelemovel(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                placeholder="912345678"
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                            />
                        </div>

                        {erro && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                {erro}
                            </div>
                        )}

                        {sucesso && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
                                ✓ Perfil atualizado com sucesso!
                            </div>
                        )}

                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando}
                                className="flex-2 bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                            >
                                {guardando ? 'A guardar...' : 'Guardar alterações'}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    )
}