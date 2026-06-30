import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import imageCompression from 'browser-image-compression'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClick({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

interface ResultadoIA {
  especie: string
  raca_estimada: string
  cor_principal: string
  tamanho: string
  caracteristicas_distintivas: string[]
  confianca: number
}

interface AnimalMatch {
  id: string
  nome: string
  especie: string
  raca: string | null
  cor: string
  foto_url: string | null
  score: number
}

type Passo = 'ia' | 'resultados' | 'formulario' | 'sucesso'

function iconeEspecie(especie: string) {
  switch (especie) {
    case 'gato': return '🐈'
    case 'ave': return '🦜'
    case 'coelho': return '🐰'
    case 'roedor': return '🐹'
    case 'reptil': return '🦎'
    case 'outro': return '🐾'
    default: return '🐕'
  }
}

export default function AnimaisEncontrados() {
  const [session, setSession] = useState<any>(null)
  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [passo, setPasso] = useState<Passo>('ia')

  // IA
  const [fotoIA, setFotoIA] = useState<File | null>(null)
  const [fotoIAPreview, setFotoIAPreview] = useState<string | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [resultadoIA, setResultadoIA] = useState<ResultadoIA | null>(null)
  const [matches, setMatches] = useState<AnimalMatch[]>([])
  const [erroIA, setErroIA] = useState('')

  // Formulário
  const [nome, setNome] = useState('')
  const [especie, setEspecie] = useState('cao')
  const [cor, setCor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fileIARef = useRef<HTMLInputElement>(null)
  const fileFotoRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        navigate('/registo')
      } else {
        setVerificandoSessao(false)
      }
    })
  }, [])

  const handleFotoIA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200 })
      setFotoIA(compressed)
      setFotoIAPreview(URL.createObjectURL(compressed))
    } catch {
      setFotoIA(file)
      setFotoIAPreview(URL.createObjectURL(file))
    }
  }

  const analisarComIA = async () => {
    if (!fotoIA) { setErroIA('Carrega uma foto primeiro.'); return }
    setAnalisando(true)
    setErroIA('')

    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
    let caracteristicas: ResultadoIA | null = null

    if (GEMINI_KEY) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(fotoIA)
        })
        const prompt = 'Analisa esta imagem de um animal de estimação. Responde EXCLUSIVAMENTE em JSON válido, sem texto adicional. Estrutura: {"especie": string, "raca_estimada": string, "cor_principal": string, "tamanho": "pequeno" ou "medio" ou "grande", "caracteristicas_distintivas": [string], "confianca": number entre 0 e 1}'
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: fotoIA.type, data: base64 } }] }] })
        })
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        caracteristicas = JSON.parse(text.replace(/```json|```/g, '').trim())
      } catch { caracteristicas = null }
    } else {
      // Demo sem chave
      caracteristicas = { especie: 'cao', raca_estimada: 'Labrador', cor_principal: 'dourado', tamanho: 'grande', caracteristicas_distintivas: ['pelo curto', 'orelhas caídas'], confianca: 0.85 }
    }

    setResultadoIA(caracteristicas)

    // Normaliza espécie para garantir que cão/gato/etc nunca correspondem a outras espécies
    const normalizarEspecie = (s: string) => {
      const v = (s || '').toLowerCase()
      if (v.includes('cão') || v.includes('cao') || v.includes('dog')) return 'cao'
      if (v.includes('gato') || v.includes('cat')) return 'gato'
      if (v.includes('ave') || v.includes('papagaio') || v.includes('periquito') || v.includes('canário') || v.includes('canario') || v.includes('bird') || v.includes('pássaro') || v.includes('passaro')) return 'ave'
      if (v.includes('coelho') || v.includes('rabbit')) return 'coelho'
      if (v.includes('hamster') || v.includes('rato') || v.includes('roedor') || v.includes('porquinho')) return 'roedor'
      if (v.includes('tartaruga') || v.includes('réptil') || v.includes('reptil') || v.includes('lagarto')) return 'reptil'
      return 'outro'
    }
    const espIANormalizada = normalizarEspecie(caracteristicas?.especie || '')

    // Procurar correspondências na base de dados
    const { data: animais } = await supabase
      .from('animais')
      .select('id, nome, especie, raca, cor, foto_url, caracteristicas_ia')
      .eq('estado', 'desaparecido')

    const scored: AnimalMatch[] = (animais || [])
      .filter((a: any) => normalizarEspecie(a.especie) === espIANormalizada && espIANormalizada !== 'outro')
      .map((a: any) => {
        let score = 0
        if (caracteristicas && a.caracteristicas_ia) {
          score += 40 // espécie já confirmada igual pelo filter acima
          if (a.caracteristicas_ia.cor_principal?.toLowerCase().includes(caracteristicas.cor_principal?.toLowerCase())) score += 25
          if (a.cor?.toLowerCase().includes(caracteristicas.cor_principal?.toLowerCase())) score += 15
          if (a.caracteristicas_ia.raca_estimada?.toLowerCase().includes(caracteristicas.raca_estimada?.toLowerCase())) score += 20
        } else if (caracteristicas) {
          score += 30 // espécie já confirmada igual pelo filter acima
          if (a.cor?.toLowerCase().includes(caracteristicas.cor_principal?.toLowerCase())) score += 20
        }
        return { id: a.id, nome: a.nome, especie: a.especie, raca: a.raca, cor: a.cor, foto_url: a.foto_url, score }
      }).filter((a: AnimalMatch) => a.score >= 30).sort((a: AnimalMatch, b: AnimalMatch) => b.score - a.score).slice(0, 4)

    setMatches(scored)
    if (caracteristicas) setCor(caracteristicas.cor_principal || '')
    if (caracteristicas) setEspecie(['cao', 'gato', 'ave', 'coelho', 'roedor', 'reptil'].includes(espIANormalizada) ? espIANormalizada : 'outro')
    setPasso('resultados')
    setAnalisando(false)
  }

  const handleFotoFormulario = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200 })
      setFoto(compressed)
      setFotoPreview(URL.createObjectURL(compressed))
    } catch {
      setFoto(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); mostrarToast('Localização obtida!', 'sucesso') },
      () => mostrarToast('Não foi possível obter GPS.', 'erro')
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lat || !lng) { mostrarToast('Selecciona a localização no mapa.', 'erro'); return }
    setLoading(true)

    const fotoParaUpload = foto || fotoIA
    let foto_url = null
    if (fotoParaUpload && session) {
      const ext = fotoParaUpload.name.split('.').pop()
      const path = session.user.id + '/encontrado-' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, fotoParaUpload)
      if (!uploadError) foto_url = supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('animais').insert({
      dono_id: session.user.id,
      nome: nome || 'Animal encontrado',
      especie, cor, descricao,
      estado: 'encontrado_rua',
      latitude: lat, longitude: lng,
      foto_url
    })

    if (error) { mostrarToast('Erro ao registar. Tenta novamente.', 'erro'); setLoading(false); return }
    setPasso('sucesso')
    setLoading(false)
  }

  if (verificandoSessao) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7fee7' }}>
      <div className="text-center">
        <div className="text-4xl mb-3">🐾</div>
        <div className="text-sm font-semibold" style={{ color: '#365314' }}>A verificar sessão...</div>
      </div>
    </div>
  )

  if (passo === 'sucesso') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f7fee7' }}>
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full text-center border" style={{ borderColor: '#d9f99d' }}>
        <div className="text-6xl mb-4">🐾</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>Animal registado!</h2>
        <p className="text-stone-500 mb-2">O animal foi adicionado à plataforma.</p>
        <p className="text-stone-400 text-sm mb-8">Se o dono o estiver à procura, vai conseguir encontrá-lo aqui.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/animais')} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: '#65a30d' }}>Ver animais</button>
          <button onClick={() => navigate('/mapa')} className="flex-1 border-2 py-3 rounded-xl font-semibold text-sm" style={{ borderColor: '#d9f99d', color: '#365314' }}>Ver mapa</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="mb-10">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Encontrei um animal
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Encontraste um animal perdido?
          </h1>
          <p className="text-lg" style={{ color: '#4d7c0f' }}>
            Primeiro vamos tentar identificar se já está registado na plataforma.
          </p>
        </div>

        {/* Indicador de passos */}
        <div className="flex gap-0 mb-10">
          {[
            { n: 1, label: 'Identificar com IA', passo: 'ia' },
            { n: 2, label: 'Ver correspondências', passo: 'resultados' },
            { n: 3, label: 'Registar se necessário', passo: 'formulario' },
          ].map((s) => {
            const passos = ['ia', 'resultados', 'formulario', 'sucesso']
            const atual = passos.indexOf(passo)
            const este = passos.indexOf(s.passo)
            const done = atual > este
            const active = atual === este
            return (
              <div key={s.n} className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-colors ${active ? 'border-lime-600 text-lime-800' : done ? 'border-lime-400 text-lime-600' : 'border-stone-200 text-stone-400'
                }`}>
                {done ? '✓ ' : ''}{s.label}
              </div>
            )
          })}
        </div>

        {/* PASSO 1: IA */}
        {passo === 'ia' && (
          <div className="bg-white rounded-2xl border p-8 max-w-xl mx-auto" style={{ borderColor: '#d9f99d' }}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🤖</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#365314' }}>Identificar com IA</h2>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Carrega uma foto do animal. A IA analisa as características e procura correspondências com animais desaparecidos registados.
              </p>
            </div>

            {fotoIAPreview ? (
              <div className="relative mb-6">
                <img src={fotoIAPreview} alt="Animal encontrado" className="w-full h-56 object-cover rounded-2xl border-2" style={{ borderColor: '#d9f99d' }} />
                <button onClick={() => { setFotoIA(null); setFotoIAPreview(null) }}
                  className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full text-sm font-bold">✕</button>
              </div>
            ) : (
              <div onClick={() => fileIARef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:bg-lime-50 transition-colors mb-6"
                style={{ borderColor: '#d9f99d' }}>
                <div className="text-5xl mb-3">📷</div>
                <p className="font-semibold mb-1" style={{ color: '#365314' }}>Carregar foto do animal</p>
                <p className="text-sm" style={{ color: '#9ca3af' }}>JPG, PNG · máx. 5MB</p>
              </div>
            )}

            <input ref={fileIARef} type="file" accept="image/*" onChange={handleFotoIA} className="hidden" />

            {erroIA && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-4">{erroIA}</div>}

            <div className="flex flex-col gap-3">
              <button onClick={analisarComIA} disabled={analisando || !fotoIA}
                className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-50 transition-all"
                style={{ background: '#65a30d' }}>
                {analisando ? '🤖 A analisar...' : '🤖 Analisar com IA'}
              </button>
              <button onClick={() => setPasso('formulario')}
                className="w-full py-3 rounded-xl font-semibold text-sm border-2 transition-colors"
                style={{ borderColor: '#d9f99d', color: '#6b7280' }}>
                Saltar — registar directamente sem IA
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: RESULTADOS */}
        {passo === 'resultados' && (
          <div className="flex flex-col gap-6">
            {/* Características detectadas */}
            {resultadoIA && (
              <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#d9f99d' }}>
                <h2 className="font-bold text-lg mb-4" style={{ color: '#365314' }}>🤖 Características detectadas pela IA</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Espécie', value: resultadoIA.especie },
                    { label: 'Raça estimada', value: resultadoIA.raca_estimada },
                    { label: 'Cor', value: resultadoIA.cor_principal },
                    { label: 'Tamanho', value: resultadoIA.tamanho },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#ecfccb' }}>
                      <div className="text-xs mb-1" style={{ color: '#4d7c0f' }}>{item.label}</div>
                      <div className="font-semibold text-sm capitalize" style={{ color: '#365314' }}>{item.value || '—'}</div>
                    </div>
                  ))}
                </div>
                {resultadoIA.caracteristicas_distintivas?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resultadoIA.caracteristicas_distintivas.map((c, idx) => (
                      <span key={idx} className="text-xs px-3 py-1 rounded-full" style={{ background: '#f7fee7', color: '#365314', border: '1px solid #d9f99d' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Correspondências */}
            {matches.length > 0 ? (
              <div>
                <h2 className="font-bold text-xl mb-2" style={{ color: '#365314' }}>
                  🎯 {matches.length} possível{matches.length > 1 ? 'is' : ''} correspondência{matches.length > 1 ? 's' : ''} encontrada{matches.length > 1 ? 's' : ''}
                </h2>
                <p className="text-sm mb-5" style={{ color: '#4d7c0f' }}>
                  Reconheces algum destes animais? Clica para ver o perfil e contactar o dono.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {matches.map(m => (
                    <Link key={m.id} to={`/animais/${m.id}`}
                      className="bg-white rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all"
                      style={{ borderColor: m.score >= 60 ? '#65a30d' : '#d9f99d' }}>
                      <div className="h-36 bg-lime-50 flex items-center justify-center overflow-hidden">
                        {m.foto_url
                          ? <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                          : <span className="text-4xl">{iconeEspecie(m.especie)}</span>
                        }
                      </div>
                      <div className="p-3">
                        <div className="font-bold text-sm mb-0.5" style={{ color: '#365314' }}>{m.nome}</div>
                        <div className="text-xs mb-2" style={{ color: '#6b7280' }}>{m.cor}</div>
                        <div className="text-xs font-bold px-2 py-0.5 rounded-full text-center"
                          style={{ background: m.score >= 60 ? '#dcfce7' : '#f7fee7', color: m.score >= 60 ? '#15803d' : '#4d7c0f' }}>
                          {m.score}% correspondência
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPasso('formulario')}
                    className="flex-1 py-3 rounded-xl font-semibold text-white"
                    style={{ background: '#ea580c' }}>
                    Nenhum corresponde — registar animal
                  </button>
                  <button onClick={() => setPasso('ia')}
                    className="border-2 px-6 py-3 rounded-xl font-semibold text-sm"
                    style={{ borderColor: '#d9f99d', color: '#365314' }}>
                    ← Nova análise
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: '#d9f99d' }}>
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#365314' }}>Nenhuma correspondência encontrada</h2>
                <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
                  Este animal não parece estar registado na plataforma. Regista-o para que o dono o possa encontrar.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setPasso('formulario')}
                    className="px-8 py-3 rounded-xl font-semibold text-white"
                    style={{ background: '#65a30d' }}>
                    Registar animal encontrado →
                  </button>
                  <button onClick={() => setPasso('ia')}
                    className="border-2 px-6 py-3 rounded-xl font-semibold text-sm"
                    style={{ borderColor: '#d9f99d', color: '#365314' }}>
                    ← Tentar outra foto
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASSO 3: FORMULÁRIO */}
        {passo === 'formulario' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 flex flex-col gap-5" style={{ borderColor: '#d9f99d' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg" style={{ color: '#365314' }}>Dados do animal encontrado</h2>
                <button type="button" onClick={() => setPasso(resultadoIA ? 'resultados' : 'ia')}
                  className="text-sm hover:underline" style={{ color: '#65a30d' }}>← Voltar</button>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Nome/Alcunha (se tiver coleira)</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Sem identificação"
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Espécie *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['cao', '🐕 Cão'], ['gato', '🐈 Gato'], ['ave', '🦜 Ave'],
                    ['coelho', '🐰 Coelho'], ['roedor', '🐹 Roedor'], ['outro', '🐾 Outro'],
                  ].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setEspecie(val)}
                      className="py-3 rounded-xl text-sm font-semibold border-2 transition-colors"
                      style={{ borderColor: especie === val ? '#65a30d' : '#d9f99d', background: especie === val ? '#ecfccb' : 'white', color: especie === val ? '#365314' : '#6b7280' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Cor</label>
                <input value={cor} onChange={e => setCor(e.target.value)} placeholder="Ex: Castanho e branco"
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                  placeholder="Coleira, marcas, comportamento, onde foi encontrado..."
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm resize-none focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: '#365314' }}>Foto</label>
                {fotoIAPreview && !fotoPreview && (
                  <div className="mb-2 flex items-center gap-2 text-xs p-2 rounded-xl" style={{ background: '#ecfccb', color: '#365314' }}>
                    <img src={fotoIAPreview} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <span>A usar a foto da análise IA. Podes substituir abaixo.</span>
                  </div>
                )}
                {fotoPreview
                  ? <div className="relative"><img src={fotoPreview} className="w-full h-40 object-cover rounded-xl" /><button type="button" onClick={() => { setFoto(null); setFotoPreview(null) }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs font-bold">✕</button></div>
                  : <label className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:bg-lime-50 transition-colors flex items-center gap-3 justify-center" style={{ borderColor: '#d9f99d' }}>
                    <span className="text-2xl">📷</span>
                    <span className="text-sm" style={{ color: '#4d7c0f' }}>Adicionar {fotoIAPreview ? 'outra ' : ''}foto</span>
                    <input ref={fileFotoRef} type="file" accept="image/*" onChange={handleFotoFormulario} className="hidden" />
                  </label>
                }
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold" style={{ color: '#365314' }}>Onde foi encontrado? *</label>
                <button type="button" onClick={handleGPS} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
                  📍 Usar GPS automático
                </button>
                {lat && lng && <div className="text-xs px-3 py-2 rounded-xl" style={{ background: '#ecfccb', color: '#365314' }}>✓ {lat.toFixed(4)}°N, {lng.toFixed(4)}°W</div>}
                <p className="text-xs" style={{ color: '#9ca3af' }}>Ou clica no mapa →</p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
                style={{ background: '#ea580c' }}>
                {loading ? 'A registar...' : '🐾 Registar animal encontrado'}
              </button>
            </form>

            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#d9f99d' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: '#d9f99d' }}>
                <h3 className="font-bold" style={{ color: '#365314' }}>Clica no mapa para marcar o local</h3>
              </div>
              <div style={{ height: 480 }}>
                <MapContainer center={[39.5, -8.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                  <MapClick onMapClick={(lt, ln) => { setLat(lt); setLng(ln) }} />
                  {lat && lng && <Marker position={[lat, lng]} />}
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}