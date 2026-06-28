import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props { session: Session | null }

const ADMIN_EMAIL = 'dmartins94@gmail.com'
const LAST_VISIT_KEY = 'pg-last-ocorrencias-visit'

export default function Navbar({ session }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [nomeUtilizador, setNomeUtilizador] = useState('')
    const [novosAvistamentos, setNovosAvistamentos] = useState(0)
    const navigate = useNavigate()
    const location = useLocation()
    const profileRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!session?.user) return
        const fetchNome = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('nome')
                .eq('id', session.user.id)
                .single()
            if (data?.nome) setNomeUtilizador(data.nome)
        }
        fetchNome()
        verificarNovosAvistamentos()
    }, [session])

    // Limpa o badge quando o utilizador está na página de ocorrências
    useEffect(() => {
        if (location.pathname === '/ocorrencias') {
            localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
            setNovosAvistamentos(0)
        }
    }, [location.pathname])

    const verificarNovosAvistamentos = async () => {
        if (!session?.user) return
        const lastVisit = localStorage.getItem(LAST_VISIT_KEY)

        // Busca os animais do utilizador
        const { data: animais } = await supabase
            .from('animais')
            .select('id')
            .eq('dono_id', session.user.id)
            .neq('estado', 'encontrado')

        if (!animais || animais.length === 0) return

        const animalIds = animais.map(a => a.id)

        // Conta avistamentos novos desde a última visita
        let query = supabase
            .from('avistamentos')
            .select('id', { count: 'exact' })
            .in('animal_id', animalIds)

        if (lastVisit) {
            query = query.gt('created_at', lastVisit)
        }

        const { count } = await query
        if (count && count > 0) setNovosAvistamentos(count)

        // Subscreve a novos avistamentos em tempo real
        const channel = supabase
            .channel('navbar-avistamentos')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'avistamentos',
                filter: 'animal_id=in.(' + animalIds.join(',') + ')'
            }, () => {
                if (location.pathname !== '/ocorrencias') {
                    setNovosAvistamentos(prev => prev + 1)
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setProfileOpen(false)
        setMenuOpen(false)
        navigate('/')
    }

    const isActive = (path: string) =>
        location.pathname === path
            ? 'text-orange-600 bg-orange-50'
            : 'text-stone-600 hover:text-orange-600 hover:bg-orange-50'

    const initials = nomeUtilizador
        ? nomeUtilizador.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : session?.user?.email?.[0]?.toUpperCase() || '?'

    const isAdmin = session?.user?.email === ADMIN_EMAIL

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

                {/* Logo */}
                <Link to="/" className="font-bold text-xl text-orange-600 shrink-0" style={{ fontFamily: 'Georgia, serif' }}>
                    🐾 PetGuardian
                </Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1">
                    <Link to="/" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/')}`}>Início</Link>
                    <Link to="/animais" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/animais')}`}>Animais</Link>
                    <Link to="/mapa" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/mapa')}`}>Mapa</Link>
                    <Link to="/identificar" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/identificar')}`}>Identificar por IA</Link>
                    {session && (
                        <Link to="/ocorrencias" className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/ocorrencias')}`}>
                            As minhas ocorrências
                            {novosAvistamentos > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {novosAvistamentos > 9 ? '9+' : novosAvistamentos}
                                </span>
                            )}
                        </Link>
                    )}
                </div>

                {/* Desktop actions */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                    {session ? (
                        <>
                            <Link to="/registar-animal" className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">
                                + Registar Animal
                            </Link>

                            {/* Profile dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="relative w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold hover:bg-orange-700 transition-colors"
                                    aria-label="Menu do perfil"
                                >
                                    {initials}
                                    {novosAvistamentos > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                                    )}
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 top-11 w-56 bg-white border border-stone-200 rounded-2xl shadow-lg py-2 z-50">
                                        <div className="px-4 py-3 border-b border-stone-100">
                                            <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                                            <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
                                        </div>

                                        <div className="py-1">
                                            <Link to="/ocorrencias" onClick={() => setProfileOpen(false)}
                                                className="flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                <span className="flex items-center gap-3"><span>📋</span> As minhas ocorrências</span>
                                                {novosAvistamentos > 0 && (
                                                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                        {novosAvistamentos > 9 ? '9+' : novosAvistamentos}
                                                    </span>
                                                )}
                                            </Link>
                                            <Link to="/registar-animal" onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                <span>➕</span> Registar animal
                                            </Link>
                                            <Link to="/perfil" onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                <span>👤</span> Editar perfil
                                            </Link>
                                            <Link to="/definicoes" onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                <span>⚙️</span> Definições
                                            </Link>
                                            {isAdmin && (
                                                <Link to="/admin" onClick={() => setProfileOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold">
                                                    <span>⚡</span> Painel Admin
                                                </Link>
                                            )}
                                        </div>

                                        <div className="border-t border-stone-100 py-1">
                                            <button onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                                <span>🚪</span> Terminar sessão
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Entrar</Link>
                            <Link to="/registo" className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">Criar conta</Link>
                        </>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 relative"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? '✕' : '☰'}
                    {novosAvistamentos > 0 && !menuOpen && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden bg-white border-t border-stone-200 px-4 py-3 flex flex-col gap-1">
                    {session && (
                        <div className="flex items-center gap-3 px-3 py-3 mb-1 bg-orange-50 rounded-xl">
                            <div className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                                <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
                            </div>
                        </div>
                    )}

                    {[
                        { to: '/', label: '🏠 Início' },
                        { to: '/animais', label: '🐾 Animais' },
                        { to: '/mapa', label: '🗺️ Mapa' },
                        { to: '/identificar', label: '🤖 Identificar por IA' },
                    ].map(({ to, label }) => (
                        <Link key={to} to={to} onClick={() => setMenuOpen(false)}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(to)}`}>
                            {label}
                        </Link>
                    ))}

                    {session ? (
                        <>
                            <div className="border-t border-stone-100 my-1" />
                            <Link to="/ocorrencias" onClick={() => setMenuOpen(false)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/ocorrencias')}`}>
                                <span>📋 As minhas ocorrências</span>
                                {novosAvistamentos > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {novosAvistamentos > 9 ? '9+' : novosAvistamentos} novo{novosAvistamentos > 1 ? 's' : ''}
                                    </span>
                                )}
                            </Link>
                            <Link to="/perfil" onClick={() => setMenuOpen(false)}
                                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/perfil')}`}>
                                👤 Editar perfil
                            </Link>
                            <Link to="/definicoes" onClick={() => setMenuOpen(false)}
                                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/definicoes')}`}>
                                ⚙️ Definições
                            </Link>
                            {isAdmin && (
                                <Link to="/admin" onClick={() => setMenuOpen(false)}
                                    className="px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                                    ⚡ Painel Admin
                                </Link>
                            )}
                            <div className="border-t border-stone-100 my-1" />
                            <Link to="/registar-animal" onClick={() => setMenuOpen(false)}
                                className="bg-orange-600 text-white px-3 py-3 rounded-xl text-sm font-semibold text-center">
                                + Registar Animal
                            </Link>
                            <button onClick={handleLogout}
                                className="text-sm text-red-600 px-3 py-2.5 text-left hover:bg-red-50 rounded-lg transition-colors">
                                🚪 Terminar sessão
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="border-t border-stone-100 my-1" />
                            <Link to="/login" onClick={() => setMenuOpen(false)}
                                className="px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600">
                                Entrar
                            </Link>
                            <Link to="/registo" onClick={() => setMenuOpen(false)}
                                className="bg-orange-600 text-white px-3 py-3 rounded-xl text-sm font-semibold text-center mt-1">
                                Criar conta
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    )
}