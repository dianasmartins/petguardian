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
  const [bellOpen, setBellOpen] = useState(false)
  const [nomeUtilizador, setNomeUtilizador] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [novosAvistamentos, setNovosAvistamentos] = useState(0)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session?.user) return
    const fetchNome = async () => {
      const { data } = await supabase.from('profiles').select('nome, foto_url').eq('id', session.user.id).single()
      if (data?.nome) setNomeUtilizador(data.nome)
      if (data?.foto_url) setFotoPerfil(data.foto_url)
    }
    fetchNome()
    verificarNovosAvistamentos()
    verificarMensagensNaoLidas(session.user.id)
  }, [session])

  useEffect(() => {
    if (location.pathname === '/ocorrencias') {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
      setNovosAvistamentos(0)
    }
    if (location.pathname === '/mensagens' && session?.user) {
      setMensagensNaoLidas(0)
    }
  }, [location.pathname])

  const verificarMensagensNaoLidas = async (userId: string) => {
    const { data: convs } = await supabase
      .from('conversas')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    if (!convs || convs.length === 0) return
    const ids = convs.map((c: any) => c.id)
    const { count } = await supabase
      .from('mensagens_privadas')
      .select('id', { count: 'exact' })
      .in('conversa_id', ids)
      .eq('lida', false)
      .neq('sender_id', userId)
    setMensagensNaoLidas(count || 0)
  }

  const verificarNovosAvistamentos = async () => {
    if (!session?.user) return
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY)
    const { data: animais } = await supabase.from('animais').select('id').eq('dono_id', session.user.id).neq('estado', 'encontrado')
    if (!animais || animais.length === 0) return
    const animalIds = animais.map(a => a.id)
    let query = supabase.from('avistamentos').select('id', { count: 'exact' }).in('animal_id', animalIds)
    if (lastVisit) query = query.gt('created_at', lastVisit)
    const { count } = await query
    if (count && count > 0) setNovosAvistamentos(count)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      setBellOpen(false)
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
      ? 'text-green-700 bg-green-50 font-semibold'
      : 'text-stone-600 hover:text-green-700 hover:bg-green-50'

  const initials = nomeUtilizador
    ? nomeUtilizador.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() || '?'

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="font-bold text-xl text-green-700 shrink-0 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
          🐾 <span>PetGuardian</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/')}`}>Início</Link>
          <Link to="/animais" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/animais')}`}>Animais</Link>
          <Link to="/mapa" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/mapa')}`}>Mapa</Link>
          <Link to="/identificar" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/identificar')}`}>Identificar por IA</Link>
          <Link to="/como-funciona" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/como-funciona')}`}>Como funciona</Link>
          <Link to="/estatisticas" className={`px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/estatisticas')}`}>Estatísticas</Link>

          {session && (
            <Link to="/ocorrencias" className={`relative px-3 py-2 rounded-xl text-sm transition-colors ${isActive('/ocorrencias')}`}>
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
              <Link to="/registar-animal"
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm shadow-green-200">
                + Registar Animal
              </Link>
              {/* Sino de notificações */}
              <div className="relative">
                <button onClick={() => setBellOpen(!bellOpen)}
                  className="relative w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                  title="Notificações">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {novosAvistamentos > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {novosAvistamentos > 9 ? '9+' : novosAvistamentos}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-11 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                      <span className="font-semibold text-stone-900 text-sm">Notificações</span>
                      {novosAvistamentos > 0 && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{novosAvistamentos} novo{novosAvistamentos > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {novosAvistamentos > 0 ? (
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 flex-shrink-0 mt-0.5">👁</div>
                          <div>
                            <div className="text-sm font-semibold text-stone-900">{novosAvistamentos} avistamento{novosAvistamentos > 1 ? 's' : ''} novo{novosAvistamentos > 1 ? 's' : ''}</div>
                            <div className="text-xs text-stone-400 mt-0.5">Os teus animais foram avistados</div>
                            <button onClick={() => { setBellOpen(false); navigate('/ocorrencias') }}
                              className="text-xs text-green-700 font-semibold mt-2 hover:underline">
                              Ver ocorrências →
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <div className="text-3xl mb-2">🔔</div>
                        <div className="text-sm font-semibold text-stone-700">Sem notificações</div>
                        <div className="text-xs text-stone-400 mt-1">Quando alguém avistar o teu animal, aparece aqui.</div>
                        {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                          <button onClick={() => { Notification.requestPermission(); setBellOpen(false) }}
                            className="mt-3 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                            Ativar notificações push
                          </button>
                        )}
                        {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                          <div className="mt-2 text-xs text-green-600">✓ Notificações push ativas</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="relative w-9 h-9 rounded-full overflow-hidden bg-green-600 flex items-center justify-center text-white text-sm font-bold hover:bg-green-700 transition-colors">
                  {fotoPerfil ? <img src={fotoPerfil} alt="perfil" className="w-full h-full object-cover" /> : initials}
                  {novosAvistamentos > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-11 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                      <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
                    </div>
                    <div className="py-1">
                      <Link to="/mensagens" onClick={() => setProfileOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                        <span className="flex items-center gap-3"><span>💬</span> Mensagens</span>
                        {mensagensNaoLidas > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}</span>
                        )}
                      </Link>
                      <Link to="/ocorrencias" onClick={() => setProfileOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                        <span className="flex items-center gap-3"><span>📋</span> As minhas ocorrências</span>
                        {novosAvistamentos > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{novosAvistamentos > 9 ? '9+' : novosAvistamentos}</span>
                        )}
                      </Link>
                      <Link to="/registar-animal" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                        <span>➕</span> Registar animal
                      </Link>
                      <Link to="/perfil" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                        <span>👤</span> Editar perfil
                      </Link>
                      <Link to="/definicoes" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-green-50 hover:text-green-700 transition-colors">
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
              <Link to="/login" className="text-sm font-medium text-stone-600 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors">Entrar</Link>
              <Link to="/registo" className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm shadow-green-200">Criar conta</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100 relative"
          onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
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
            <div className="flex items-center gap-3 px-3 py-3 mb-1 bg-green-50 rounded-xl border border-green-100">
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials}</div>
              <div className="min-w-0">
                <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
              </div>
            </div>
          )}
          {[['/', '🏠 Início'], ['/animais', '🐾 Animais'], ['/mapa', '🗺️ Mapa'], ['/identificar', '🤖 Identificar por IA']].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive(to)}`}>{label}</Link>
          ))}
          {session ? (
            <>
              <div className="border-t border-stone-100 my-1" />
              <Link to="/ocorrencias" onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/ocorrencias')}`}>
                <span>📋 As minhas ocorrências</span>
                {novosAvistamentos > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{novosAvistamentos > 9 ? '9+' : novosAvistamentos} novo{novosAvistamentos > 1 ? 's' : ''}</span>
                )}
              </Link>
              <Link to="/perfil" onClick={() => setMenuOpen(false)} className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/perfil')}`}>👤 Editar perfil</Link>
              <Link to="/definicoes" onClick={() => setMenuOpen(false)} className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive('/definicoes')}`}>⚙️ Definições</Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">⚡ Painel Admin</Link>
              )}
              <div className="border-t border-stone-100 my-1" />
              <Link to="/registar-animal" onClick={() => setMenuOpen(false)}
                className="bg-green-600 text-white px-3 py-3 rounded-xl text-sm font-semibold text-center">
                + Registar Animal
              </Link>
              <button onClick={handleLogout} className="text-sm text-red-600 px-3 py-2.5 text-left hover:bg-red-50 rounded-xl transition-colors">🚪 Terminar sessão</button>
            </>
          ) : (
            <>
              <div className="border-t border-stone-100 my-1" />
              <Link to="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600">Entrar</Link>
              <Link to="/registo" onClick={() => setMenuOpen(false)} className="bg-green-600 text-white px-3 py-3 rounded-xl text-sm font-semibold text-center mt-1">Criar conta</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
