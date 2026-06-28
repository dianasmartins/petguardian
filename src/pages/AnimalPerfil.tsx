import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import type { Animal, Avistamento } from '../types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Ícone vermelho — local de desaparecimento
const iconeVermelho = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#DC2626" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
})

// Ícone laranja numerado — avistamentos
function iconeAvistamento(num: number) {
    return L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="14" fill="#F97316" stroke="white" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="Arial">${num}</text>
    </svg>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    })
}

interface Mensagem {
    id: string
    animal_id: string
    sender_id: string
    conteudo: string
    created_at: string
    profiles?: { nome: string }
}

interface Dono {
    id: string
    nome: string
    telemovel: string | null
}

type Tab = 'perfil' | 'avistamentos' | 'chat'

export default function AnimalPerfil() {
    const { id } = useParams<{ id: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [animal, setAnimal] = useState<Animal | null>(null)
    const [dono, setDono] = useState<Dono | null>(null)
    const [avistamentos, setAvistamentos] = useState<Avistamento[]>([])
    const [fotosAdicionais, setFotosAdicionais] = useState<string[]>([])
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [novaMensagem, setNovaMensagem] = useState('')
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [tab, setTab] = useState<Tab>('perfil')
    const chatEndRef = useRef<HTMLDivElement>(null)
    const { mostrarToast } = useToast()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
        fetchAnimal()
        const tabParam = searchParams.get('tab')
        if (tabParam === 'chat') setTab('chat')
    }, [id])

    useEffect(() => {
        if (tab === 'chat') {
            fetchMensagens()
            const channel = supabase
                .channel('chat-' + id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'mensagens',
                    filter: `animal_id=eq.${id}`
                }, () => fetchMensagens())
                .subscribe()
            return () => { supabase.removeChannel(channel) }
        }
    }, [tab, id])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagens])

    const fetchAnimal = async () => {
        const { data: animalData } = await supabase.from('animais').select('*').eq('id', id).single()
        if (!animalData) { setLoading(false); return }
        setAnimal(animalData)
        const { data: donoData } = await supabase.from('profiles').select('*').eq('id', animalData.dono_id).single()
        setDono(donoData)
        const { data: avsData } = await supabase.from('avistamentos').select('*').eq('animal_id', id).order('created_at', { ascending: true })
        setAvistamentos(avsData || [])

        const { data: fotosData } = await supabase.from('animal_fotos').select('foto_url, ordem').eq('animal_id', id).order('ordem', { ascending: true })
        setFotosAdicionais((fotosData || []).map((f: any) => f.foto_url))
        setLoading(false)
    }

    const fetchMensagens = async () => {
        const { data } = await supabase
            .from('mensagens')
            .select('*, profiles(nome)')
            .eq('animal_id', id)
            .order('created_at', { ascending: true })
        setMensagens(data || [])
    }

    const enviarMensagem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!novaMensagem.trim() || !session) return
        setEnviando(true)
        const { error } = await supabase.from('mensagens').insert({
            animal_id: id,
            sender_id: session.user.id,
            conteudo: novaMensagem.trim()
        })
        if (error) {
            mostrarToast('Erro ao enviar mensagem.', 'erro')
        } else {
            setNovaMensagem('')
            fetchMensagens()
        }
        setEnviando(false)
    }

    if (loading) return <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>
    if (!animal) return <div className="flex items-center justify-center h-96 text-stone-400">Animal não encontrado.</div>

    const estadoBadge = () => {
        if (animal.estado === 'desaparecido') return <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full">⚠ Desaparecido</span>
        if (animal.estado === 'avistado') return <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">👁 Avistado</span>
        return <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full">✓ Encontrado</span>
    }

    const polylinePoints: [number, number][] = avistamentos
        .filter(a => a.latitude && a.longitude)
        .map(a => [a.latitude, a.longitude])

    const isDono = session?.user?.id === animal.dono_id

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-4xl mx-auto px-4 py-10">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
                    <Link to="/animais" className="hover:text-green-700">Animais</Link>
                    <span>›</span>
                    <span className="text-stone-700">{animal.nome}</span>
                </div>

                {/* Header */}
                <div className="bg-white rounded-3xl border border-stone-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-6">

                        {/* Foto quadrada */}
                        <div className="flex-shrink-0 mx-auto md:mx-0">
                            <div className="w-52 h-52 rounded-2xl overflow-hidden bg-green-50 flex items-center justify-center border border-stone-200 shadow-sm">
                                {animal.foto_url
                                    ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                                    : <span className="text-8xl">{animal.especie === 'gato' ? '🐈' : '🐕'}</span>
                                }
                            </div>
                        </div>

                        {/* Informações */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h1 className="text-3xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{animal.nome}</h1>
                                    {animal.estado === 'desaparecido' && (
                                        <div className="flex-shrink-0 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                                            ⚠ DESAPARECIDO
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {estadoBadge()}
                                    <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
                                        {animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Animal'}
                                        {animal.raca && ` · ${animal.raca}`}
                                    </span>
                                    <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">{animal.cor}</span>
                                    <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-full">👁 {avistamentos.length} avistamentos</span>
                                </div>

                                {animal.descricao && (
                                    <p className="text-stone-600 text-sm leading-relaxed mb-4 bg-stone-50 rounded-xl p-3 border border-stone-100">
                                        {animal.descricao}
                                    </p>
                                )}

                                <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-5">
                                    <span>📅</span>
                                    <span>Desaparecido desde {new Date(animal.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>

                            {/* Botões de ação */}
                            <div className="flex flex-wrap gap-2">
                                {animal.estado !== 'encontrado' && (
                                    <Link to={`/avistamento/${animal.id}`}
                                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm flex items-center gap-2">
                                        👁 Reportar avistamento
                                    </Link>
                                )}
                                <button onClick={() => {
                                    if (!session) { navigate('/login'); return }
                                    if (dono) navigate('/mensagens?iniciar=' + dono.id + '&animal=' + animal.id)
                                }}
                                    className="bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm flex items-center gap-2">
                                    💬 Contactar dono
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
                        { id: 'chat', label: `💬 Mensagens (${mensagens.length})` },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as Tab)}
                            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-0.5 ${tab === t.id ? 'border-green-600 text-green-700' : 'border-transparent text-stone-500 hover:text-stone-800'
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
                                    { label: 'Espécie', value: animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Outro' },
                                    { label: 'Raça', value: animal.raca || 'Desconhecida' },
                                    { label: 'Cor', value: animal.cor },
                                    { label: 'Estado', value: animal.estado },
                                    { label: 'Desaparecido desde', value: new Date(animal.created_at).toLocaleDateString('pt-PT') },
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
                            {/* Dono */}
                            <div className="bg-white rounded-2xl border border-stone-200 p-5">
                                <h2 className="font-bold text-stone-900 mb-4">👤 Dono do animal</h2>
                                {dono ? (
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            {dono.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-stone-900">{dono.nome}</div>
                                            {dono.telemovel && !isDono && (
                                                <div className="text-sm text-stone-500 mt-0.5">📱 {dono.telemovel}</div>
                                            )}
                                            {isDono && <div className="text-xs text-green-700 font-medium mt-1">Este é o teu animal</div>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-stone-400 text-sm mb-4">Informação do dono não disponível</div>
                                )}
                                {/* Botão para enviar msg — leva para tab chat */}
                                <button onClick={() => setTab('chat')}
                                    className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                                    💬 {isDono ? 'Ver mensagens' : 'Enviar mensagem ao dono'}
                                </button>
                            </div>

                            {/* Mapa localização */}
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
                                        className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                                        Ser o primeiro a reportar
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Mapa com cores distintas */}
                                {(animal.latitude || avistamentos.some(a => a.latitude)) && (
                                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                                        <div className="px-5 py-4 border-b border-stone-100">
                                            <h2 className="font-bold text-stone-900">🗺 Percurso do animal</h2>
                                            <p className="text-xs text-stone-400 mt-0.5">Do local de desaparecimento até ao avistamento mais recente</p>
                                        </div>
                                        <div className="h-72">
                                            <MapContainer
                                                center={animal.latitude && animal.longitude
                                                    ? [animal.latitude, animal.longitude]
                                                    : [avistamentos[0].latitude, avistamentos[0].longitude]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                                {/* Marcador vermelho — local de desaparecimento */}
                                                {animal.latitude && animal.longitude && (
                                                    <Marker position={[animal.latitude, animal.longitude]} icon={iconeVermelho}>
                                                        <Popup>
                                                            <div className="text-sm font-semibold text-red-700">📍 Local de desaparecimento</div>
                                                            <div className="text-xs text-stone-500 mt-1">{new Date(animal.created_at).toLocaleDateString('pt-PT')}</div>
                                                        </Popup>
                                                    </Marker>
                                                )}

                                                {/* Marcadores laranja numerados — avistamentos */}
                                                {avistamentos.filter(a => a.latitude && a.longitude).map((av, i) => (
                                                    <Marker key={av.id} position={[av.latitude, av.longitude]} icon={iconeAvistamento(i + 1)}>
                                                        <Popup>
                                                            <div className="text-sm font-semibold text-green-800">👁 Avistamento #{i + 1}</div>
                                                            <div className="text-xs text-stone-500 mt-1">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                                                            {av.descricao && <div className="text-xs text-stone-600 mt-1">{av.descricao}</div>}
                                                        </Popup>
                                                    </Marker>
                                                ))}

                                                {/* Polilinha laranja tracejada */}
                                                {polylinePoints.length > 1 && (
                                                    <Polyline positions={polylinePoints} color="#16a34a" weight={3} dashArray="8,5" opacity={0.8} />
                                                )}
                                            </MapContainer>
                                        </div>
                                        {/* Legenda */}
                                        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center gap-6 text-xs text-stone-500">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
                                                Local de desaparecimento
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                                                Avistamentos (numerados)
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-green-600 font-bold">▬▬</span>
                                                Percurso
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Lista de avistamentos */}
                                <div className="flex flex-col gap-4">
                                    {avistamentos.map((av, i) => (
                                        <div key={av.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="font-semibold text-stone-900 text-sm">Avistamento #{i + 1}</div>
                                                        <div className="text-xs text-stone-400">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                                                    </div>
                                                    {av.descricao && <p className="text-sm text-stone-600 mb-3 leading-relaxed">{av.descricao}</p>}
                                                    {av.foto_url && <img src={av.foto_url} alt={`Avistamento ${i + 1}`} className="h-40 rounded-xl object-cover mb-3" />}
                                                    {av.latitude && av.longitude && (
                                                        <div className="text-xs text-stone-400">📍 {av.latitude.toFixed(4)}°N, {av.longitude.toFixed(4)}°W</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {animal.estado !== 'encontrado' && (
                                    <div className="text-center">
                                        <Link to={`/avistamento/${animal.id}`}
                                            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                                            + Reportar novo avistamento
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* TAB: MENSAGENS */}
                {tab === 'chat' && (
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100">
                            <h2 className="font-bold text-stone-900">💬 Mensagens sobre {animal.nome}</h2>
                            <p className="text-xs text-stone-400 mt-0.5">
                                {isDono ? 'Responde às mensagens de voluntários e pessoas que viram o teu animal'
                                    : `Envia uma mensagem directamente ao dono de ${animal.nome}`}
                            </p>
                        </div>

                        {/* Mensagens */}
                        <div className="h-80 overflow-y-auto p-5 flex flex-col gap-3 bg-stone-50">
                            {mensagens.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                                    <div className="text-4xl">💬</div>
                                    <p className="text-stone-500 text-sm">
                                        {isDono
                                            ? 'Ainda não tens mensagens sobre este animal.'
                                            : `Ainda não há mensagens. Envia uma mensagem ao dono de ${animal.nome}!`}
                                    </p>
                                </div>
                            ) : (
                                mensagens.map(msg => {
                                    const isMinha = msg.sender_id === session?.user?.id
                                    const isDonoAnimal = msg.sender_id === animal.dono_id
                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isMinha ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDonoAnimal ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-700'
                                                }`}>
                                                {(msg.profiles?.nome || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className={`max-w-xs flex flex-col gap-1 ${isMinha ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-2 ${isMinha ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-semibold text-stone-500">{msg.profiles?.nome || 'Utilizador'}</span>
                                                    {isDonoAnimal && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Dono</span>
                                                    )}
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMinha
                                                        ? 'bg-green-600 text-white rounded-tr-sm'
                                                        : 'bg-white text-stone-800 border border-stone-200 rounded-tl-sm'
                                                    }`}>
                                                    {msg.conteudo}
                                                </div>
                                                <div className="text-xs text-stone-400">
                                                    {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-stone-200">
                            {session ? (
                                <form onSubmit={enviarMensagem} className="flex gap-3">
                                    <input
                                        type="text"
                                        value={novaMensagem}
                                        onChange={e => setNovaMensagem(e.target.value)}
                                        placeholder={isDono ? 'Responde a um voluntário...' : `Escreve uma mensagem ao dono de ${animal.nome}...`}
                                        className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-2xl focus:border-green-500 focus:outline-none text-sm"
                                    />
                                    <button type="submit" disabled={enviando || !novaMensagem.trim()}
                                        className="bg-green-600 text-white px-5 py-3 rounded-2xl font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors">
                                        {enviando ? '...' : '→'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-3">
                                    <p className="text-stone-500 text-sm mb-3">Faz login para enviar uma mensagem ao dono</p>
                                    <Link to="/login" className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                                        Entrar
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}