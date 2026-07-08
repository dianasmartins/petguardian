import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { gerarCartazPDF } from '../lib/gerarQRCode'
import type { Animal, Avistamento } from '../types'
import { iconeEspecie, nomeEspecie } from '../lib/especies'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const iconeVermelho = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#DC2626" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`,
  className: '', iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36],
})

function iconeAvistamento(num: number) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#F97316" stroke="white" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="Arial">${num}</text>
    </svg>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16],
  })
}

function iconeAvistamentoSelecionado(num: number) {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="17" fill="#F97316" stroke="white" stroke-width="3"/>
      <circle cx="20" cy="20" r="17" fill="none" stroke="#F97316" stroke-width="2" opacity="0.4">
        <animate attributeName="r" from="17" to="22" dur="1s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
      </circle>
      <text x="20" y="26" text-anchor="middle" font-size="16" font-weight="bold" fill="white" font-family="Arial">${num}</text>
    </svg>`,
    className: '', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20],
  })
}

function MapFocus({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { duration: 0.8 })
    }
  }, [lat, lng])
  return null
}

interface Dono {
  id: string
  nome: string
  telemovel: string | null
  foto_url?: string | null
  created_at?: string | null
  animaisReunidos?: number
}

type Tab = 'perfil' | 'avistamentos'

export default function AnimalPerfil() {
  const { id } = useParams<{ id: string }>()
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [dono, setDono] = useState<Dono | null>(null)
  const [ocorrencia, setOcorrencia] = useState<{ resolvida_at: string | null; created_at: string } | null>(null)
  const [avistamentos, setAvistamentos] = useState<Avistamento[]>([])
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('perfil')
  const [mostrarModalEstado, setMostrarModalEstado] = useState(false)
  const [novoEstadoSelecionado, setNovoEstadoSelecionado] = useState<string | null>(null)
  const [avistamentoSelecionado, setAvistamentoSelecionado] = useState<string | null>(null)
  const markerRefs = useRef<Record<string, any>>({})
  const [distanciaEncontrado, setDistanciaEncontrado] = useState('')
  const [formaEncontrado, setFormaEncontrado] = useState('pelo_site')
  const [aplicandoEstado, setAplicandoEstado] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    fetchAnimal()
    const tabParam = searchParams.get('tab')
    if (tabParam === 'avistamentos') setTab('avistamentos')
  }, [id])

  const fetchAnimal = async () => {
    const { data: animalData } = await supabase.from('animais').select('*').eq('id', id).single()
    if (!animalData) { setLoading(false); return }
    setAnimal(animalData)
    const { data: donoData } = await supabase.from('profiles').select('id, nome, telemovel, foto_url, created_at').eq('id', animalData.dono_id).maybeSingle()
    if (donoData) {
      const { data: animaisDono } = await supabase.from('animais').select('estado').eq('dono_id', animalData.dono_id)
      setDono({ ...donoData, animaisReunidos: animaisDono?.filter(a => a.estado === 'encontrado').length || 0 })
    } else {
      setDono(null)
    }
    const { data: ocorrenciaData } = await supabase.from('ocorrencias').select('resolvida_at, created_at').eq('animal_id', id).maybeSingle()
    setOcorrencia(ocorrenciaData)
    const { data: avsData } = await supabase.from('avistamentos').select('*').eq('animal_id', id).order('created_at', { ascending: true })
    setAvistamentos(avsData || [])
    setLoading(false)
  }

  const handleGerarCartaz = async () => {
    mostrarToast('A gerar cartaz...', 'info')
    try {
      await gerarCartazPDF(animal as any, window.location.origin)
      mostrarToast('Cartaz aberto — usa Ctrl+P para imprimir!', 'sucesso')
    } catch {
      mostrarToast('Erro ao gerar cartaz.', 'erro')
    }
  }

  const abrirModalEstado = () => {
    setNovoEstadoSelecionado(animal?.estado || null)
    setMostrarModalEstado(true)
  }

  const aplicarNovoEstado = async () => {
    if (!animal || !novoEstadoSelecionado || novoEstadoSelecionado === animal.estado) return
    setAplicandoEstado(true)
    const agora = new Date().toISOString()

    await supabase.from('animais').update({ estado: novoEstadoSelecionado }).eq('id', animal.id)

    let atualizacaoOcorrencia: Record<string, any>
    if (novoEstadoSelecionado === 'encontrado') atualizacaoOcorrencia = { estado: 'resolvida', resolvida_at: agora }
    else if (novoEstadoSelecionado === 'avistado') atualizacaoOcorrencia = { estado: 'com_avistamentos', resolvida_at: null }
    else atualizacaoOcorrencia = { estado: 'aberta', resolvida_at: null }
    await supabase.from('ocorrencias').update(atualizacaoOcorrencia).eq('animal_id', animal.id)

    mostrarToast('Estado do animal atualizado!', 'sucesso')
    setMostrarModalEstado(false)
    setNovoEstadoSelecionado(null)
    setAplicandoEstado(false)
    fetchAnimal()
  }


  if (loading) return <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>
  if (!animal) return <div className="flex items-center justify-center h-96 text-stone-400">Animal não encontrado.</div>

  const estadoBadge = () => {
    if (animal.estado === 'desaparecido') return <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full">⚠ Desaparecido</span>
    if (animal.estado === 'avistado') return <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">👁 Avistado</span>
    return <span className="bg-lime-100 text-lime-800 text-sm font-bold px-3 py-1.5 rounded-full">✓ Encontrado</span>
  }

  const polylinePoints: [number, number][] = [
    ...(animal.latitude && animal.longitude ? [[animal.latitude, animal.longitude] as [number, number]] : []),
    ...avistamentos.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number])
  ]

  const isDono = session?.user?.id === animal.dono_id

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
          <Link to="/animais" className="hover:text-lime-800">Animais</Link>
          <span>›</span>
          <span className="text-stone-700">{animal.nome}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div className="w-52 h-52 rounded-2xl overflow-hidden bg-lime-50 flex items-center justify-center border border-stone-200 shadow-sm">
                {animal.foto_url
                  ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                  : <span className="text-8xl">{iconeEspecie(animal.especie)}</span>
                }
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h1 className="text-3xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{animal.nome}</h1>
                  {animal.estado === 'desaparecido' && (
                    <div className="flex-shrink-0 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">⚠ PERDIDO</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {estadoBadge()}
                  <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
                    {nomeEspecie(animal.especie)}
                    {animal.raca && ` · ${animal.raca}`}
                  </span>
                  <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">{animal.cor}</span>
                  <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">👁 {avistamentos.length} avistamentos</span>
                </div>
                {animal.descricao && (
                  <p className="text-stone-600 text-sm leading-relaxed mb-4 bg-stone-50 rounded-xl p-3 border border-stone-100">{animal.descricao}</p>
                )}
                {(animal as any).apelo && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-amber-700 mb-1">💛 Mensagem do dono</div>
                    <p className="text-amber-800 text-sm leading-relaxed italic">"{(animal as any).apelo}"</p>
                  </div>
                )}
                <div className="text-xs text-stone-400 mb-5 flex flex-col gap-1">
                  <span>📅 Desaparecido desde {new Date(animal.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  {animal.estado === 'encontrado' && ocorrencia?.resolvida_at && (
                    <span className="text-lime-700 font-medium">
                      ✓ Encontrado em {new Date(ocorrencia.resolvida_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {animal.estado !== 'encontrado' && (
                  <Link to={`/avistamento/${animal.id}`}
                    className="bg-lime-700 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-lime-800 transition-colors text-sm">
                    👁 Reportar avistamento
                  </Link>
                )}

                {isDono && (
                  <button onClick={abrirModalEstado}
                    className="bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm">
                    🔄 Mudar estado
                  </button>
                )}
                <button onClick={handleGerarCartaz}
                  className="bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm">
                  🖨️ Cartaz QR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b-2 border-stone-200">
          {[
            { id: 'perfil', label: '🐾 Perfil' },
            { id: 'avistamentos', label: `👁 Avistamentos (${avistamentos.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-0.5 ${tab === t.id ? 'border-lime-700 text-lime-800' : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: PERFIL */}
        {tab === 'perfil' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <h2 className="font-bold text-stone-900 mb-4">🐾 Informações do animal</h2>
              <div className="flex flex-col gap-0">
                {[
                  { label: 'Nome', value: animal.nome },
                  { label: 'Espécie', value: nomeEspecie(animal.especie) },
                  { label: 'Raça', value: animal.raca || 'Desconhecida' },
                  { label: 'Cor', value: animal.cor },
                  { label: 'Estado', value: animal.estado },
                  { label: 'Desaparecido desde', value: new Date(animal.created_at).toLocaleDateString('pt-PT') },
                  ...(animal.estado === 'encontrado' && ocorrencia?.resolvida_at
                    ? [{ label: 'Encontrado em', value: new Date(ocorrencia.resolvida_at).toLocaleDateString('pt-PT') }]
                    : []),
                  { label: 'Avistamentos', value: `${avistamentos.length} reportado${avistamentos.length !== 1 ? 's' : ''}` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-stone-100 last:border-0">
                    <span className="text-sm text-stone-500">{item.label}</span>
                    <span className="text-sm font-semibold text-stone-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-5">
                <h2 className="font-bold text-stone-900 mb-4">👤 Dono do animal</h2>
                {dono ? (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-lime-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {dono.foto_url
                        ? <img src={dono.foto_url} alt={dono.nome} className="w-full h-full object-cover" />
                        : dono.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                      }
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-900">{dono.nome.split(' ')[0]}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {dono.created_at && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                            🗓 Membro desde {new Date(dono.created_at).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {(dono.animaisReunidos || 0) > 0 && (
                          <span className="text-xs bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full font-semibold">
                            🏆 {dono.animaisReunidos} reunido{(dono.animaisReunidos || 0) > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {isDono && <div className="text-xs text-lime-800 font-medium mt-1">Este é o teu animal</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-stone-400 text-sm mb-4">Informação do dono não disponível</div>
                )}
                {!isDono && session && dono && (
                  <button onClick={() => navigate('/mensagens?iniciar=' + dono.id + '&animal=' + animal.id)}
                    className="w-full bg-lime-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-lime-800 transition-colors">
                    💬 Enviar mensagem ao dono
                  </button>
                )}
                {!session && (
                  <Link to="/login" className="block w-full text-center bg-stone-100 text-stone-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                    Entra para contactar o dono
                  </Link>
                )}
              </div>

              {/* Sharing options */}
              {animal.estado !== 'encontrado' && (
                <div className="bg-white rounded-2xl border border-stone-200 p-5">
                  <h2 className="font-bold text-stone-900 mb-3">📤 Partilhar para aumentar o alcance</h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => {
                      const txt = encodeURIComponent('🐾 *' + animal.nome + ' DESAPARECIDO!*\n\n' + nomeEspecie(animal.especie) + (animal.raca ? ' · ' + animal.raca : '') + ' · ' + animal.cor + '\n\nSe o vires:\n🔗 ' + window.location.href)
                      window.open('https://wa.me/?text=' + txt, '_blank')
                    }} className="flex items-center gap-2 bg-lime-500 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-lime-700 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      WhatsApp
                    </button>
                    <button onClick={() => window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), '_blank')}
                      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                      Facebook
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(window.location.href) }}
                      className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors">
                      🔗 Copiar link
                    </button>
                    <button onClick={handleGerarCartaz}
                      className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors">
                      🖨️ Cartaz QR
                    </button>
                  </div>
                </div>
              )}

              {animal.latitude && animal.longitude && (
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <h2 className="font-bold text-stone-900 text-sm">📍 Local de desaparecimento</h2>
                  </div>
                  <div className="h-44">
                    <MapContainer center={[animal.latitude, animal.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[animal.latitude, animal.longitude]} icon={iconeVermelho}>
                        <Popup>📍 Local de desaparecimento</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: AVISTAMENTOS */}
        {tab === 'avistamentos' && (
          <div className="flex flex-col gap-5">
            {avistamentos.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                <div className="text-5xl mb-4">👁</div>
                <p className="text-stone-500 mb-4">Ainda não há avistamentos reportados.</p>
                {animal.estado !== 'encontrado' && (
                  <Link to={`/avistamento/${animal.id}`}
                    className="bg-lime-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">
                    Ser o primeiro a reportar
                  </Link>
                )}
              </div>
            ) : (
              <>
                {(animal.latitude || avistamentos.some(a => a.latitude)) && (
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-100">
                      <h2 className="font-bold text-stone-900">🗺 Trajeto dos avistamentos</h2>
                      <p className="text-xs text-stone-400 mt-0.5">Clica num avistamento na lista para o destacar no mapa</p>
                    </div>
                    <div className="h-72">
                      <MapContainer
                        center={animal.latitude && animal.longitude
                          ? [animal.latitude, animal.longitude]
                          : [avistamentos[0].latitude, avistamentos[0].longitude]}
                        zoom={13} style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {animal.latitude && animal.longitude && (
                          <Marker position={[animal.latitude, animal.longitude]} icon={iconeVermelho}>
                            <Popup><div className="text-sm font-semibold text-red-700">📍 Local de desaparecimento</div></Popup>
                          </Marker>
                        )}
                        {avistamentos.filter(a => a.latitude && a.longitude).map((av, i) => (
                          <Marker
                            key={av.id}
                            position={[av.latitude, av.longitude]}
                            icon={avistamentoSelecionado === av.id ? iconeAvistamentoSelecionado(i + 1) : iconeAvistamento(i + 1)}
                            ref={(ref) => { if (ref) markerRefs.current[av.id] = ref }}
                            eventHandlers={{ click: () => setAvistamentoSelecionado(av.id) }}
                          >
                            <Popup>
                              <div className="text-sm font-semibold text-orange-700">👁 Avistamento #{i + 1}</div>
                              <div className="text-xs text-stone-500 mt-1">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                              {av.descricao && <div className="text-xs text-stone-600 mt-1">{av.descricao}</div>}
                            </Popup>
                          </Marker>
                        ))}
                        {polylinePoints.length > 1 && (
                          <Polyline positions={polylinePoints} color="#16a34a" weight={4} opacity={0.85} />
                        )}
                        {avistamentoSelecionado && (() => {
                          const av = avistamentos.find(a => a.id === avistamentoSelecionado)
                          return av && av.latitude && av.longitude ? <MapFocus lat={av.latitude} lng={av.longitude} /> : null
                        })()}
                      </MapContainer>
                    </div>
                    <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center gap-6 text-xs text-stone-500">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>Local de desaparecimento</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>Avistamentos</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-green-600"></span>Trajeto</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {avistamentos.map((av, i) => (
                    <button
                      key={av.id}
                      onClick={() => setAvistamentoSelecionado(av.id)}
                      className={`bg-white rounded-2xl border p-5 text-left transition-all ${avistamentoSelecionado === av.id ? 'border-orange-400 ring-2 ring-orange-100' : 'border-stone-200 hover:border-orange-200'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5 transition-colors ${avistamentoSelecionado === av.id ? 'bg-orange-600' : 'bg-orange-500'
                          }`}>{i + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="font-semibold text-stone-900 text-sm">
                              Avistamento #{i + 1}
                              {av.latitude && av.longitude && (
                                <span className="ml-2 text-xs font-normal text-orange-600">📍 Ver no mapa</span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                          </div>
                          {av.descricao && <p className="text-sm text-stone-600 mb-3 leading-relaxed">{av.descricao}</p>}
                          {av.foto_url && <img src={av.foto_url} alt={`Avistamento ${i + 1}`} className="h-40 rounded-xl object-cover mb-3" />}
                          {av.latitude && av.longitude && (
                            <div className="text-xs text-stone-400">📍 {av.latitude.toFixed(4)}°N, {av.longitude.toFixed(4)}°W</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {animal.estado !== 'encontrado' && (
                  <div className="text-center">
                    <Link to={`/avistamento/${animal.id}`}
                      className="bg-lime-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">
                      + Reportar novo avistamento
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal mudar estado do animal */}
      {mostrarModalEstado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-stone-900 text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              🔄 Mudar estado de {animal.nome}
            </h2>
            <p className="text-stone-500 text-sm mb-5">Estado atual: {estadoBadge()}</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-500">Novo estado</label>
                <div className="flex flex-col gap-2">
                  {[
                    ['desaparecido', '⚠ Desaparecido'],
                    ['avistado', '👁 Avistado'],
                    ['encontrado', '✓ Encontrado'],
                  ].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setNovoEstadoSelecionado(val)}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-colors text-left flex items-center justify-between ${novoEstadoSelecionado === val ? 'border-lime-700 bg-lime-50 text-lime-800' : 'border-stone-200 text-stone-600'
                        }`}>
                      <span>{label}</span>
                      {animal.estado === val && <span className="text-xs font-normal text-stone-400">atual</span>}
                    </button>
                  ))}
                </div>
              </div>

              {novoEstadoSelecionado === 'encontrado' && animal.estado !== 'encontrado' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-stone-500">Como foi encontrado? <span className="text-stone-400 font-normal">(opcional)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['pelo_site', '🐾 Pelo PetGuardian'],
                        ['redes_sociais', '📱 Redes sociais'],
                        ['encontrado_pessoalmente', '🚶 Pessoalmente'],
                        ['outra', '💡 Outra forma'],
                      ].map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setFormaEncontrado(val)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-colors text-left ${formaEncontrado === val ? 'border-lime-700 bg-lime-50 text-lime-800' : 'border-stone-200 text-stone-600'
                            }`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-stone-500">A quantos km do local? (opcional)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={distanciaEncontrado} onChange={e => setDistanciaEncontrado(e.target.value)}
                        placeholder="Ex: 2.5" min="0" step="0.1"
                        className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
                      <span className="text-stone-500 text-sm font-medium">km</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setMostrarModalEstado(false); setNovoEstadoSelecionado(null) }}
                  className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 text-sm">Cancelar</button>
                <button type="button" onClick={aplicarNovoEstado}
                  disabled={aplicandoEstado || !novoEstadoSelecionado || novoEstadoSelecionado === animal.estado}
                  className="flex-1 bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 disabled:opacity-60 text-sm">
                  {aplicandoEstado ? 'A guardar...' : '✓ Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}