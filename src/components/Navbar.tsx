import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props { session: Session | null }

const ADMIN_EMAIL = 'dmartins94@gmail.com'

export default function Navbar({ session }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [nomeUtilizador, setNomeUtilizador] = useState('')
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
    }, [session])

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
                        <Link to="/ocorrencias" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/ocorrencias')}`}>
                            As minhas ocorrências
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
                                    className="w-9 h-9 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-bold hover:bg-orange-700 transition-colors"
                                    aria-label="Menu do perfil"
                                >
                                    {initials}
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 top-11 w-56 bg-white border border-stone-200 rounded-2xl shadow-lg py-2 z-50">
                                        {/* User info */}
                                        <div className="px-4 py-3 border-b border-stone-100">
                                            <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                                            <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
                                        </div>

                                        {/* Links */}
                                        <div className="py-1">
                                            <Link to="/ocorrencias" onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                <span>📋</span> As minhas ocorrências
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

                                            {/* Admin link */}
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
                    className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? '✕' : '☰'}
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
                                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/ocorrencias')}`}>
                                📋 As minhas ocorrências
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