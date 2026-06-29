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
const LARANJA_ESCURO = '#c2410c'

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
      <section style={{ background: VERDE_CLARO }}>
        <div className="max-w-7xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-12 items-center">

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
                Ver mapa ao vivo
              </Link>
            </div>
            <Link to="/identificar" className="text-sm transition-colors hover:underline" style={{ color: '#4d7c0f' }}>
              Encontrei um animal perdido →
            </Link>
          </div>

          {/* Cards informativos lado direito */}
          <div className="flex flex-col gap-4">
            {[
              { icon: '🗺️', title: 'Mapa em tempo real', desc: 'Vê todos os animais desaparecidos numa carta interactiva, actualizada ao segundo via WebSockets.' },
              { icon: '🤖', title: 'Identificação por IA', desc: 'Carrega a foto de um animal encontrado e a IA compara automaticamente com os desaparecidos.' },
              { icon: '🔔', title: 'Notificações instantâneas', desc: 'Recebe alerta imediato quando alguém avistar o teu animal — mesmo com o browser fechado.' },
              { icon: '🖨️', title: 'Cartaz QR Code', desc: 'Gera um cartaz A4 para imprimir e afixar na zona. Qualquer pessoa pode reportar ao ler o QR.' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 bg-white rounded-2xl px-6 py-5 border"
                style={{ borderColor: VERDE_BORDA, boxShadow: '0 2px 8px rgba(101,163,13,.08)' }}>
                <span className="text-3xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="font-bold text-base mb-1" style={{ color: VERDE_ESCURO }}>{item.title}</div>
                  <div className="text-base leading-relaxed" style={{ color: '#4d7c0f', opacity: .8 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
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
            <div key={s.label} className="text-center py-6 px-4">
              <div className="text-4xl font-black" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>{s.value}</div>
              <div className="text-sm mt-1.5" style={{ color: '#86efac' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-28 px-8" style={{ background: 'white' }}>
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
          <div className="grid md:grid-cols-3 gap-8">
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
        </div>
      </section>

      {/* INFO BOX */}
      <section className="py-24 px-8" style={{ background: VERDE_CLARO }}>
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl p-10" style={{ background: VERDE_ESCURO }}>
            <div className="text-center mb-10">
              <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider"
                style={{ background: 'rgba(217,249,157,.15)', color: '#d9f99d', border: '1px solid rgba(217,249,157,.2)' }}>
                Como o PetGuardian ajuda
              </div>
              <h2 className="text-4xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Tudo para reunir o teu animal
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🗺️', text: 'Mapa em tempo real com todos os animais desaparecidos de Portugal — visível por toda a comunidade instantaneamente' },
                { icon: '🤖', text: 'Identificação por IA — analisa a foto do animal encontrado e compara com os desaparecidos registados' },
                { icon: '📋', text: 'Regista o teu animal na base de dados portuguesa de animais perdidos, actualizada em tempo real' },
                { icon: '🖨️', text: 'Gera um cartaz A4 com QR Code para imprimir e afixar na zona do desaparecimento' },
                { icon: '📤', text: 'Partilha automática para WhatsApp, Facebook e Instagram para aumentar o alcance da pesquisa' },
                { icon: '🎉', text: 'Junta-te a centenas de famílias portuguesas que já reuniram os seus animais com o PetGuardian' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                  <span className="text-3xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.75)' }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-28 px-8" style={{ background: 'white' }}>
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
      {!session && <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        {/* Imagem de fundo */}
        <img
          src="/hero-illustration.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: 'brightness(0.22) saturate(0.8)' }}
        />
        {/* Overlay laranja subtil */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(234,88,12,.85) 0%, rgba(101,163,13,.75) 100%)' }}></div>
        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24">
          <div className="text-5xl mb-6">🐾</div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Ajuda a reunir mais famílias
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,.85)' }}>
            O PetGuardian é gratuito, sem anúncios e funciona em qualquer dispositivo.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/registo" className="px-10 py-4 rounded-2xl font-bold text-lg transition-all"
              style={{ background: VERDE_CLARO, color: LARANJA_ESCURO }}>
              Criar conta gratuita
            </Link>
            <Link to="/animais" className="px-10 py-4 rounded-2xl font-bold text-lg border-2 border-white text-white transition-all">
              Ver animais desaparecidos
            </Link>
          </div>
        </div>
      </section>}

      {/* FOOTER */}
      <footer style={{ background: VERDE_ESCURO }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}>
            {/* Logo + descrição */}
            <div className="max-w-xs">
              <div className="text-2xl font-bold mb-3" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>🐾 PetGuardian</div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,.45)' }}>
                Plataforma portuguesa gratuita para localizar animais de estimação desaparecidos. Mapa em tempo real, IA de identificação e comunidade de voluntários.
              </p>
            </div>
            {/* Links */}
            <div className="flex flex-wrap gap-x-12 gap-y-3">
              {[
                ['/como-funciona', 'How It Works'],
                ['/familias-felizes', 'About Us'],
                ['/animais', 'Frequently Asked Questions'],
                ['/definicoes', 'Privacy Policy'],
                ['/como-funciona', 'Terms of Service'],
              ].map(([to, label]) => (
                <Link key={label} to={to} className="text-sm hover:underline block" style={{ color: 'rgba(255,255,255,.5)' }}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,.2)' }}>© 2026 PetGuardian · Diana Soares Martins · Atlântica · 🇵🇹 Made in Portugal</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,.2)' }}>Projeto Final de Licenciatura · GSC</span>
          </div>
        </div>
      </footer>
    </div>
  )
}