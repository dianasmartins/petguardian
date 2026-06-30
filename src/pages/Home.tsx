import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Review {
  id: string
  nome: string
  texto: string
  estrelas: number
  created_at: string
}

const VERDE = '#65a30d'
const VERDE_ESCURO = '#365314'
const VERDE_CLARO = '#f7fee7'
const VERDE_BORDA = '#d9f99d'
const LARANJA = '#ea580c'

export default function Home() {
  const [stats, setStats] = useState({ total: 0, encontrados: 0, desaparecidos: 0 })
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
      const { data } = await supabase.from('animais').select('id, estado').order('created_at', { ascending: false })
      if (data) setStats({ total: data.length, encontrados: data.filter(a => a.estado === 'encontrado').length, desaparecidos: data.filter(a => a.estado === 'desaparecido').length })
      const { data: revs } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(6)
      setReviews(revs || [])
    }
    fetchData()
  }, [])

  const enviarReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewTexto.trim() || !reviewNome.trim()) return
    setEnviandoReview(true)
    await supabase.from('reviews').insert({ nome: reviewNome.trim(), texto: reviewTexto.trim(), estrelas: reviewEstrelas, user_id: session?.user?.id || null })
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(6)
    setReviews(data || [])
    setReviewTexto('')
    setMostrarFormReview(false)
    setEnviandoReview(false)
  }

  return (
    <div className="min-h-screen" style={{ background: VERDE_CLARO }}>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: VERDE_CLARO }}>
        <img
          src="/hero-illustration.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          style={{ opacity: 0.35 }}
        />
        <div className="absolute inset-0" style={{ background: VERDE_CLARO, opacity: 0.55 }}></div>
        <div className="max-w-7xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-12 items-center relative z-10">

          {/* Esquerda */}
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-bold border"
              style={{ background: '#ecfccb', color: VERDE_ESCURO, borderColor: VERDE_BORDA }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: VERDE }}></span>
              {stats.desaparecidos} animais perdidos agora em Portugal
            </div>
            <h1 className="text-6xl font-black leading-tight mb-6" style={{ color: VERDE_ESCURO, fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>
              O teu animal<br />
              <em style={{ color: VERDE, fontStyle: 'normal' }}>perdido</em><br />
              volta a casa.
            </h1>
            <p className="text-xl mb-10 leading-relaxed" style={{ color: '#4d7c0f' }}>
              Mapa em tempo real, identificação por IA e uma comunidade portuguesa pronta a ajudar — sempre gratuito.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={() => navigate(session ? '/registar-animal' : '/registo')}
                className="px-7 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5"
                style={{ background: LARANJA, boxShadow: '0 4px 14px rgba(234,88,12,.3)' }}>
                Criar alerta agora
              </button>
              <Link to="/mapa" className="px-9 py-4 rounded-xl font-bold text-lg border-2 transition-all"
                style={{ color: VERDE_ESCURO, borderColor: VERDE, background: 'white' }}>
                Mapa de Ocorrências
              </Link>
            </div>
            <Link to="/animais-encontrados" className="text-sm transition-colors hover:underline" style={{ color: '#4d7c0f' }}>
              Encontrei um animal perdido →
            </Link>
          </div>

          <div className="hidden md:block" />
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: VERDE_ESCURO }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {[
            { value: stats.desaparecidos, label: 'Perdidos agora' },
            { value: stats.encontrados, label: 'Reunidos com a família' },
            { value: stats.total, label: 'Animais registados' },
            { value: '87%', label: 'Taxa de sucesso' },
          ].map(s => (
            <div key={s.label} className="text-center py-10 px-4">
              <div className="text-4xl font-black" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>{s.value}</div>
              <div className="text-sm mt-1.5" style={{ color: '#86efac' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA + FUNCIONALIDADES */}
      <section className="pt-28 pb-4 px-8" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider"
              style={{ background: '#ecfccb', color: VERDE_ESCURO, border: `1px solid ${VERDE_BORDA}` }}>
              Como funciona
            </div>
            <h2 className="text-5xl font-bold" style={{ color: VERDE_ESCURO, fontFamily: 'Georgia, serif' }}>
              Três passos para reunir a tua família
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { icon: '📝', num: '01', title: 'Regista o animal', desc: 'Foto, dados e GPS. Aparece no mapa em segundos para toda a comunidade ver.' },
              { icon: '🗺️', num: '02', title: 'Comunidade ajuda', desc: 'Voluntários reportam avistamentos com foto e localização. Recebes notificação em tempo real.' },
              { icon: '🤝', num: '03', title: 'Reencontro', desc: 'Acompanha a linha do tempo e marca como encontrado quando reunires o teu animal.' },
            ].map(item => (
              <div key={item.num} className="p-10 rounded-3xl border-2 relative overflow-hidden"
                style={{ background: VERDE_CLARO, borderColor: VERDE_BORDA }}>
                <div className="absolute top-2 right-4 text-6xl font-black" style={{ color: '#ecfccb', fontFamily: 'Georgia, serif' }}>{item.num}</div>
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-xl mb-3" style={{ color: VERDE_ESCURO }}>{item.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Cards que rodam ao clicar */}
          <style>{`
            .flip-card { perspective: 1000px; cursor: pointer; }
            .flip-card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(.4,0,.2,1); transform-style: preserve-3d; }
            .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
            .flip-front, .flip-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 20px; text-align: center; }
            .flip-back { transform: rotateY(180deg); }
          `}</style>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              {
                icon: '🗺️', title: 'Mapa em tempo real',
                backTitle: 'Como funciona',
                backDesc: 'WebSockets actualizam os marcadores ao segundo. Filtra por estado, espécie e distrito. Modo daltónico incluído.',
                color: '#ecfccb', colorDark: '#365314', colorBorder: '#d9f99d'
              },
              {
                icon: '🤖', title: 'Identificação por IA',
                backTitle: 'Google Gemini',
                backDesc: 'Analisa a foto do animal e extrai espécie, raça, cor e características. Compara com os desaparecidos com scoring até 100%.',
                color: '#dbeafe', colorDark: '#1e3a8a', colorBorder: '#bfdbfe'
              },
              {
                icon: '🔔', title: 'Notificações push',
                backTitle: 'Alertas em tempo real',
                backDesc: 'Recebe notificação no browser mesmo com a página fechada. Service Worker integrado para alertas instantâneos.',
                color: '#fef3c7', colorDark: '#92400e', colorBorder: '#fcd34d'
              },
              {
                icon: '🖨️', title: 'Cartaz QR Code',
                backTitle: 'Pronto a imprimir',
                backDesc: 'Gera um cartaz A4 com foto, dados e QR Code em segundos. Qualquer pessoa pode reportar ao ler o código.',
                color: '#ffe4e6', colorDark: '#881337', colorBorder: '#fecdd3'
              },
              {
                icon: '💬', title: 'Mensagens privadas',
                backTitle: 'Chat em tempo real',
                backDesc: 'Fala directamente com o dono do animal. Ticks de lido/enviado e histórico completo de conversas.',
                color: '#f3e8ff', colorDark: '#581c87', colorBorder: '#e9d5ff'
              },
              {
                icon: '📤', title: 'Partilha automática',
                backTitle: 'Aumenta o alcance',
                backDesc: 'Partilha para WhatsApp, Facebook e Instagram com um clique. Mensagem pré-redigida com foto e link do perfil.',
                color: '#ecfccb', colorDark: '#365314', colorBorder: '#d9f99d'
              },
            ].map((card, i) => (
              <div key={i} className="flip-card" style={{ height: 180 }}
                onClick={e => (e.currentTarget as HTMLElement).classList.toggle('flipped')}>
                <div className="flip-card-inner" style={{ height: '100%' }}>
                  <div className="flip-front" style={{ background: card.color, border: `1.5px solid ${card.colorBorder}` }}>
                    <span className="text-4xl mb-3">{card.icon}</span>
                    <span className="font-bold text-sm" style={{ color: card.colorDark }}>{card.title}</span>
                    <span className="text-xs mt-2 opacity-60" style={{ color: card.colorDark }}>Clica para saber mais</span>
                  </div>
                  <div className="flip-back" style={{ background: card.colorDark }}>
                    <div className="font-bold text-sm text-white mb-2">{card.backTitle}</div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,.8)' }}>{card.backDesc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="pt-4 pb-28 px-8" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider"
              style={{ background: '#ecfccb', color: VERDE_ESCURO, border: `1px solid ${VERDE_BORDA}` }}>
              Testemunhos
            </div>
            <h2 className="text-5xl font-bold" style={{ color: VERDE_ESCURO, fontFamily: 'Georgia, serif' }}>
              O que dizem as famílias
            </h2>
          </div>

          {reviews.length > 0 && (
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {reviews.map(review => (
                <div key={review.id} className="rounded-2xl p-6 border" style={{ background: VERDE_CLARO, borderColor: VERDE_BORDA }}>
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ color: i < review.estrelas ? '#f59e0b' : '#e5e7eb', fontSize: 16 }}>★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#4d7c0f', fontStyle: 'italic' }}>"{review.texto}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ background: '#ecfccb', color: VERDE_ESCURO }}>{review.nome[0].toUpperCase()}</div>
                    <span className="font-semibold text-sm" style={{ color: VERDE_ESCURO }}>{review.nome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {session && !mostrarFormReview && (
            <div className="text-center">
              <button onClick={() => setMostrarFormReview(true)}
                className="px-6 py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: LARANJA }}>
                ✍️ Deixar um testemunho
              </button>
            </div>
          )}

          {session && mostrarFormReview && (
            <form onSubmit={enviarReview} className="rounded-2xl border p-6 max-w-lg mx-auto" style={{ borderColor: VERDE_BORDA, background: VERDE_CLARO }}>
              <h3 className="font-bold mb-4" style={{ color: VERDE_ESCURO }}>O teu testemunho</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block" style={{ color: VERDE_ESCURO }}>Nome</label>
                  <input value={reviewNome} onChange={e => setReviewNome(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-sm"
                    style={{ borderColor: VERDE_BORDA, background: 'white', color: VERDE_ESCURO }} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block" style={{ color: VERDE_ESCURO }}>Classificação</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setReviewEstrelas(n)}
                        className="text-2xl transition-transform hover:scale-110"
                        style={{ color: n <= reviewEstrelas ? '#f59e0b' : '#e5e7eb' }}>★</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block" style={{ color: VERDE_ESCURO }}>A tua experiência</label>
                  <textarea value={reviewTexto} onChange={e => setReviewTexto(e.target.value)} rows={3} required
                    className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none text-sm resize-none"
                    style={{ borderColor: VERDE_BORDA, background: 'white', color: VERDE_ESCURO }} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setMostrarFormReview(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2"
                    style={{ borderColor: VERDE_BORDA, color: VERDE_ESCURO }}>Cancelar</button>
                  <button type="submit" disabled={enviandoReview}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: LARANJA }}>
                    {enviandoReview ? 'A enviar...' : 'Publicar'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!session && (
            <div className="text-center">
              <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>Faz login para deixar um testemunho</p>
              <Link to="/login" className="font-semibold text-sm hover:underline" style={{ color: VERDE }}>Entrar →</Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA — só para não autenticados */}
      {!session && (
        <section className="py-24 px-6 text-center" style={{ background: VERDE_ESCURO }}>
          <div className="text-5xl mb-6">🐾</div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Ajuda a reunir mais famílias
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,.7)' }}>
            O PetGuardian é gratuito, sem anúncios e funciona em qualquer dispositivo.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/registo" className="px-10 py-4 rounded-2xl font-bold text-lg transition-all"
              style={{ background: LARANJA, color: 'white' }}>
              Criar conta gratuita
            </Link>
            <Link to="/animais" className="px-10 py-4 rounded-2xl font-bold text-lg border-2 border-white text-white transition-all">
              Ver animais desaparecidos
            </Link>
          </div>
        </section>
      )}

    </div>
  )
}