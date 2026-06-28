import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
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
    const [animal, setAnimal] = useState<Animal | null>(null)
    const [dono, setDono] = useState<Dono | null>(null)
    const [avistamentos, setAvistamentos] = useState<Avistamento[]>([])
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [novaMensagem, setNovaMensagem] = useState('')
    const [session, setSession] = useState<any>(null)
    const [nomeUtilizador, setNomeUtilizador] = useState('')
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [tab, setTab] = useState<Tab>('perfil')
    const chatEndRef = useRef<HTMLDivElement>(null)
    const { mostrarToast } = useToast()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) {
                supabase.from('profiles').select('nome').eq('id', session.user.id).single()
                    .then(({ data }) => { if (data) setNomeUtilizador(data.nome) })
            }
        })
        fetchAnimal()
    }, [id])

    useEffect(() => {
        if (tab === 'chat') {
            fetchMensagens()
            const channel = supabase
                .channel('chat-' + id)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `animal_id=eq.${id}` },
                    () => fetchMensagens())
                .subscribe()
            return () => { supabase.removeChannel(channel) }
        }
    }, [tab, id])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagens])

    const fetchAnimal = async () => {
        const { data: animalData } = await supabase
            .from('animais').select('*').eq('id', id).single()
        if (!animalData) { setLoading(false); return }
        setAnimal(animalData)

        const { data: donoData } = await supabase
            .from('profiles').select('*').eq('id', animalData.dono_id).single()
        setDono(donoData)

        const { data: avsData } = await supabase
            .from('avistamentos').select('*').eq('animal_id', id).order('created_at', { ascending: true })
        setAvistamentos(avsData || [])

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

    if (loading) return (
        <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>
    )

    if (!animal) return (
        <div className="flex items-center justify-center h-96 text-stone-400">Animal não encontrado.</div>
    )

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
                    <Link to="/animais" className="hover:text-orange-600">Animais</Link>
                    <span>›</span>
                    <span className="text-stone-700">{animal.nome}</span>
                </div>

                {/* Header do animal */}
                <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden mb-6">
                    {/* Foto banner */}
                    <div className="h-48 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center overflow-hidden">
                        {animal.foto_url
                            ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                            : <span className="text-8xl">{animal.especie === 'gato' ? '🐈' : '🐕'}</span>
                        }
                    </div>

                    <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-3xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                                    {animal.nome}
                                </h1>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {estadoBadge()}
                                    <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
                                        {animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Animal'}
                                        {animal.raca && ` · ${animal.raca}`}
                                    </span>
                                    <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">{animal.cor}</span>
                                    <span className="bg-stone-100 text-stone-600 text-xs font-medium px-2 py-1 rounded-full">
                                        👁 {avistamentos.length} avistamentos
                                    </span>
                                </div>
                            </div>
                            {animal.estado !== 'encontrado' && (
                                <Link to={`/avistamento/${animal.id}`}
                                    className="flex-shrink-0 bg-orange-600 text-white px-5 py-3 rounded-2xl font-semibold hover:bg-orange-700 transition-colors text-sm">
                                    👁 Reportar avistamento
                                </Link>
                            )}
                        </div>

                        {animal.descricao && (
                            <p className="text-stone-600 text-sm leading-relaxed mb-4 bg-stone-50 rounded-2xl p-4">
                                {animal.descricao}
                            </p>
                        )}

                        <div className="text-xs text-stone-400">
                            Desaparecido desde {new Date(animal.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 mb-6 border-b-2 border-stone-200">
                    {[
                        { id: 'perfil', label: '🐾 Perfil' },
                        { id: 'avistamentos', label: `👁 Avistamentos (${avistamentos.length})` },
                        { id: 'chat', label: '💬 Chat com o dono' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as Tab)}
                            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-0.5 ${tab === t.id
                                    ? 'border-orange-600 text-orange-600'
                                    : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* TAB: PERFIL */}
                {tab === 'perfil' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Info do animal */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-5">
                            <h2 className="font-bold text-stone-900 mb-4">🐾 Informações do animal</h2>
                            <div className="flex flex-col gap-3">
                                {[
                                    { label: 'Nome', value: animal.nome },
                                    { label: 'Espécie', value: animal.especie === 'cao' ? 'Cão' : animal.especie === 'gato' ? 'Gato' : 'Outro' },
                                    { label: 'Raça', value: animal.raca || 'Desconhecida' },
                                    { label: 'Cor', value: animal.cor },
                                    { label: 'Estado', value: animal.estado },
                                    { label: 'Desaparecido desde', value: new Date(animal.created_at).toLocaleDateString('pt-PT') },
                                    { label: 'Avistamentos', value: `${avistamentos.length} reportado${avistamentos.length !== 1 ? 's' : ''}` },
                                ].map(item => (
                                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
                                        <span className="text-sm text-stone-500">{item.label}</span>
                                        <span className="text-sm font-semibold text-stone-900">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info do dono */}
                        <div className="flex flex-col gap-4">
                            <div className="bg-white rounded-2xl border border-stone-200 p-5">
                                <h2 className="font-bold text-stone-900 mb-4">👤 Dono do animal</h2>
                                {dono ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            {dono.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-stone-900">{dono.nome}</div>
                                            {dono.telemovel && !isDono && (
                                                <div className="text-sm text-stone-500 mt-0.5">📱 {dono.telemovel}</div>
                                            )}
                                            {isDono && (
                                                <div className="text-xs text-orange-600 font-medium mt-1">Este é o teu animal</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-stone-400 text-sm">Informação do dono não disponível</div>
                                )}
                                {!isDono && (
                                    <button onClick={() => setTab('chat')}
                                        className="w-full mt-4 bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">
                                        💬 Enviar mensagem ao dono
                                    </button>
                                )}
                            </div>

                            {/* Localização */}
                            {animal.latitude && animal.longitude && (
                                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-stone-100">
                                        <h2 className="font-bold text-stone-900 text-sm">📍 Local de desaparecimento</h2>
                                    </div>
                                    <div className="h-44">
                                        <MapContainer center={[animal.latitude, animal.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <Marker position={[animal.latitude, animal.longitude]} />
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
                                        className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                                        Ser o primeiro a reportar
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Mapa de trajeto */}
                                {avistamentos.some(a => a.latitude && a.longitude) && (
                                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                                        <div className="px-5 py-4 border-b border-stone-100">
                                            <h2 className="font-bold text-stone-900">🗺 Trajeto dos avistamentos</h2>
                                            <p className="text-xs text-stone-400 mt-0.5">Percurso aparente do animal ao longo do tempo</p>
                                        </div>
                                        <div className="h-64">
                                            <MapContainer
                                                center={animal.latitude && animal.longitude
                                                    ? [animal.latitude, animal.longitude]
                                                    : [avistamentos[0].latitude, avistamentos[0].longitude]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                {animal.latitude && animal.longitude && (
                                                    <Marker position={[animal.latitude, animal.longitude]} />
                                                )}
                                                {avistamentos.filter(a => a.latitude && a.longitude).map((av, i) => (
                                                    <Marker key={av.id} position={[av.latitude, av.longitude]} />
                                                ))}
                                                {polylinePoints.length > 1 && (
                                                    <Polyline positions={polylinePoints} color="#f97316" weight={3} dashArray="6,4" />
                                                )}
                                            </MapContainer>
                                        </div>
                                        <div className="px-4 py-2 bg-stone-50 text-xs text-stone-400">
                                            🔵 Local de desaparecimento · 🔵 Avistamentos · <span className="text-orange-500">▬▬</span> Trajeto
                                        </div>
                                    </div>
                                )}

                                {/* Lista de avistamentos */}
                                <div className="flex flex-col gap-4">
                                    {avistamentos.map((av, i) => (
                                        <div key={av.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="font-semibold text-stone-900 text-sm">Avistamento #{i + 1}</div>
                                                        <div className="text-xs text-stone-400">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                                                    </div>
                                                    {av.descricao && (
                                                        <p className="text-sm text-stone-600 mb-3 leading-relaxed">{av.descricao}</p>
                                                    )}
                                                    {av.foto_url && (
                                                        <img src={av.foto_url} alt={`Avistamento ${i + 1}`}
                                                            className="h-40 rounded-xl object-cover mb-3" />
                                                    )}
                                                    {av.latitude && av.longitude && (
                                                        <div className="text-xs text-stone-400">
                                                            📍 {av.latitude.toFixed(4)}°N, {av.longitude.toFixed(4)}°W
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {animal.estado !== 'encontrado' && (
                                    <div className="text-center">
                                        <Link to={`/avistamento/${animal.id}`}
                                            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                                            + Reportar novo avistamento
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* TAB: CHAT */}
                {tab === 'chat' && (
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100">
                            <h2 className="font-bold text-stone-900">💬 Chat sobre {animal.nome}</h2>
                            <p className="text-xs text-stone-400 mt-0.5">
                                Fala directamente com o dono ou com outros voluntários
                            </p>
                        </div>

                        {/* Mensagens */}
                        <div className="h-96 overflow-y-auto p-5 flex flex-col gap-3 bg-stone-50">
                            {mensagens.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
                                    Ainda não há mensagens. Sê o primeiro a escrever!
                                </div>
                            ) : (
                                mensagens.map(msg => {
                                    const isMinha = msg.sender_id === session?.user?.id
                                    const isDonoAnimal = msg.sender_id === animal.dono_id
                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isMinha ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDonoAnimal ? 'bg-orange-600 text-white' : 'bg-stone-300 text-stone-700'
                                                }`}>
                                                {(msg.profiles?.nome || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className={`max-w-xs ${isMinha ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                                <div className={`flex items-center gap-2 ${isMinha ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-semibold text-stone-600">
                                                        {msg.profiles?.nome || 'Utilizador'}
                                                    </span>
                                                    {isDonoAnimal && (
                                                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Dono</span>
                                                    )}
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMinha
                                                        ? 'bg-orange-600 text-white rounded-tr-sm'
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

                        {/* Input de mensagem */}
                        <div className="p-4 border-t border-stone-200">
                            {session ? (
                                <form onSubmit={enviarMensagem} className="flex gap-3">
                                    <input
                                        type="text"
                                        value={novaMensagem}
                                        onChange={e => setNovaMensagem(e.target.value)}
                                        placeholder="Escreve uma mensagem..."
                                        className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-2xl focus:border-orange-500 focus:outline-none text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={enviando || !novaMensagem.trim()}
                                        className="bg-orange-600 text-white px-5 py-3 rounded-2xl font-semibold hover:bg-orange-700 disabled:opacity-60 transition-colors"
                                    >
                                        {enviando ? '...' : '→'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center py-3">
                                    <p className="text-stone-500 text-sm mb-3">Faz login para enviar mensagens</p>
                                    <Link to="/login" className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">
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