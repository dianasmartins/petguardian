import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import imageCompression from 'browser-image-compression'

interface Review {
  id: string
  nome: string
  texto: string
  estrelas: number
  foto_url?: string | null
  created_at: string
}

export default function FamiliasFeliizes() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [estrelas, setEstrelas] = useState(5)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [totalEncontrados, setTotalEncontrados] = useState(0)
  const [totalAnimais, setTotalAnimais] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        supabase.from('profiles').select('nome').eq('id', session.user.id).single()
          .then(({ data }) => { if (data?.nome) setNome(data.nome) })
      }
    })
    fetchReviews()
    supabase.from('animais').select('id', { count: 'exact' }).eq('estado', 'encontrado')
      .then(({ count }) => setTotalEncontrados(count || 0))
    supabase.from('animais').select('id', { count: 'exact' })
      .then(({ count }) => setTotalAnimais(count || 0))
  }, [])

  const fetchReviews = async () => {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (error) console.error('Erro reviews:', error)
    setReviews(data || [])
    setLoading(false)
  }

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 400 })
      setFoto(compressed)
      setFotoPreview(URL.createObjectURL(compressed))
    } catch {
      setFoto(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !texto.trim()) { setErro('Nome e texto são obrigatórios.'); return }
    setEnviando(true)
    setErro('')

    let foto_url = null
    if (foto && session) {
      const ext = foto.name.split('.').pop()
      const path = 'reviews/' + session.user.id + '-' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, foto)
      if (!uploadError) foto_url = supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('reviews').insert({
      nome: nome.trim(), texto: texto.trim(), estrelas, foto_url,
      user_id: session?.user?.id || null
    })

    if (error) { setErro('Erro ao publicar: ' + error.message); setEnviando(false); return }

    await fetchReviews()
    setTexto('')
    setFoto(null)
    setFotoPreview(null)
    setMostrarForm(false)
    setEnviando(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>

      {/* Hero */}
      <section className="py-20 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider"
            style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Histórias reais
          </div>
          <h1 className="text-5xl font-black mb-5" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Famílias Felizes 🎉
          </h1>
          <p className="text-xl mb-3" style={{ color: '#4d7c0f' }}>
            Histórias reais de famílias que reuniram os seus animais com o PetGuardian
          </p>
          <p className="text-base" style={{ color: '#6b7280' }}>
            Tens uma história para partilhar? Conta-nos como foi o reencontro.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#365314' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 py-6 px-6">
          {[
            { value: totalEncontrados, label: 'Animais encontrados' },
            { value: reviews.length, label: 'Histórias partilhadas' },
            { value: totalAnimais > 0 ? Math.round((totalEncontrados / totalAnimais) * 100) + '%' : '0%', label: 'Taxa de sucesso' },
          ].map(s => (
            <div key={s.label} className="text-center px-4">
              <div className="text-4xl font-black" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: '#86efac' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-16">

        {/* CTA partilhar */}
        {session && !mostrarForm && (
          <div className="text-center mb-14">
            <button onClick={() => setMostrarForm(true)}
              className="px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:-translate-y-0.5"
              style={{ background: '#ea580c', boxShadow: '0 4px 14px rgba(234,88,12,.25)' }}>
              ✍️ Partilhar a minha história
            </button>
          </div>
        )}

        {!session && (
          <div className="text-center mb-14 bg-white rounded-2xl p-6 border" style={{ borderColor: '#d9f99d' }}>
            <p className="text-stone-500 mb-3">Reuniste o teu animal? Partilha a história!</p>
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#65a30d' }}>
              Faz login para partilhar →
            </Link>
          </div>
        )}

        {/* Formulário */}
        {session && mostrarForm && (
          <div className="bg-white rounded-2xl border p-7 mb-14 max-w-2xl mx-auto" style={{ borderColor: '#d9f99d' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#365314' }}>A tua história de reencontro</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                  style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Classificação *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setEstrelas(n)}
                      className="text-3xl transition-transform hover:scale-110"
                      style={{ color: n <= estrelas ? '#f59e0b' : '#e5e7eb' }}>★</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>A tua história *</label>
                <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4} required
                  placeholder="Conta-nos como foi o reencontro com o teu animal..."
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm resize-none focus:outline-none"
                  style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>
                  Foto do reencontro (opcional)
                </label>
                {fotoPreview ? (
                  <div className="relative w-32 h-32">
                    <img src={fotoPreview} className="w-full h-full object-cover rounded-xl border-2" style={{ borderColor: '#d9f99d' }} />
                    <button type="button" onClick={() => { setFoto(null); setFotoPreview(null) }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed rounded-xl px-6 py-4 text-sm transition-colors hover:bg-lime-50 flex items-center gap-2"
                    style={{ borderColor: '#d9f99d', color: '#4d7c0f' }}>
                    📷 <span>Adicionar foto do reencontro</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
              </div>

              {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setMostrarForm(false); setErro('') }}
                  className="flex-1 border-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ borderColor: '#d9f99d', color: '#365314' }}>Cancelar</button>
                <button type="submit" disabled={enviando}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: '#65a30d' }}>
                  {enviando ? 'A publicar...' : 'Partilhar história'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-20 text-stone-400">A carregar histórias...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#365314' }}>Sê o primeiro a partilhar!</h2>
            <p style={{ color: '#4d7c0f' }}>As histórias de reencontro vão aparecer aqui.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map(review => (
              <div key={review.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all"
                style={{ borderColor: '#d9f99d' }}>
                {review.foto_url && (
                  <img src={review.foto_url} alt={review.nome} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ color: i < review.estrelas ? '#f59e0b' : '#e5e7eb', fontSize: 18 }}>★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-5 italic" style={{ color: '#4d7c0f' }}>
                    "{review.texto}"
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#d9f99d' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ background: '#ecfccb', color: '#365314' }}>
                      {review.nome[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#365314' }}>{review.nome}</div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>
                        {new Date(review.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  )
}