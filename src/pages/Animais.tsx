import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonCard } from '../components/Skeleton'
import type { Animal } from '../types'

export default function Animais() {
    const [animais, setAnimais] = useState<Animal[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('')
    const [filtroEspecie, setFiltroEspecie] = useState('')
    const [pesquisa, setPesquisa] = useState('')

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('animais')
                .select('*')
                .order('created_at', { ascending: false })
            setAnimais(data || [])
            setLoading(false)
        }
        fetch()
    }, [])

    const filtrados = animais.filter(a => {
        if (filtroEstado && a.estado !== filtroEstado) return false
        if (filtroEspecie && a.especie !== filtroEspecie) return false
        if (pesquisa && !a.nome.toLowerCase().includes(pesquisa.toLowerCase()) &&
            !(a.raca || '').toLowerCase().includes(pesquisa.toLowerCase())) return false
        return true
    })

    const estadoBadge = (estado: string) => {
        if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Desaparecido</span>
        if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Avistado</span>
        return <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Encontrado</span>
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-6xl mx-auto px-4 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Animais desaparecidos</h1>
                        <p className="text-stone-500 mt-1">{loading ? 'A carregar...' : `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`}</p>
                    </div>
                    <Link to="/registar-animal" className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                        + Registar Animal
                    </Link>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou raça..."
                        value={pesquisa}
                        onChange={e => setPesquisa(e.target.value)}
                        className="flex-1 min-w-48 px-4 py-2 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                    />
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                        className="px-4 py-2 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm bg-white">
                        <option value="">Todos os estados</option>
                        <option value="desaparecido">Desaparecido</option>
                        <option value="avistado">Avistado</option>
                        <option value="encontrado">Encontrado</option>
                    </select>
                    <select value={filtroEspecie} onChange={e => setFiltroEspecie(e.target.value)}
                        className="px-4 py-2 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm bg-white">
                        <option value="">Todas as espécies</option>
                        <option value="cao">Cão</option>
                        <option value="gato">Gato</option>
                        <option value="outro">Outro</option>
                    </select>
                    {(filtroEstado || filtroEspecie || pesquisa) && (
                        <button onClick={() => { setFiltroEstado(''); setFiltroEspecie(''); setPesquisa('') }}
                            className="px-4 py-2 text-stone-500 hover:text-stone-800 text-sm">
                            Limpar ✕
                        </button>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : filtrados.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-5xl mb-4">🔍</div>
                        <p className="text-stone-500">Nenhum animal encontrado com esses filtros.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtrados.map(animal => (
                            <Link key={animal.id} to={`/animais/${animal.id}`} className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-md hover:border-green-200 transition-all block">
                                <div className="h-44 bg-green-50 flex items-center justify-center text-6xl overflow-hidden">
                                    {animal.foto_url
                                        ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                                        : (animal.especie === 'gato' ? '🐈' : animal.especie === 'cao' ? '🐕' : '🐾')
                                    }
                                </div>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="font-bold text-stone-900">{animal.nome}</span>
                                        {estadoBadge(animal.estado)}
                                    </div>
                                    <div className="text-xs text-stone-400 mb-1">
                                        {animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Outro'}
                                        {animal.raca && ` · ${animal.raca}`}
                                    </div>
                                    <div className="text-xs text-stone-400">{animal.cor}</div>
                                    <div className="text-xs text-stone-300 mt-2">
                                        {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}