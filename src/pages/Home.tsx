import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Animal } from '../types'

interface Review {
    id: string
    nome: string
    texto: string
    estrelas: number
    created_at: string
}

export default function Home() {
    const [stats, setStats] = useState({ total: 0, encontrados: 0, desaparecidos: 0 })
    const [recentes, setRecentes] = useState<Animal[]>([])
    const [session, setSession] = useState<any>(null)
    const [reviews, setReviews] = useState<Review[]>([])
    const [mostrarFormReview, setMostrarFormReview] = useState(false)
    const [reviewTexto, setReviewTexto] = useState('')
    const [reviewEstrelas, setReviewEstrelas] = useState(5)
    const [reviewNome, setReviewNome] = useState('')
    const [enviandoReview, setEnviandoReview] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                supabase.from('profiles').select('nome').eq('id', session.user.id).single()
                    .then(({ data }) => { if (data?.nome) setReviewNome(data.nome) })
            }
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase.from('animais').select('*').order('created_at', { ascending: false })
            if (data) {
                setRecentes(data.filter(a => a.estado === 'desaparecido').slice(0, 4))
                setStats({
                    total: data.length,
                    encontrados: data.filter(a => a.estado === 'encontrado').length,
                    desaparecidos: data.filter(a => a.estado === 'desaparecido').length,
                })
            }
            const { data: revs } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(6)
            setReviews(revs || [])
        }
        fetchData()
    }, [])

    const handleRegistarAnimal = () => navigate(session ? '/registar-animal' : '/login')

    const enviarReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!reviewTexto.trim() || !reviewNome.trim()) return
        setEnviandoReview(true)
        await supabase.from('reviews').insert({
            nome: reviewNome.trim(),
            texto: reviewTexto.trim(),
            estrelas: reviewEstrelas,
            user_id: session?.user?.id || null
        })
        const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(6)
        setReviews(data || [])
        setReviewTexto('')
        setMostrarFormReview(false)
        setEnviandoReview(false)
    }

    const estadoBadge = (estado: string) => {
        if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Desaparecido</span>
        if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Avistado</span>
        return <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Encontrado</span>
    }

    return (
        <div className="min-h-screen bg-white">

            {/* HERO */}
            <section className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-24 px-4 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-10 right-10 w-64 h-64 bg-green-200 rounded-full opacity-20 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-300 rounded-full opacity-20 blur-3xl"></div>
                </div>
                <div className="max-w-5xl mx-auto text-center relative">
                    <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-8 border border-green-200">
                        🇵🇹 Plataforma Portuguesa Gratuita
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-stone-900 leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                        Encontra o teu<br />
                        <span className="text-green-600">animal de estimação</span>
                    </h1>
                    <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-12 leading-relaxed">
                        A plataforma que liga donos, voluntários e associações para reunir animais desaparecidos com as suas famílias — em tempo real, com IA.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center mb-8">
                        <button onClick={handleRegistarAnimal}
                            className="bg-green-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5">
                            Registar animal desaparecido
                        </button>
                        <Link to="/mapa" className="bg-white text-green-700 border-2 border-green-600 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all">
                            Ver mapa ao vivo
                        </Link>
                        <Link to="/identificar" className="bg-stone-100 text-stone-700 px-8 py-4 rounded-2xl font-semibold hover:bg-stone-200 transition-all">
                            Encontrei um animal 🔍
                        </Link>
                    </div>
                    {!session && (
                        <p className="text-stone-400 text-sm">
                            É necessário ter conta para registar.{' '}
                            <Link to="/registo" className="text-green-600 hover:underline font-medium">Criar conta gratuita →</Link>
                        </p>
                    )}
                </div>
            </section>

            {/* STATS */}
            <section className="bg-green-600 py-10 px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
                    {[
                        { value: stats.total, label: 'Animais registados', sub: 'na plataforma' },
                        { value: stats.encontrados, label: 'Reunidos com a família', sub: 'casos resolvidos' },
                        { value: stats.desaparecidos, label: 'Perdidos', sub: 'precisam de ajuda' },
                    ].map(stat => (
                        <div key={stat.label}>
                            <div className="text-4xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{stat.value}</div>
                            <div className="text-green-100 text-sm font-semibold mt-1">{stat.label}</div>
                            <div className="text-green-300 text-xs mt-0.5">{stat.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* COMO FUNCIONA */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Como funciona</span>
                        <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Três passos simples</h2>
                        <p className="text-stone-500 mt-3 text-lg">Do registo ao reencontro em menos de 2 minutos</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: '📝', num: '01', title: 'Regista o animal', desc: 'Foto, descrição e localização GPS. O animal aparece imediatamente no mapa para toda a comunidade ver.', cor: 'bg-green-50 border-green-200' },
                            { icon: '🗺️', num: '02', title: 'Comunidade ajuda', desc: 'Voluntários reportam avistamentos com foto e localização. Recebes notificação em tempo real via WebSockets.', cor: 'bg-emerald-50 border-emerald-200' },
                            { icon: '🤝', num: '03', title: 'Reencontro', desc: 'Acompanhas a linha do tempo completa da ocorrência e marcas o caso como resolvido quando encontrares.', cor: 'bg-teal-50 border-teal-200' },
                        ].map(item => (
                            <div key={item.num} className={`p-8 rounded-3xl border-2 ${item.cor} hover:shadow-lg transition-all`}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-green-100">{item.icon}</div>
                                    <span className="text-4xl font-black text-green-200" style={{ fontFamily: 'Georgia, serif' }}>{item.num}</span>
                                </div>
                                <h3 className="font-bold text-stone-900 text-lg mb-3">{item.title}</h3>
                                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FUNCIONALIDADES */}
            <section className="py-24 px-4 bg-stone-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Tecnologia</span>
                        <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Tudo o que precisas</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: '🗺️', title: 'Mapa em tempo real', desc: 'Marcadores GPS atualizados instantaneamente via WebSockets. Modo daltónico e filtro por distrito incluídos.' },
                            { icon: '🤖', title: 'Identificação por IA', desc: 'Google Gemini analisa fotos e compara com animais desaparecidos com scoring estruturado.' },
                            { icon: '💬', title: 'Mensagens privadas', desc: 'Troca mensagens directamente com o dono do animal ou com voluntários.' },
                            { icon: '📤', title: 'Partilha automática', desc: 'Gera imagens para Instagram, mensagens WhatsApp e cartaz A4 com QR Code imprimível.' },
                            { icon: '🔔', title: 'Notificações live', desc: 'Badge em tempo real na navbar e notificações push do browser.' },
                            { icon: '🛡️', title: 'Seguro e privado', desc: 'Row Level Security, JWT, RGPD compliant. Os teus dados são teus.' },
                        ].map(feat => (
                            <div key={feat.title} className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-green-300 hover:shadow-md transition-all">
                                <div className="text-3xl mb-4">{feat.icon}</div>
                                <h3 className="font-bold text-stone-900 mb-2">{feat.title}</h3>
                                <p className="text-stone-500 text-sm leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ÚLTIMAS OCORRÊNCIAS */}
            {recentes.length > 0 && (
                <section className="py-24 px-4 bg-white">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Últimas ocorrências</span>
                                <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Precisam de ajuda</h2>
                            </div>
                            <Link to="/animais" className="text-green-700 font-semibold hover:underline flex items-center gap-1">Ver todos →</Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            {recentes.map(animal => (
                                <Link key={animal.id} to={`/animais/${animal.id}`}
                                    className="bg-white rounded-2xl overflow-hidden border-2 border-stone-100 hover:border-green-300 hover:shadow-lg transition-all group">
                                    <div className="h-40 bg-green-50 flex items-center justify-center text-6xl overflow-hidden relative">
                                        {animal.foto_url
                                            ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            : (animal.especie === 'gato' ? '🐈' : animal.especie === 'cao' ? '🐕' : '🐾')
                                        }
                                        <div className="absolute top-2 right-2">{estadoBadge(animal.estado)}</div>
                                    </div>
                                    <div className="p-4">
                                        <div className="font-bold text-stone-900 mb-1">{animal.nome}</div>
                                        <div className="text-xs text-stone-400">{animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Outro'} · {animal.cor}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* REVIEWS */}
            <section className="py-24 px-4 bg-stone-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Testemunhos</span>
                        <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>O que dizem os utilizadores</h2>
                        <p className="text-stone-500 mt-3">Famílias que reuniram os seus animais com a ajuda do PetGuardian</p>
                    </div>

                    {reviews.length > 0 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-green-200 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-1 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < review.estrelas ? 'text-amber-400' : 'text-stone-200'}>★</span>
                                        ))}
                                    </div>
                                    <p className="text-stone-600 text-sm leading-relaxed mb-4">"{review.texto}"</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                                            {review.nome[0].toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-stone-900 text-sm">{review.nome}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {reviews.length === 0 && (
                        <div className="text-center py-10 mb-10">
                            <div className="text-5xl mb-4">💬</div>
                            <p className="text-stone-400">Ainda não há testemunhos. Sê o primeiro!</p>
                        </div>
                    )}

                    {/* Formulário de review */}
                    {session && !mostrarFormReview && (
                        <div className="text-center">
                            <button onClick={() => setMostrarFormReview(true)}
                                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                                ✍️ Deixar um testemunho
                            </button>
                        </div>
                    )}

                    {session && mostrarFormReview && (
                        <form onSubmit={enviarReview} className="bg-white rounded-2xl border border-green-200 p-6 max-w-lg mx-auto">
                            <h3 className="font-bold text-stone-900 mb-4">O teu testemunho</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-stone-500">Nome</label>
                                    <input value={reviewNome} onChange={e => setReviewNome(e.target.value)} required
                                        className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-stone-500">Classificação</label>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button key={n} type="button" onClick={() => setReviewEstrelas(n)}
                                                className={`text-2xl transition-transform hover:scale-110 ${n <= reviewEstrelas ? 'text-amber-400' : 'text-stone-200'}`}>
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-stone-500">A tua experiência</label>
                                    <textarea value={reviewTexto} onChange={e => setReviewTexto(e.target.value)} rows={3} required
                                        placeholder="Como o PetGuardian te ajudou?"
                                        className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm resize-none" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setMostrarFormReview(false)}
                                        className="flex-1 border-2 border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-50">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={enviandoReview}
                                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
                                        {enviandoReview ? 'A enviar...' : 'Publicar'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {!session && (
                        <div className="text-center">
                            <p className="text-stone-400 text-sm mb-3">Faz login para deixar um testemunho</p>
                            <Link to="/login" className="text-green-700 font-semibold hover:underline text-sm">Entrar →</Link>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-4 bg-gradient-to-br from-green-600 to-emerald-700">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-5xl mb-6">🐾</div>
                    <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>Ajuda a reunir mais famílias</h2>
                    <p className="text-green-100 text-lg mb-10">O PetGuardian é gratuito, sem anúncios e funciona em qualquer dispositivo.</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link to="/registo" className="bg-white text-green-700 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg">
                            Criar conta gratuita
                        </Link>
                        <Link to="/animais" className="bg-green-700 text-white border-2 border-green-400 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-800 transition-all">
                            Ver animais desaparecidos
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-stone-900 py-12 px-4">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <span className="text-green-400 font-bold text-xl" style={{ fontFamily: 'Georgia, serif' }}>🐾 PetGuardian</span>
                        <div className="text-stone-500 text-xs mt-1">Plataforma portuguesa de localização de animais</div>
                    </div>
                    <div className="flex gap-8">
                        {[['/', 'Início'], ['/animais', 'Animais'], ['/mapa', 'Mapa'], ['/identificar', 'IA'], ['/estatisticas', 'Estatísticas']].map(([to, label]) => (
                            <Link key={to} to={to} className="text-stone-400 hover:text-green-400 text-sm transition-colors">{label}</Link>
                        ))}
                    </div>
                    <div className="text-stone-500 text-xs text-center">Diana Soares Martins<br />GSC · Atlântica · 2026</div>
                </div>
            </footer>
        </div>
    )
}