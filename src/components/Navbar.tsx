import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props { session: Session | null }

const ADMIN_EMAIL = 'dmartins94@gmail.com'
const LAST_VISIT_KEY = 'pg-last-ocorrencias-visit'

interface DropdownItem { to: string; label: string; icon: string; desc?: string }

function NavDropdown({ label, items }: { label: string; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const active = items.some(i => window.location.pathname === i.to)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-4 py-2.5 rounded-xl text-base transition-colors flex items-center gap-1 ${active ? 'text-lime-800 bg-lime-50 font-semibold' : 'text-stone-600 hover:text-lime-800 hover:bg-lime-50'}`}>
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-12 left-0 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50">
          {items.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-lime-50 transition-colors">
              <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <div className="text-sm font-semibold text-stone-900">{item.label}</div>
                {item.desc && <div className="text-xs text-stone-400 mt-0.5">{item.desc}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

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
    if (location.pathname === '/mensagens' && session?.user) setMensagensNaoLidas(0)
  }, [location.pathname])

  const verificarMensagensNaoLidas = async (userId: string) => {
    const { data: convs } = await supabase.from('conversas').select('id').or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    if (!convs?.length) return
    const { count } = await supabase.from('mensagens_privadas').select('id', { count: 'exact' })
      .in('conversa_id', convs.map((c: any) => c.id)).eq('lida', false).neq('sender_id', userId)
    setMensagensNaoLidas(count || 0)
  }

  const verificarNovosAvistamentos = async () => {
    if (!session?.user) return
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY)
    const { data: animais } = await supabase.from('animais').select('id').eq('dono_id', session.user.id).neq('estado', 'encontrado')
    if (!animais?.length) return
    let query = supabase.from('avistamentos').select('id', { count: 'exact' }).in('animal_id', animais.map(a => a.id))
    if (lastVisit) query = query.gt('created_at', lastVisit)
    const { count } = await query
    if (count && count > 0) setNovosAvistamentos(count)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfileOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  const isActive = (path: string) =>
    location.pathname === path ? 'text-lime-800 bg-lime-50 font-semibold' : 'text-stone-600 hover:text-lime-800 hover:bg-lime-50'

  const initials = nomeUtilizador
    ? nomeUtilizador.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() || '?'

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm" style={{ borderBottom: '2px solid #65a30d' }}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="font-bold text-2xl shrink-0 flex items-center gap-2"
          style={{ fontFamily: 'Georgia, serif', color: '#365314' }}>
          🐾 <span>PetGuardian</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={`px-4 py-2.5 rounded-xl text-base transition-colors ${isActive('/')}`}>Início</Link>

          <NavDropdown label="Animais" items={[
            { to: '/animais', icon: '🔍', label: 'Animais perdidos', desc: 'Todos os animais desaparecidos' },
            { to: '/animais-encontrados', icon: '🐾', label: 'Encontrei um animal', desc: 'Reportar animal encontrado na rua' },
            { to: '/identificar', icon: '🤖', label: 'Identificar por IA', desc: 'Descobre de quem é com IA' },
          ]} />

          <Link to="/mapa" className={`px-4 py-2.5 rounded-xl text-base transition-colors ${isActive('/mapa')}`}>Mapa</Link>

          <NavDropdown label="Comunidade" items={[
            { to: '/familias-felizes', icon: '🎉', label: 'Famílias Felizes', desc: 'Casos de reencontro com sucesso' },
            { to: '/estatisticas', icon: '📊', label: 'Estatísticas', desc: 'Dados em tempo real' },
            { to: '/como-funciona', icon: '❓', label: 'Como funciona', desc: 'Guia completo da plataforma' },
          ]} />

          {session && (
            <Link to="/ocorrencias" className={`relative px-4 py-2.5 rounded-xl text-base transition-colors ${isActive('/ocorrencias')}`}>
              Ocorrências
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
                className="text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: '#ea580c' }}>
                + Registar Animal
              </Link>

              {/* Sino */}
              <div className="relative">
                <button onClick={() => setBellOpen(!bellOpen)}
                  className="relative w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-lime-50 hover:text-lime-800 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {(novosAvistamentos + mensagensNaoLidas) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {(novosAvistamentos + mensagensNaoLidas) > 9 ? '9+' : novosAvistamentos + mensagensNaoLidas}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                      <span className="font-semibold text-stone-900 text-sm">Notificações</span>
                      {(novosAvistamentos + mensagensNaoLidas) > 0 && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          {novosAvistamentos + mensagensNaoLidas} novo{(novosAvistamentos + mensagensNaoLidas) > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {(novosAvistamentos > 0 || mensagensNaoLidas > 0) ? (
                      <div className="py-1">
                        {novosAvistamentos > 0 && (
                          <button onClick={() => { setBellOpen(false); navigate('/ocorrencias') }}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-lime-50 transition-colors text-left">
                            <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-lime-800 flex-shrink-0">👁</div>
                            <div>
                              <div className="text-sm font-semibold text-stone-900">{novosAvistamentos} avistamento{novosAvistamentos > 1 ? 's' : ''} novo{novosAvistamentos > 1 ? 's' : ''}</div>
                              <div className="text-xs text-stone-400 mt-0.5">Os teus animais foram avistados</div>
                              <span className="text-xs text-lime-800 font-semibold mt-1.5 inline-block">Ver ocorrências →</span>
                            </div>
                          </button>
                        )}
                        {mensagensNaoLidas > 0 && (
                          <button onClick={() => { setBellOpen(false); navigate('/mensagens') }}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-lime-50 transition-colors text-left">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">💬</div>
                            <div>
                              <div className="text-sm font-semibold text-stone-900">{mensagensNaoLidas} mensagem{mensagensNaoLidas > 1 ? 's' : ''} não lida{mensagensNaoLidas > 1 ? 's' : ''}</div>
                              <div className="text-xs text-stone-400 mt-0.5">Tens conversas à espera de resposta</div>
                              <span className="text-xs text-blue-700 font-semibold mt-1.5 inline-block">Ver mensagens →</span>
                            </div>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <div className="text-3xl mb-2">🔔</div>
                        <div className="text-sm font-semibold text-stone-700">Sem notificações</div>
                        <div className="text-xs text-stone-400 mt-1">Quando alguém avistar o teu animal ou enviar mensagem, aparece aqui.</div>
                        {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                          <button onClick={() => { Notification.requestPermission(); setBellOpen(false) }} className="mt-3 text-xs bg-lime-700 text-white px-3 py-1.5 rounded-lg">Ativar notificações push</button>
                        )}
                        {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                          <div className="mt-2 text-xs text-lime-700">✓ Notificações push ativas</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-lime-700 flex items-center justify-center text-white text-sm font-bold hover:bg-lime-800 transition-colors">
                  {fotoPerfil ? <img src={fotoPerfil} alt="perfil" className="w-full h-full object-cover" /> : initials}
                </button>
                {(novosAvistamentos + mensagensNaoLidas) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white pointer-events-none">
                    {(novosAvistamentos + mensagensNaoLidas) > 9 ? '9+' : novosAvistamentos + mensagensNaoLidas}
                  </span>
                )}
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                      <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
                    </div>
                    <div className="py-1">
                      {[
                        { to: '/mensagens', icon: '💬', label: 'Mensagens', badge: mensagensNaoLidas },
                        { to: '/ocorrencias', icon: '📋', label: 'Ocorrências', badge: novosAvistamentos },
                        { to: '/perfil', icon: '👤', label: 'Editar perfil', badge: 0 },
                        { to: '/definicoes', icon: '⚙️', label: 'Definições', badge: 0 },
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setProfileOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-stone-700 hover:bg-lime-50 hover:text-lime-800 transition-colors">
                          <span className="flex items-center gap-3"><span>{item.icon}</span> {item.label}</span>
                          {item.badge > 0 && <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{item.badge > 9 ? '9+' : item.badge}</span>}
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold">
                          <span>⚡</span> Painel Admin
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-stone-100 py-1">
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <span>🚪</span> Terminar sessão
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-stone-600 px-4 py-2.5 rounded-xl hover:bg-stone-100 transition-colors">Entrar</Link>
              <Link to="/registo" className="text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: '#65a30d' }}>Criar conta</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100 relative" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
          {(novosAvistamentos + mensagensNaoLidas) > 0 && !menuOpen && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-200 px-4 py-3 flex flex-col gap-1">
          {session && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-lime-50 rounded-xl border border-lime-100">
              <div className="w-9 h-9 rounded-full bg-lime-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{initials}</div>
              <div className="min-w-0">
                <div className="font-semibold text-stone-900 text-sm truncate">{nomeUtilizador || 'Utilizador'}</div>
                <div className="text-xs text-stone-400 truncate">{session.user.email}</div>
              </div>
            </div>
          )}
          {[
            ['/', '🏠 Início'],
            ['/animais', '🔍 Animais perdidos'],
            ['/animais-encontrados', '🐾 Encontrei um animal'],
            ['/identificar', '🤖 Identificar por IA'],
            ['/mapa', '🗺️ Mapa'],
            ['/familias-felizes', '🎉 Famílias Felizes'],
            ['/como-funciona', '❓ Como funciona'],
          ].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive(to)}`}>{label}</Link>
          ))}
          {session ? (
            <>
              <div className="border-t border-stone-100 my-1" />
              <Link to="/ocorrencias" onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${isActive('/ocorrencias')}`}>
                <span>📋 Ocorrências</span>
                {novosAvistamentos > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{novosAvistamentos > 9 ? '9+' : novosAvistamentos}</span>}
              </Link>
              <Link to="/mensagens" onClick={() => setMenuOpen(false)} className={`px-3 py-2.5 rounded-xl text-sm ${isActive('/mensagens')}`}>💬 Mensagens</Link>
              <Link to="/perfil" onClick={() => setMenuOpen(false)} className={`px-3 py-2.5 rounded-xl text-sm ${isActive('/perfil')}`}>👤 Perfil</Link>
              <Link to="/registar-animal" onClick={() => setMenuOpen(false)} className="text-white px-3 py-3 rounded-xl text-sm font-semibold text-center mt-1" style={{ background: '#ea580c' }}>+ Registar Animal</Link>
              <button onClick={handleLogout} className="text-sm text-red-600 px-3 py-2.5 text-left hover:bg-red-50 rounded-xl">🚪 Terminar sessão</button>
            </>
          ) : (
            <>
              <div className="border-t border-stone-100 my-1" />
              <Link to="/login" onClick={() => setMenuOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-stone-600">Entrar</Link>
              <Link to="/registo" onClick={() => setMenuOpen(false)} className="text-white px-3 py-3 rounded-xl text-sm font-semibold text-center" style={{ background: '#65a30d' }}>Criar conta</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}