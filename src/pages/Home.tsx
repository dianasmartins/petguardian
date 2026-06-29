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
  const [quickTipo, setQuickTipo] = useState<'perdeu' | 'encontrou'>('perdeu')
  const [quickNome, setQuickNome] = useState('')
  const [quickMorada, setQuickMorada] = useState('')

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
        setStats({ total: data.length, encontrados: data.filter(a => a.estado === 'encontrado').length, desaparecidos: data.filter(a => a.estado === 'desaparecido').length })
      }
      const { data: revs } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(6)
      setReviews(revs || [])
    }
    fetchData()
  }, [])

  const handleRegistarAnimal = () => navigate(session ? '/registar-animal' : '/login')

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickTipo === 'encontrou') {
      navigate('/identificar')
    } else {
      navigate(session ? '/registar-animal' : '/registo')
    }
  }

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
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-24 px-4 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 bg-green-200 rounded-full opacity-20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-300 rounded-full opacity-20 blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 items-center relative z-10">
          {/* Texto esquerda */}
          <div>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-bold px-4 py-1.5 rounded-full border border-green-200 mb-8">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {stats.desaparecidos} animais perdidos agora em Portugal
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-stone-900 leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              Encontra o teu<br />
              <span className="text-green-600">companheiro</span><br />
              perdido
            </h1>
            <p className="text-lg text-stone-500 mb-10 leading-relaxed max-w-md">
              Mapa em tempo real · Identificação por IA · Comunidade portuguesa gratuita
            </p>
            <div className="flex flex-wrap gap-4 mb-6">
              <button onClick={handleRegistarAnimal}
                className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200 hover:-translate-y-0.5">
                Registar animal
              </button>
              <Link to="/mapa" className="bg-white text-green-700 border-2 border-green-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all">
                Ver mapa ao vivo
              </Link>
            </div>
            <Link to="/identificar" className="text-stone-500 text-sm hover:text-green-700 transition-colors">
              Encontrei um animal perdido 🔍
            </Link>
            {!session && (
              <p className="text-stone-400 text-sm mt-3">
                <Link to="/registo" className="text-green-600 hover:underline font-medium">Criar conta gratuita</Link> — apenas maiores de 18 anos
              </p>
            )}
          </div>

          {/* Direita — formulário rápido */}
          <div className="w-full max-w-md mx-auto md:mx-0">
            <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-7">
              <h2 className="text-2xl font-bold text-green-700 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                Criar alerta gratuito
              </h2>
              <p className="text-stone-500 text-sm mb-6">Preenche os dados e começa a alertar a comunidade agora.</p>

              <form onSubmit={handleQuickSubmit} className="flex flex-col gap-4">
                {/* Toggle perdeu / encontrou */}
                <div>
                  <label className="text-sm font-semibold text-stone-600 mb-2 block">O que aconteceu? <span className="text-red-500">*</span></label>
                  <div className="flex rounded-xl overflow-hidden border-2 border-stone-200">
                    <button type="button" onClick={() => setQuickTipo('perdeu')}
                      className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                        quickTipo === 'perdeu' ? 'bg-green-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'
                      }`}>
                      Perdi o meu animal
                    </button>
                    <button type="button" onClick={() => setQuickTipo('encontrou')}
                      className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                        quickTipo === 'encontrou' ? 'bg-green-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'
                      }`}>
                      Encontrei um animal
                    </button>
                  </div>
                </div>

                {quickTipo === 'perdeu' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-stone-600 mb-1.5 block">
                        Nome do animal <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={quickNome}
                        onChange={e => setQuickNome(e.target.value)}
                        placeholder="Ex: Bolinhas"
                        className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-stone-600 mb-1.5 block">
                        Última localização <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={quickMorada}
                        onChange={e => setQuickMorada(e.target.value)}
                        placeholder="Ex: Rua das Flores"
                        className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                )}

                {quickTipo === 'encontrou' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
                    🤖 Usa a nossa IA para identificar o animal e encontrar o dono rapidamente.
                  </div>
                )}

                <button type="submit"
                  className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-green-700 transition-all shadow-md shadow-green-200 hover:-translate-y-0.5">
                  {quickTipo === 'perdeu' ? 'Criar alerta agora 🐾' : 'Identificar animal com IA 🤖'}
                </button>

                <p className="text-center text-xs text-stone-400">
                  100% gratuito · Sem anúncios · Apenas maiores de 18 anos
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-green-600 py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0 text-center divide-x divide-green-500">
          {[
            { value: stats.desaparecidos, label: 'Perdidos' },
            { value: stats.encontrados, label: 'Reunidos com a família' },
            { value: stats.total, label: 'Animais registados' },
            { value: '87%', label: 'Taxa de sucesso' },
          ].map(stat => (
            <div key={stat.label} className="px-4 py-2">
              <div className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{stat.value}</div>
              <div className="text-green-200 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BOX INFORMATIVA */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-8 md:p-12">
            <div className="text-center mb-10">
              <span className="inline-block bg-green-500 text-green-100 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-400">Como o PetGuardian ajuda</span>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Tudo para reunir o teu animal</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🗺️', text: 'Mapa em tempo real com todos os animais desaparecidos de Portugal — visível por toda a comunidade instantaneamente' },
                { icon: '🤖', text: 'Identificação por IA — analisa a foto do animal encontrado e compara com os desaparecidos registados' },
                { icon: '📋', text: 'Regista o teu animal na base de dados portuguesa de animais perdidos, actualizada em tempo real' },
                { icon: '🖨️', text: 'Gera um cartaz A4 com QR Code para imprimir e afixar na zona do desaparecimento' },
                { icon: '📤', text: 'Partilha automática para WhatsApp, Facebook e Instagram para aumentar o alcance da pesquisa' },
                { icon: '🎉', text: 'Junta-te a centenas de famílias portuguesas que já reuniram os seus animais com a ajuda do PetGuardian' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl p-4 border border-white border-opacity-30">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <p className="text-white text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Como funciona</span>
            <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Três passos simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📝', num: '01', title: 'Regista o animal', desc: 'Foto, descrição e localização GPS. Aparece imediatamente no mapa para toda a comunidade.', cor: 'bg-green-50 border-green-200' },
              { icon: '🗺️', num: '02', title: 'Comunidade ajuda', desc: 'Voluntários reportam avistamentos com foto e localização. Recebe notificação em tempo real.', cor: 'bg-emerald-50 border-emerald-200' },
              { icon: '🤝', num: '03', title: 'Reencontro', desc: 'Acompanha a linha do tempo da ocorrência e marca o caso como resolvido quando encontrar.', cor: 'bg-teal-50 border-teal-200' },
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

      {/* REVIEWS */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-green-200">Testemunhos</span>
            <h2 className="text-4xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>O que dizem os utilizadores</h2>
          </div>
          {reviews.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {reviews.map(review => (
                <div key={review.id} className="bg-white rounded-2xl p-6 border border-stone-200 hover:border-green-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-1 mb-3">{[...Array(5)].map((_, i) => <span key={i} className={i < review.estrelas ? 'text-amber-400 text-lg' : 'text-stone-200 text-lg'}>★</span>)}</div>
                  <p className="text-stone-600 text-sm leading-relaxed mb-4">"{review.texto}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">{review.nome[0].toUpperCase()}</div>
                    <span className="font-semibold text-stone-900 text-sm">{review.nome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {reviews.length === 0 && <div className="text-center py-10 mb-10"><div className="text-5xl mb-4">💬</div><p className="text-stone-400">Ainda não há testemunhos. Sê o primeiro!</p></div>}
          {session && !mostrarFormReview && (
            <div className="text-center"><button onClick={() => setMostrarFormReview(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">✍️ Deixar um testemunho</button></div>
          )}
          {session && mostrarFormReview && (
            <form onSubmit={enviarReview} className="bg-white rounded-2xl border border-green-200 p-6 max-w-lg mx-auto">
              <h3 className="font-bold text-stone-900 mb-4">O teu testemunho</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-stone-500">Nome</label>
                  <input value={reviewNome} onChange={e => setReviewNome(e.target.value)} required className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-stone-500">Classificação</label>
                  <div className="flex gap-1">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setReviewEstrelas(n)} className={`text-2xl transition-transform hover:scale-110 ${n <= reviewEstrelas ? 'text-amber-400' : 'text-stone-200'}`}>★</button>)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-stone-500">A tua experiência</label>
                  <textarea value={reviewTexto} onChange={e => setReviewTexto(e.target.value)} rows={3} required className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setMostrarFormReview(false)} className="flex-1 border-2 border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-50">Cancelar</button>
                  <button type="submit" disabled={enviandoReview} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60">{enviandoReview ? 'A enviar...' : 'Publicar'}</button>
                </div>
              </div>
            </form>
          )}
          {!session && <div className="text-center"><p className="text-stone-400 text-sm mb-3">Faz login para deixar um testemunho</p><Link to="/login" className="text-green-700 font-semibold hover:underline text-sm">Entrar →</Link></div>}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-6">🐾</div>
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>Ajuda a reunir mais famílias</h2>
          <p className="text-green-100 text-lg mb-10">O PetGuardian é gratuito, sem anúncios e funciona em qualquer dispositivo.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/registo" className="bg-white text-green-700 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg">Criar conta gratuita</Link>
            <Link to="/animais" className="bg-green-700 text-white border-2 border-green-400 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-800 transition-all">Ver animais desaparecidos</Link>
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
          <div className="flex flex-wrap gap-6 justify-center">
            {[['/', 'Início'], ['/animais', 'Animais'], ['/mapa', 'Mapa'], ['/identificar', 'IA'], ['/estatisticas', 'Estatísticas']].map(([to, label]) => (
              <Link key={to} to={to} className="text-stone-400 hover:text-green-400 text-sm transition-colors">{label}</Link>
            ))}
          </div>
          <div className="text-stone-500 text-xs text-center">Diana Soares Martins<br />GSC · Atlântica · 2026</div>
        </div>
      </footer>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes markerPop { from{transform:scale(0) translateY(8px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
      `}</style>
    </div>
  )
}
