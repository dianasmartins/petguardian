import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import imageCompression from 'browser-image-compression'
import { iconeEspecie } from '../lib/especies'
import { NOTIF_AVISTAMENTOS_KEY, NOTIF_MENSAGENS_KEY } from '../components/Navbar'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const iconeVermelho = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="22" height="33">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#DC2626" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`,
  className: '', iconSize: [22, 33], iconAnchor: [11, 33], popupAnchor: [0, -33],
})

const iconeLaranja = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26">
    <circle cx="16" cy="16" r="14" fill="#F97316" stroke="white" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-size="15" fill="white">👁</text>
  </svg>`,
  className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13],
})

interface Stats {
  animaisRegistados: number
  animaisReunidos: number
  avistamentosReportados: number
}

interface MeuAnimal {
  id: string
  nome: string
  foto_url: string | null
  especie: string
  cor: string
  estado: string
  created_at: string
  latitude: number | null
  longitude: number | null
}

interface MeuAvistamento {
  id: string
  created_at: string
  latitude: number | null
  longitude: number | null
  animais?: { nome: string; foto_url: string | null; especie: string } | null
}

interface EventoTimeline {
  data: string
  icon: string
  texto: string
  cor: string
}

export default function Perfil() {
  const [nome, setNome] = useState('')
  const [telemovel, setTelemovel] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [novaFoto, setNovaFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [emailVerificado, setEmailVerificado] = useState(false)
  const [membroDesde, setMembroDesde] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ animaisRegistados: 0, animaisReunidos: 0, avistamentosReportados: 0 })
  const [meusAnimais, setMeusAnimais] = useState<MeuAnimal[]>([])
  const [meusAvistamentos, setMeusAvistamentos] = useState<MeuAvistamento[]>([])
  const [timeline, setTimeline] = useState<EventoTimeline[]>([])
  const [loading, setLoading] = useState(true)

  // Preferências de notificação
  const [notifAvistamentos, setNotifAvistamentos] = useState(true)
  const [notifMensagens, setNotifMensagens] = useState(true)
  const [permissaoPush, setPermissaoPush] = useState<NotificationPermission | 'indisponivel'>('default')

  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    const fetchPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)
      setEmail(user.email || '')
      setEmailVerificado(!!user.email_confirmed_at)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setNome(data.nome || '')
        setTelemovel(data.telemovel || '')
        setFotoPerfil(data.foto_url || null)
        setFotoPreview(data.foto_url || null)
        setMembroDesde(data.created_at || user.created_at || null)
      } else {
        setMembroDesde(user.created_at || null)
      }

      // Animais registados pelo utilizador
      const { data: animais } = await supabase
        .from('animais')
        .select('id, nome, foto_url, especie, cor, estado, created_at, latitude, longitude')
        .eq('dono_id', user.id)
        .order('created_at', { ascending: false })
      setMeusAnimais(animais || [])

      // Ocorrências correspondentes (para saber quando cada animal foi reunido)
      let ocorrencias: { animal_id: string; resolvida_at: string | null }[] = []
      if (animais && animais.length > 0) {
        const { data: ocs } = await supabase
          .from('ocorrencias')
          .select('animal_id, resolvida_at')
          .in('animal_id', animais.map(a => a.id))
        ocorrencias = ocs || []
      }

      // Avistamentos reportados pelo utilizador
      const { data: avistamentos } = await supabase
        .from('avistamentos')
        .select('id, created_at, latitude, longitude, animais(nome, foto_url, especie)')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
      setMeusAvistamentos((avistamentos as any) || [])

      setStats({
        animaisRegistados: animais?.length || 0,
        animaisReunidos: animais?.filter(a => a.estado === 'encontrado').length || 0,
        avistamentosReportados: avistamentos?.length || 0,
      })

      // Construir linha do tempo de atividade
      const eventos: EventoTimeline[] = []
        ; (animais || []).forEach(a => {
          eventos.push({ data: a.created_at, icon: '📝', texto: `Registaste ${a.nome} como desaparecido`, cor: 'bg-red-100' })
        })
      ocorrencias.forEach(o => {
        if (o.resolvida_at) {
          const animal = (animais || []).find(a => a.id === o.animal_id)
          eventos.push({ data: o.resolvida_at, icon: '🎉', texto: `${animal?.nome || 'Um animal'} foi reunido com a família!`, cor: 'bg-lime-100' })
        }
      })
        ; (avistamentos || []).forEach((av: any) => {
          eventos.push({ data: av.created_at, icon: '👁', texto: `Reportaste um avistamento de ${av.animais?.nome || 'um animal'}`, cor: 'bg-amber-100' })
        })
      eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      setTimeline(eventos.slice(0, 8))

      setLoading(false)
    }
    fetchPerfil()

    // Preferências de notificação (guardadas localmente)
    setNotifAvistamentos(localStorage.getItem(NOTIF_AVISTAMENTOS_KEY) !== 'false')
    setNotifMensagens(localStorage.getItem(NOTIF_MENSAGENS_KEY) !== 'false')
    if (typeof Notification !== 'undefined') setPermissaoPush(Notification.permission)
    else setPermissaoPush('indisponivel')
  }, [])

  const alternarNotifAvistamentos = () => {
    const novo = !notifAvistamentos
    setNotifAvistamentos(novo)
    localStorage.setItem(NOTIF_AVISTAMENTOS_KEY, String(novo))
  }

  const alternarNotifMensagens = () => {
    const novo = !notifMensagens
    setNotifMensagens(novo)
    localStorage.setItem(NOTIF_MENSAGENS_KEY, String(novo))
  }

  const pedirPermissaoPush = async () => {
    if (typeof Notification === 'undefined') return
    const resultado = await Notification.requestPermission()
    setPermissaoPush(resultado)
  }

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { mostrarToast('Foto muito grande. Máximo 5MB.', 'erro'); return }
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise(r => { img.onload = r })
    const ratio = img.width / img.height
    if (ratio < 0.5 || ratio > 2) {
      mostrarToast('Recomendamos uma foto próxima do formato quadrado.', 'info')
    }
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 400, useWebWorker: true })
      setNovaFoto(compressed)
      setFotoPreview(URL.createObjectURL(compressed))
    } catch {
      setNovaFoto(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) { setErro('O nome é obrigatório.'); return }
    if (telemovel && !/^[+]?[\d\s\-()]{7,20}$/.test(telemovel)) {
      setErro('Número de telemóvel inválido.')
      return
    }
    setGuardando(true)
    setErro('')

    let foto_url = fotoPerfil
    if (novaFoto && userId) {
      const ext = novaFoto.name.split('.').pop()
      const path = 'perfis/' + userId + '.' + ext
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, novaFoto, { upsert: true })
      if (!uploadError) {
        foto_url = supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
      }
    }

    const { error } = await supabase.from('profiles').update({ nome: nome.trim(), telemovel: telemovel || null, foto_url }).eq('id', userId)
    if (error) {
      setErro('Erro ao guardar. Tenta novamente.')
    } else {
      setFotoPerfil(foto_url)
      mostrarToast('Perfil atualizado!', 'sucesso')
    }
    setGuardando(false)
  }

  const dataFormatada = membroDesde
    ? new Date(membroDesde).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : null

  const estadoBadge = (estado: string) => {
    if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Desaparecido</span>
    if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Avistado</span>
    return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full">Encontrado</span>
  }

  const pontosMapa = [
    ...meusAnimais.filter(a => a.latitude && a.longitude).map(a => ({ tipo: 'animal' as const, lat: a.latitude!, lng: a.longitude!, nome: a.nome })),
    ...meusAvistamentos.filter(av => av.latitude && av.longitude).map(av => ({ tipo: 'avistamento' as const, lat: av.latitude!, lng: av.longitude!, nome: av.animais?.nome || 'Animal' })),
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-8" style={{ fontFamily: 'Georgia, serif' }}>O meu perfil</h1>

        {/* Cabeçalho / resumo + selo de confiança */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-green-100 flex items-center justify-center border-2 border-green-200 flex-shrink-0">
              {fotoPreview
                ? <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                : <span className="text-2xl text-green-600">{nome ? nome[0].toUpperCase() : '?'}</span>
              }
            </div>
            <div className="min-w-0">
              <div className="font-bold text-lg text-stone-900 truncate">{nome || 'Utilizador'}</div>
              <div className="text-sm text-stone-400 truncate">{email}</div>
            </div>
          </div>

          {/* Selo de confiança */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {dataFormatada && (
              <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                🗓 Membro desde {dataFormatada}
              </span>
            )}
            {emailVerificado && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">✅ Email verificado</span>
            )}
            {telemovel && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">📱 Telemóvel registado</span>
            )}
            {stats.animaisReunidos > 0 && (
              <span className="text-xs bg-lime-100 text-lime-800 px-2.5 py-1 rounded-full font-semibold">
                🏆 Herói comunitário
              </span>
            )}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-stone-100">
            <div className="text-center">
              <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                {loading ? '…' : stats.animaisRegistados}
              </div>
              <div className="text-xs text-stone-400 mt-1">Animais registados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-lime-700" style={{ fontFamily: 'Georgia, serif' }}>
                {loading ? '…' : stats.animaisReunidos}
              </div>
              <div className="text-xs text-stone-400 mt-1">Reunidos 🎉</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                {loading ? '…' : stats.avistamentosReportados}
              </div>
              <div className="text-xs text-stone-400 mt-1">Avistamentos reportados</div>
            </div>
          </div>
        </div>

        {/* Herói comunitário — banner de destaque */}
        {!loading && stats.animaisReunidos > 0 && (
          <div className="rounded-2xl p-5 mb-6 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #365314, #4d7c0f)' }}>
            <div className="text-4xl flex-shrink-0">🏆</div>
            <div>
              <div className="font-bold text-white">És um herói comunitário!</div>
              <div className="text-sm text-lime-100 mt-0.5">
                Já ajudaste a reunir {stats.animaisReunidos} família{stats.animaisReunidos > 1 ? 's' : ''} com os seus animais. Obrigada por fazeres parte disto. 💛
              </div>
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link to="/ocorrencias"
            className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:border-lime-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-xs font-semibold text-stone-700">Ocorrências</div>
          </Link>
          <Link to="/mensagens"
            className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:border-lime-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-1">💬</div>
            <div className="text-xs font-semibold text-stone-700">Mensagens</div>
          </Link>
          <Link to="/definicoes"
            className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:border-lime-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-1">⚙️</div>
            <div className="text-xs font-semibold text-stone-700">Definições</div>
          </Link>
        </div>

        {/* Os meus animais */}
        {!loading && meusAnimais.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-900">🐾 Os meus animais</h2>
              <Link to="/ocorrencias" className="text-xs text-lime-700 font-semibold hover:underline">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {meusAnimais.slice(0, 8).map(a => (
                <Link key={a.id} to={`/animais/${a.id}`}
                  className="rounded-xl border border-stone-200 overflow-hidden hover:shadow-sm transition-all">
                  <div className="h-20 bg-lime-50 flex items-center justify-center overflow-hidden">
                    {a.foto_url
                      ? <img src={a.foto_url} alt={a.nome} className="w-full h-full object-cover" />
                      : <span className="text-3xl">{iconeEspecie(a.especie)}</span>
                    }
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold text-stone-900 truncate">{a.nome}</div>
                    <div className="mt-1">{estadoBadge(a.estado)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mapa pessoal */}
        {!loading && pontosMapa.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">🗺 O meu mapa</h2>
              <p className="text-xs text-stone-400 mt-0.5">Animais que registaste e locais onde reportaste avistamentos</p>
            </div>
            <div className="h-64">
              <MapContainer center={[pontosMapa[0].lat, pontosMapa[0].lng]} zoom={7} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                {pontosMapa.map((p, i) => (
                  <Marker key={i} position={[p.lat, p.lng]} icon={p.tipo === 'animal' ? iconeVermelho : iconeLaranja}>
                    <Popup>
                      <div className="text-sm font-semibold">
                        {p.tipo === 'animal' ? `📍 ${p.nome} (o teu animal)` : `👁 Avistamento de ${p.nome}`}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="px-5 py-2.5 text-xs text-stone-400 bg-stone-50 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>Os teus animais</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>Avistamentos que reportaste</span>
            </div>
          </div>
        )}

        {/* Linha do tempo de atividade */}
        {!loading && timeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
            <h2 className="font-bold text-stone-900 mb-4">📅 A tua atividade</h2>
            <div className="flex flex-col gap-0">
              {timeline.map((ev, i) => (
                <div key={i} className="flex gap-3 pb-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 z-10 ${ev.cor}`}>{ev.icon}</div>
                  {i < timeline.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-stone-100"></div>}
                  <div className="pt-1">
                    <div className="text-sm text-stone-700">{ev.texto}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{new Date(ev.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferências de notificação */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <h2 className="font-bold text-stone-900 mb-1">🔔 Preferências de notificação</h2>
          <p className="text-stone-400 text-sm mb-4">Escolhe o que queres ser avisado enquanto usas a plataforma.</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
              <div>
                <div className="font-medium text-stone-900 text-sm">Novos avistamentos</div>
                <div className="text-xs text-stone-400 mt-0.5">Avisa-me quando alguém reportar um avistamento de um dos meus animais</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={notifAvistamentos} onChange={alternarNotifAvistamentos} className="sr-only peer" />
                <div className="w-10 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            <div className="flex items-start justify-between gap-4 py-3 border-b border-stone-100">
              <div>
                <div className="font-medium text-stone-900 text-sm">Novas mensagens</div>
                <div className="text-xs text-stone-400 mt-0.5">Avisa-me quando receber uma mensagem</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={notifMensagens} onChange={alternarNotifMensagens} className="sr-only peer" />
                <div className="w-10 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <div className="font-medium text-stone-900 text-sm">Notificações push do browser</div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {permissaoPush === 'granted' && '✓ Ativas neste dispositivo'}
                  {permissaoPush === 'denied' && 'Bloqueadas — ativa nas definições do browser'}
                  {permissaoPush === 'default' && 'Ainda não ativaste'}
                  {permissaoPush === 'indisponivel' && 'Não disponível neste dispositivo'}
                </div>
              </div>
              {permissaoPush === 'default' && (
                <button onClick={pedirPermissaoPush}
                  className="text-xs bg-lime-700 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-lime-800 transition-colors flex-shrink-0">
                  Ativar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Editar informações */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-5">✏️ Editar informações</h2>

          <form onSubmit={handleGuardar} className="flex flex-col gap-5">

            {/* Foto de perfil */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-full overflow-hidden bg-green-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-200"
                >
                  {fotoPreview
                    ? <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                    : <span className="text-3xl text-green-600">{nome ? nome[0].toUpperCase() : '?'}</span>
                  }
                </div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-700 transition-colors shadow-md">
                  ✏️
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700">Foto de perfil</p>
                <p className="text-xs text-stone-400 mt-0.5">Formato quadrado recomendado · máx. 5MB · JPG ou PNG</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFoto} className="hidden" />
            </div>

            <div className="border-t border-stone-100 pt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-500">Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} required
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-500">Telemóvel</label>
                <input value={telemovel}
                  onChange={e => setTelemovel(e.target.value.replace(/[^\d+\s\-()]/g, '').slice(0, 20))}
                  placeholder="+351 912 345 678"
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
                <p className="text-xs text-stone-400">Aceita formatos internacionais (+351, +44, +1, etc.)</p>
              </div>
            </div>

            {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}

            <button type="submit" disabled={guardando}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60">
              {guardando ? 'A guardar...' : 'Guardar alterações'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}