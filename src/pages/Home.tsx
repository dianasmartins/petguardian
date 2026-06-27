import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Animal } from '../types'

export default function Home() {
    const [stats, setStats] = useState({ total: 0, encontrados: 0, desaparecidos: 0 })
    const [recentes, setRecentes] = useState<Animal[]>([])
    const [session, setSession] = useState<any>(null)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase
                .from('animais')
                .select('*')
                .order('created_at', { ascending: false })
            if (data) {
                setRecentes(data.slice(0, 4))
                setStats({
                    total: data.length,
                    encontrados: data.filter(a => a.estado === 'encontrado').length,
                    desaparecidos: data.filter(a => a.estado === 'desaparecido').length,
                })
            }
        }
        fetchData()
    }, [])

    const handleRegistarAnimal = () => {
        if (session) {
            navigate('/registar-animal')
        } else {
            navigate('/login')
        }
    }

    const estadoBadge = (estado: string) => {
        if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Desaparecido</span>
        if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Avistado</span>
        return <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Encontrado</span>
    }

    return (
        <div className="min-h-screen bg-white">

            {/* HERO */}
            <section className="bg-gradient-to-br from-orange-50 to-amber-50 py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                        🇵🇹 Plataforma Portuguesa
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-stone-900 leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                        Encontra o teu<br />
                        <span className="text-orange-600">animal de estimação</span>
                    </h1>
                    <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        A plataforma que liga donos, voluntários e associações para reunir animais desaparecidos com as suas famílias — em tempo real, com IA.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={handleRegistarAnimal}
                            className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                        >
                            Registar animal desaparecido
                        </button>
                        <Link to="/mapa" className="bg-white text-orange-600 border-2 border-orange-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-colors">
                            Ver mapa
                        </Link>
                        <Link to="/identificar" className="bg-stone-100 text-stone-700 px-6 py-4 rounded-2xl font-semibold hover:bg-stone-200 transition-colors">
                            Encontrei um animal 🔍
                        </Link>
                    </div>
                    {!session && (
                        <p className="text-stone-400 text-sm mt-4">
                            É necessário ter conta para registar.{' '}
                            <Link to="/registo" className="text-orange-600 hover:underline font-medium">Criar conta gratuita →</Link>
                        </p>
                    )}
                </div>
            </section>

            {/* STATS */}
            <section className="bg-orange-600 py-8 px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{stats.total}</div>
                        <div className="text-orange-200 text-sm mt-1">Animais registados</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{stats.encontrados}</div>
                        <div className="text-orange-200 text-sm mt-1">Reunidos com família</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{stats.desaparecidos}</div>
                        <div className="text-orange-200 text-sm mt-1">À procura agora</div>
                    </div>
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">Como funciona</span>
                        <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Três passos simples</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: '📝', num: '1', title: 'Regista o animal', desc: 'Foto, descrição e localização GPS. O animal aparece imediatamente no mapa para toda a comunidade.' },
                            { icon: '🗺️', num: '2', title: 'Comunidade ajuda', desc: 'Voluntários reportam avistamentos com foto e localização. Recebes notificação em tempo real.' },
                            { icon: '🤝', num: '3', title: 'Reencontro', desc: 'Acompanhas toda a linha do tempo da ocorrência e marcas o caso como resolvido quando encontrares.' },
                        ].map(item => (
                            <div key={item.num} className="text-center p-8 rounded-2xl border border-stone-100 hover:border-orange-200 hover:shadow-md transition-all">
                                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5">{item.icon}</div>
                                <h3 className="font-bold text-stone-900 mb-3">{item.num}. {item.title}</h3>
                                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ÚLTIMAS OCORRÊNCIAS */}
            {recentes.length > 0 && (
                <section className="py-20 px-4 bg-stone-50">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">Últimas ocorrências</span>
                                <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Precisam de ajuda</h2>
                            </div>
                            <Link to="/animais" className="text-orange-600 font-semibold text-sm hover:underline">Ver todos →</Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recentes.map(animal => (
                                <div key={animal.id} className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-md transition-shadow">
                                    <div className="h-36 bg-orange-50 flex items-center justify-center text-5xl overflow-hidden">
                                        {animal.foto_url
                                            ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                                            : (animal.especie === 'gato' ? '🐈' : animal.especie === 'cao' ? '🐕' : '🐾')
                                        }
                                    </div>
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-1 mb-1">
                                            <span className="font-bold text-stone-900 text-sm">{animal.nome}</span>
                                            {estadoBadge(animal.estado)}
                                        </div>
                                        <div className="text-xs text-stone-400">{animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Outro'} · {animal.cor}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* CTA */}
            <section className="py-20 px-4 bg-orange-50 border-t border-orange-100">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>Ajuda a reunir mais famílias</h2>
                    <p className="text-stone-500 mb-8">O PetGuardian é gratuito e funciona em qualquer dispositivo. Sem instalação necessária.</p>
                    <Link to="/registo" className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition-colors">
                        Criar conta gratuita
                    </Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-stone-900 py-10 px-4">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-orange-500 font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>🐾 PetGuardian</span>
                    <div className="flex gap-6">
                        {[['/', 'Início'], ['/animais', 'Animais'], ['/mapa', 'Mapa'], ['/identificar', 'Identificar por IA']].map(([to, label]) => (
                            <Link key={to} to={to} className="text-stone-400 hover:text-white text-sm transition-colors">{label}</Link>
                        ))}
                    </div>
                    <span className="text-stone-500 text-xs">Diana Soares Martins · GSC 2026</span>
                </div>
            </footer>

        </div>
    )
}