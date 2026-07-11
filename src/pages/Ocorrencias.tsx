import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { gerarCartazPDF } from '../lib/gerarQRCode'
import { registarNotificacoesPush, enviarNotificacaoLocal } from '../lib/notificacoes'
import { SkeletonList, SkeletonTimeline } from '../components/Skeleton'
import type { Ocorrencia, Avistamento } from '../types'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { iconeEspecie, nomeEspecie, OPCOES_ESPECIE } from '../lib/especies'
import imageCompression from 'browser-image-compression'

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

function iconeAvistamento(num: number, selecionado: boolean) {
  return L.divIcon({
    html: selecionado
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
          <circle cx="20" cy="20" r="17" fill="#F97316" stroke="white" stroke-width="3"/>
          <circle cx="20" cy="20" r="17" fill="none" stroke="#F97316" stroke-width="2" opacity="0.4">
            <animate attributeName="r" from="17" to="22" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="20" y="26" text-anchor="middle" font-size="16" font-weight="bold" fill="white" font-family="Arial">${num}</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <circle cx="16" cy="16" r="14" fill="#F97316" stroke="white" stroke-width="2"/>
          <text x="16" y="21" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="Arial">${num}</text>
        </svg>`,
    className: '', iconSize: selecionado ? [40, 40] : [32, 32], iconAnchor: selecionado ? [20, 20] : [16, 16], popupAnchor: [0, -16],
  })
}

function MapFocus({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 15, { duration: 0.8 })
  }, [lat, lng])
  return null
}

type TabPrincipal = 'meus-animais' | 'meus-avistamentos'

export default function Ocorrencias() {
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>('meus-animais')
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [meusAvistamentos, setMeusAvistamentos] = useState<any[]>([])
  const [selecionada, setSelecionada] = useState<Ocorrencia | null>(null)
  const [avistamentos, setAvistamentos] = useState<Avistamento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAvistamentos, setLoadingAvistamentos] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [confirmarArquivar, setConfirmarArquivar] = useState(false)
  const [mostrarModalEstado, setMostrarModalEstado] = useState(false)
  const [novoEstadoSelecionado, setNovoEstadoSelecionado] = useState<string | null>(null)
  const [aplicandoEstado, setAplicandoEstado] = useState(false)
  const [avistamentoSelecionado, setAvistamentoSelecionado] = useState<string | null>(null)
  const { mostrarToast } = useToast()

  // Edição de informações/características do animal
  const [editandoAnimal, setEditandoAnimal] = useState(false)
  const [guardandoAnimal, setGuardandoAnimal] = useState(false)
  const [edNome, setEdNome] = useState('')
  const [edEspecie, setEdEspecie] = useState('cao')
  const [edRaca, setEdRaca] = useState('')
  const [edCor, setEdCor] = useState('')
  const [edApelo, setEdApelo] = useState('')
  const [edDescricao, setEdDescricao] = useState('')
  const [edFotoFile, setEdFotoFile] = useState<File | null>(null)
  const [edFotoPreview, setEdFotoPreview] = useState<string | null>(null)
  const [edRemoverFoto, setEdRemoverFoto] = useState(false)
  const edFotoInputRef = useRef<HTMLInputElement>(null)

  // Fotos adicionais do animal
  const [fotosAdicionais, setFotosAdicionais] = useState<{ id: string; foto_url: string }[]>([])
  const [edFotosRemovidas, setEdFotosRemovidas] = useState<string[]>([])
  const [edFotosNovas, setEdFotosNovas] = useState<File[]>([])
  const [edFotosNovasPreviews, setEdFotosNovasPreviews] = useState<string[]>([])
  const [comprimindoFotosExtra, setComprimindoFotosExtra] = useState(false)
  const edFotosNovasInputRef = useRef<HTMLInputElement>(null)
  const MAX_FOTOS_ADICIONAIS = 5

  useEffect(() => {
    fetchTudo()
    // Pede permissão para notificações push
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => registarNotificacoesPush(), 3000)
    }
  }, [])

  useEffect(() => {
    if (!selecionada) return
    fetchAvistamentos(selecionada.animal_id)
    fetchFotosAdicionais(selecionada.animal_id)
    setConfirmarArquivar(false)
    setMostrarModalEstado(false)
    setNovoEstadoSelecionado(null)

    const channel = supabase
      .channel('avistamentos-' + selecionada.animal_id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'avistamentos',
        filter: `animal_id=eq.${selecionada.animal_id}`
      }, (payload) => {
        setAvistamentos(prev => [...prev, payload.new as Avistamento])
        fetchTudo()
        mostrarToast('Novo avistamento reportado! 👁', 'info')
        enviarNotificacaoLocal('🐾 Novo avistamento!', 'Um voluntário reportou um avistamento de um dos teus animais.', '/ocorrencias')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selecionada?.id])

  const fetchFotosAdicionais = async (animalId: string) => {
    const { data } = await supabase
      .from('animal_fotos')
      .select('id, foto_url')
      .eq('animal_id', animalId)
      .order('ordem', { ascending: true })
    setFotosAdicionais(data || [])
  }

  const fetchTudo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca ocorrências dos meus animais
    const { data: ocs } = await supabase
      .from('ocorrencias')
      .select('*, animais(*)')
      .order('created_at', { ascending: false })
    const minhas = (ocs || []).filter((o: any) => o.animais?.dono_id === user.id)
    setOcorrencias(minhas)

    // Busca avistamentos que eu reportei
    const { data: avs } = await supabase
      .from('avistamentos')
      .select('*, animais(nome, especie, cor, foto_url, estado)')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })
    setMeusAvistamentos(avs || [])

    setLoading(false)
  }

  const fetchAvistamentos = async (animalId: string) => {
    setLoadingAvistamentos(true)
    const { data } = await supabase
      .from('avistamentos')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: true })
    setAvistamentos(data || [])
    setLoadingAvistamentos(false)
  }

  const iniciarEdicaoAnimal = () => {
    if (!selecionada) return
    const animal = selecionada.animais as any
    setEdNome(animal?.nome || '')
    setEdEspecie(animal?.especie || 'cao')
    setEdRaca(animal?.raca || '')
    setEdCor(animal?.cor || '')
    setEdApelo(animal?.apelo || '')
    setEdDescricao(animal?.descricao || '')
    setEdFotoFile(null)
    setEdFotoPreview(null)
    setEdRemoverFoto(false)
    setEdFotosRemovidas([])
    setEdFotosNovas([])
    setEdFotosNovasPreviews([])
    setEditandoAnimal(true)
  }

  const cancelarEdicaoAnimal = () => {
    setEditandoAnimal(false)
    setEdFotoFile(null)
    setEdFotoPreview(null)
    setEdRemoverFoto(false)
    setEdFotosRemovidas([])
    setEdFotosNovas([])
    setEdFotosNovasPreviews([])
  }

  const fotosExistentesVisiveis = fotosAdicionais.filter(f => !edFotosRemovidas.includes(f.id))
  const totalFotosAdicionais = fotosExistentesVisiveis.length + edFotosNovas.length

  const handleAdicionarFotosExtra = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const disponiveis = MAX_FOTOS_ADICIONAIS - totalFotosAdicionais
    if (disponiveis <= 0) return
    const selecionadas = files.slice(0, disponiveis)
    setComprimindoFotosExtra(true)

    const novasFotos: File[] = []
    const novosPreviews: string[] = []
    for (const file of selecionadas) {
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
        novasFotos.push(compressed)
        novosPreviews.push(URL.createObjectURL(compressed))
      } catch {
        novasFotos.push(file)
        novosPreviews.push(URL.createObjectURL(file))
      }
    }
    setEdFotosNovas(prev => [...prev, ...novasFotos])
    setEdFotosNovasPreviews(prev => [...prev, ...novosPreviews])
    setComprimindoFotosExtra(false)
    if (edFotosNovasInputRef.current) edFotosNovasInputRef.current.value = ''
  }

  const removerFotoExistente = (id: string) => {
    setEdFotosRemovidas(prev => [...prev, id])
  }

  const removerFotoNova = (index: number) => {
    setEdFotosNovas(prev => prev.filter((_, i) => i !== index))
    setEdFotosNovasPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleEdFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
      setEdFotoFile(compressed)
      setEdFotoPreview(URL.createObjectURL(compressed))
    } catch {
      setEdFotoFile(file)
      setEdFotoPreview(URL.createObjectURL(file))
    }
    setEdRemoverFoto(false)
    if (edFotoInputRef.current) edFotoInputRef.current.value = ''
  }

  const removerFotoAnimal = () => {
    setEdFotoFile(null)
    setEdFotoPreview(null)
    setEdRemoverFoto(true)
  }

  const uploadFotoAnimal = async (file: File, animalId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const sufixo = Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    const path = 'animais/' + animalId + '-' + sufixo + '.' + ext
    const { error } = await supabase.storage.from('fotos').upload(path, file)
    if (error) return null
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
  }

  const guardarEdicaoAnimal = async () => {
    if (!selecionada) return
    if (!edNome.trim() || !edCor.trim()) {
      mostrarToast('Nome e cor são obrigatórios.', 'erro')
      return
    }
    setGuardandoAnimal(true)

    const atualizacao: Record<string, any> = {
      nome: edNome.trim(),
      especie: edEspecie,
      raca: edRaca.trim() || null,
      cor: edCor.trim(),
      apelo: edApelo.trim() || null,
      descricao: edDescricao,
    }

    if (edFotoFile) {
      const url = await uploadFotoAnimal(edFotoFile, selecionada.animal_id)
      if (url) atualizacao.foto_url = url
      else mostrarToast('Não foi possível carregar a nova foto, as restantes alterações foram guardadas.', 'info')
    } else if (edRemoverFoto) {
      atualizacao.foto_url = null
    }

    const { error } = await supabase.from('animais').update(atualizacao).eq('id', selecionada.animal_id)
    if (error) {
      mostrarToast('Erro ao guardar alterações. Tenta novamente.', 'erro')
      setGuardandoAnimal(false)
      return
    }

    // Remover fotos adicionais marcadas para remoção
    for (const fotoId of edFotosRemovidas) {
      await supabase.from('animal_fotos').delete().eq('id', fotoId)
    }

    // Adicionar novas fotos adicionais
    if (edFotosNovas.length > 0) {
      const ordemBase = fotosExistentesVisiveis.length
      for (let i = 0; i < edFotosNovas.length; i++) {
        const url = await uploadFotoAnimal(edFotosNovas[i], selecionada.animal_id)
        if (url) {
          await supabase.from('animal_fotos').insert({ animal_id: selecionada.animal_id, foto_url: url, ordem: ordemBase + i + 1 })
        }
      }
    }

    await fetchFotosAdicionais(selecionada.animal_id)
    await fetchTudo()
    setSelecionada(prev => prev ? { ...prev, animais: { ...(prev.animais as any), ...atualizacao } } as any : null)
    cancelarEdicaoAnimal()
    setGuardandoAnimal(false)
    mostrarToast('Informações do animal atualizadas!', 'sucesso')
  }

  const abrirModalEstado = () => {
    if (!selecionada) return
    setNovoEstadoSelecionado((selecionada.animais as any)?.estado || null)
    setMostrarModalEstado(true)
  }

  const aplicarNovoEstado = async () => {
    if (!selecionada) return
    const animal = selecionada.animais as any
    if (!novoEstadoSelecionado || novoEstadoSelecionado === animal?.estado) return
    setAplicandoEstado(true)
    const agora = new Date().toISOString()

    await supabase.from('animais').update({ estado: novoEstadoSelecionado }).eq('id', selecionada.animal_id)

    let atualizacaoOcorrencia: Record<string, any>
    if (novoEstadoSelecionado === 'encontrado') atualizacaoOcorrencia = { estado: 'resolvida', resolvida_at: agora }
    else if (novoEstadoSelecionado === 'avistado') atualizacaoOcorrencia = { estado: 'com_avistamentos', resolvida_at: null }
    else atualizacaoOcorrencia = { estado: 'aberta', resolvida_at: null }
    await supabase.from('ocorrencias').update(atualizacaoOcorrencia).eq('id', selecionada.id)

    await fetchTudo()
    setSelecionada(prev => prev ? {
      ...prev, ...atualizacaoOcorrencia,
      animais: { ...(prev.animais as any), estado: novoEstadoSelecionado }
    } as any : null)
    setMostrarModalEstado(false)
    setNovoEstadoSelecionado(null)
    setAplicandoEstado(false)
    mostrarToast('Estado do animal atualizado!', 'sucesso')
  }

  const arquivarOcorrencia = async (ocorrenciaId: string) => {
    if (!confirmarArquivar) { setConfirmarArquivar(true); return }
    setAtualizando(true)
    await supabase.from('ocorrencias').update({ estado: 'arquivada' }).eq('id', ocorrenciaId)
    await fetchTudo()
    setSelecionada(null)
    setConfirmarArquivar(false)
    mostrarToast('Ocorrência arquivada.', 'info')
    setAtualizando(false)
  }

  const partilharWhatsApp = (oc: Ocorrencia) => {
    const animal = oc.animais as any
    if (!animal) return
    const especie = nomeEspecie(animal.especie)
    const texto =
      `🐾 *${animal.nome} DESAPARECIDO!*\n\n` +
      `${especie}${animal.raca ? ` · ${animal.raca}` : ''} · ${animal.cor}\n` +
      `📅 Desaparecido desde: ${new Date(oc.created_at).toLocaleDateString('pt-PT')}\n` +
      `👁 Avistamentos: ${oc.total_avistamentos}\n\n` +
      (animal.descricao ? `📝 ${animal.descricao}\n\n` : '') +
      `Se o vires, reporta em:\n🔗 ${window.location.origin}/mapa\n\n` +
      `#AnimalDesaparecido #PetGuardian #Portugal`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    mostrarToast('A abrir WhatsApp...', 'sucesso')
  }

  const partilharFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/mapa')}`, '_blank')
    mostrarToast('A abrir Facebook...', 'sucesso')
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/mapa')
    mostrarToast('Link copiado!', 'sucesso')
  }

  const gerarCartaz = async (oc: Ocorrencia) => {
    const animal = oc.animais as any
    if (!animal) return
    mostrarToast('A gerar cartaz para imprimir...', 'info')
    try {
      await gerarCartazPDF(animal, window.location.origin)
      mostrarToast('Cartaz aberto — usa Ctrl+P para imprimir!', 'sucesso')
    } catch {
      mostrarToast('Erro ao gerar cartaz.', 'erro')
    }
  }

  const partilharInstagram = async (oc: Ocorrencia) => {
    const animal = oc.animais as any
    mostrarToast('A gerar imagem...', 'info')
    try {
      const { gerarImagemPartilha } = await import('../lib/gerarImagem')
      const dataUrl = await gerarImagemPartilha({
        nome: animal.nome, especie: animal.especie, raca: animal.raca,
        cor: animal.cor, foto_url: animal.foto_url,
        data_desaparecimento: new Date(oc.created_at).toLocaleDateString('pt-PT'),
        total_avistamentos: oc.total_avistamentos,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `petguardian-${animal.nome.toLowerCase().replace(/\s/g, '-')}.png`
      link.click()
      mostrarToast('Imagem descarregada! Partilha no Instagram 📸', 'sucesso')
    } catch { mostrarToast('Erro ao gerar imagem.', 'erro') }
  }

  const estadoBadge = (estado: string) => {
    if (estado === 'aberta') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Aberta</span>
    if (estado === 'com_avistamentos') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Com avistamentos</span>
    if (estado === 'resolvida') return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-1 rounded-full">Resolvida ✓</span>
    if (estado === 'arquivada') return <span className="text-xs font-semibold bg-stone-100 text-stone-500 px-2 py-1 rounded-full">Arquivada</span>
    return <span className="text-xs font-semibold bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{estado}</span>
  }

  const estadoAnimalBadge = (estado: string) => {
    if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">⚠ Desaparecido</span>
    if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">👁 Avistado</span>
    if (estado === 'encontrado') return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-1 rounded-full">✓ Encontrado</span>
    return <span className="text-xs font-semibold bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{estado}</span>
  }

  const selecionadaAnimais = selecionada?.animais as any
  const polylinePoints: [number, number][] = [
    ...(selecionadaAnimais?.latitude && selecionadaAnimais?.longitude
      ? [[selecionadaAnimais.latitude, selecionadaAnimais.longitude] as [number, number]]
      : []),
    ...avistamentos.filter(a => a.latitude && a.longitude).map(a => [a.latitude, a.longitude] as [number, number])
  ]

  if (loading) return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-8" style={{ fontFamily: 'Georgia, serif' }}>O meu histórico</h1>
        <SkeletonList />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>O meu histórico</h1>
        <p className="text-stone-500 mb-6">Os teus animais desaparecidos e os avistamentos que reportaste</p>

        {/* Tabs principais */}
        <div className="flex gap-0 mb-8 border-b-2 border-stone-200">
          <button
            onClick={() => { setTabPrincipal('meus-animais'); setSelecionada(null) }}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors -mb-0.5 ${tabPrincipal === 'meus-animais'
                ? 'border-lime-700 text-lime-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
          >
            🐾 Os meus animais
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${tabPrincipal === 'meus-animais' ? 'bg-lime-100 text-lime-800' : 'bg-stone-100 text-stone-500'
              }`}>
              {ocorrencias.length}
            </span>
          </button>
          <button
            onClick={() => { setTabPrincipal('meus-avistamentos'); setSelecionada(null) }}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors -mb-0.5 ${tabPrincipal === 'meus-avistamentos'
                ? 'border-lime-700 text-lime-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
          >
            👁 Avistamentos que reportei
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${tabPrincipal === 'meus-avistamentos' ? 'bg-lime-100 text-lime-800' : 'bg-stone-100 text-stone-500'
              }`}>
              {meusAvistamentos.length}
            </span>
          </button>
        </div>

        {/* TAB: OS MEUS ANIMAIS */}
        {tabPrincipal === 'meus-animais' && (
          <>
            {ocorrencias.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🐾</div>
                <p className="text-stone-500 mb-4">Ainda não tens animais registados.</p>
                <a href="/registar-animal" className="bg-lime-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">
                  Registar animal desaparecido
                </a>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Lista de ocorrências */}
                <div className="flex flex-col gap-3">
                  {ocorrencias.map(oc => (
                    <div key={oc.id} onClick={() => setSelecionada(oc)}
                      className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${selecionada?.id === oc.id ? 'border-orange-500 shadow-md' : 'border-stone-200'
                        }`}>
                      <div className="flex gap-3 items-start">
                        <div className="w-12 h-12 rounded-xl bg-lime-50 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                          {(oc.animais as any)?.foto_url
                            ? <img src={(oc.animais as any).foto_url} alt="" className="w-full h-full object-cover rounded-xl" />
                            : iconeEspecie((oc.animais as any)?.especie)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-stone-900 text-sm mb-1">{(oc.animais as any)?.nome}</div>
                          <div className="text-xs text-stone-400 mb-2">
                            {(oc.animais as any)?.cor} · {new Date(oc.created_at).toLocaleDateString('pt-PT')}
                          </div>
                          <div className="flex items-center gap-2">
                            {estadoBadge(oc.estado)}
                            {oc.total_avistamentos > 0 && (
                              <span className="text-xs text-stone-400">👁 {oc.total_avistamentos}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detalhe da ocorrência */}
                {selecionada ? (
                  <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* Header */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-lime-50 flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden">
                          {(selecionada.animais as any)?.foto_url
                            ? <img src={(selecionada.animais as any).foto_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                            : iconeEspecie((selecionada.animais as any)?.especie)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                              {(selecionada.animais as any)?.nome}
                            </div>
                            <button onClick={iniciarEdicaoAnimal}
                              className="flex items-center gap-1 bg-lime-50 text-lime-800 border border-lime-200 px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-lime-100 transition-colors">
                              ✏️ Editar informações
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {estadoBadge(selecionada.estado)}
                            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{(selecionada.animais as any)?.cor}</span>
                            {(selecionada.animais as any)?.raca && (
                              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{(selecionada.animais as any).raca}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={abrirModalEstado}
                              className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                              🔄 Mudar estado
                            </button>
                            {selecionada.estado !== 'resolvida' && selecionada.estado !== 'arquivada' && (
                              <button onClick={() => arquivarOcorrencia(selecionada.id)}
                                disabled={atualizando}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${confirmarArquivar ? 'bg-stone-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                  }`}>
                                {confirmarArquivar ? 'Confirmar arquivo' : '📁 Arquivar'}
                              </button>
                            )}
                            {confirmarArquivar && (
                              <button onClick={() => setConfirmarArquivar(false)} className="text-sm text-stone-400 hover:text-stone-600 px-2">Cancelar</button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-stone-100">
                        <div className="text-center">
                          <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{selecionada.total_avistamentos}</div>
                          <div className="text-xs text-stone-400 mt-1">Avistamentos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                            {Math.floor((Date.now() - new Date(selecionada.created_at).getTime()) / 86400000)}d
                          </div>
                          <div className="text-xs text-stone-400 mt-1">Tempo aberta</div>
                        </div>
                      </div>
                    </div>

                    {/* Editar informações e características do animal */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-stone-900">✏️ Editar ocorrência</h3>
                      </div>

                      {!editandoAnimal ? (
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="text-sm font-semibold text-stone-500">Descrição do animal</label>
                            <p className="text-sm text-stone-500 bg-stone-50 rounded-xl px-4 py-3 mt-1.5">
                              {(selecionada.animais as any)?.descricao || 'Sem descrição. Clica em "Editar informações" para adicionar.'}
                            </p>
                          </div>
                          {fotosAdicionais.length > 0 && (
                            <div>
                              <label className="text-sm font-semibold text-stone-500 mb-1.5 block">Fotos adicionais</label>
                              <div className="grid grid-cols-4 gap-2">
                                {fotosAdicionais.map(foto => (
                                  <img key={foto.id} src={foto.foto_url} alt="" className="w-full aspect-square object-cover rounded-xl border-2 border-stone-200" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">

                          {/* Foto do animal */}
                          <div>
                            <label className="text-sm font-semibold text-stone-500 mb-1.5 block">Foto do animal</label>
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-2xl bg-stone-50 border-2 border-stone-200 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                                {edFotoPreview
                                  ? <img src={edFotoPreview} alt="" className="w-full h-full object-cover" />
                                  : (!edRemoverFoto && (selecionada.animais as any)?.foto_url)
                                    ? <img src={(selecionada.animais as any).foto_url} alt="" className="w-full h-full object-cover" />
                                    : iconeEspecie(edEspecie)}
                              </div>
                              <div className="flex flex-col gap-2">
                                <button type="button" onClick={() => edFotoInputRef.current?.click()}
                                  className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-stone-200 transition-colors">
                                  {edFotoPreview || (!edRemoverFoto && (selecionada.animais as any)?.foto_url) ? '🔄 Alterar foto' : '📷 Adicionar foto'}
                                </button>
                                {(edFotoPreview || (!edRemoverFoto && (selecionada.animais as any)?.foto_url)) && (
                                  <button type="button" onClick={removerFotoAnimal}
                                    className="text-red-600 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors border border-red-200">
                                    ✕ Remover foto
                                  </button>
                                )}
                              </div>
                              <input ref={edFotoInputRef} type="file" accept="image/*" onChange={handleEdFotoChange} className="hidden" />
                            </div>
                          </div>

                          {/* Fotos adicionais */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-sm font-semibold text-stone-500">Fotos adicionais</label>
                              <span className="text-xs text-stone-400">{totalFotosAdicionais}/{MAX_FOTOS_ADICIONAIS}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {fotosExistentesVisiveis.map(foto => (
                                <div key={foto.id} className="relative group aspect-square">
                                  <img src={foto.foto_url} alt="" className="w-full h-full object-cover rounded-xl border-2 border-stone-200" />
                                  <button type="button" onClick={() => removerFotoExistente(foto.id)}
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                    ✕
                                  </button>
                                </div>
                              ))}
                              {edFotosNovasPreviews.map((preview, i) => (
                                <div key={'nova-' + i} className="relative group aspect-square">
                                  <img src={preview} alt="" className="w-full h-full object-cover rounded-xl border-2 border-lime-300" />
                                  <button type="button" onClick={() => removerFotoNova(i)}
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                    ✕
                                  </button>
                                  <span className="absolute bottom-1 left-1 bg-lime-600 text-white text-[10px] px-1 py-0.5 rounded-full font-semibold">Nova</span>
                                </div>
                              ))}
                              {totalFotosAdicionais < MAX_FOTOS_ADICIONAIS && (
                                <button type="button" onClick={() => edFotosNovasInputRef.current?.click()}
                                  disabled={comprimindoFotosExtra}
                                  className="aspect-square border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700 transition-colors disabled:opacity-50">
                                  <span className="text-xl">+</span>
                                  <span className="text-[10px] mt-0.5">{comprimindoFotosExtra ? '...' : 'Adicionar'}</span>
                                </button>
                              )}
                            </div>
                            <input ref={edFotosNovasInputRef} type="file" accept="image/*" multiple onChange={handleAdicionarFotosExtra} className="hidden" />
                          </div>

                          {/* Nome e espécie */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-semibold text-stone-500">Nome *</label>
                              <input value={edNome} onChange={e => setEdNome(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-semibold text-stone-500">Cor *</label>
                              <input value={edCor} onChange={e => setEdCor(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-stone-500">Espécie</label>
                            <div className="grid grid-cols-3 gap-2">
                              {OPCOES_ESPECIE.map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setEdEspecie(val)}
                                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${edEspecie === val ? 'border-lime-700 bg-lime-50 text-lime-800' : 'border-stone-200 text-stone-600'
                                    }`}>{label}</button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Raça</label>
                            <input value={edRaca} onChange={e => setEdRaca(e.target.value)} placeholder="Ex: Labrador"
                              className="w-full px-4 py-2.5 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Descrição</label>
                            <textarea value={edDescricao} onChange={e => setEdDescricao(e.target.value)} rows={3}
                              placeholder="Coleira, marcas, comportamento..."
                              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:border-lime-600" />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Mensagem de apelo <span className="text-stone-400 font-normal">(opcional)</span></label>
                            <textarea value={edApelo} onChange={e => setEdApelo(e.target.value)} rows={2}
                              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl text-sm resize-none focus:outline-none focus:border-lime-600" />
                          </div>

                          <div className="flex gap-2">
                            <button onClick={cancelarEdicaoAnimal} disabled={guardandoAnimal}
                              className="flex-1 border-2 border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-50 disabled:opacity-60">
                              Cancelar
                            </button>
                            <button onClick={guardarEdicaoAnimal} disabled={guardandoAnimal}
                              className="flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                              style={{ background: '#65a30d' }}>
                              {guardandoAnimal ? 'A guardar...' : 'Guardar alterações'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Partilhar */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-5">
                      <h3 className="font-bold text-stone-900 mb-3">📤 Partilhar para aumentar o alcance</h3>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => partilharWhatsApp(selecionada)}
                          className="flex items-center gap-2 bg-lime-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-lime-700 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          WhatsApp
                        </button>
                        <button onClick={partilharFacebook}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                          Facebook
                        </button>
                        <button onClick={() => partilharInstagram(selecionada)}
                          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                          style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                          📸 Instagram
                        </button>
                        <button onClick={copiarLink}
                          className="flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                          🔗 Copiar link
                        </button>
                        <button onClick={() => gerarCartaz(selecionada)}
                          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          style={{ background: '#365314' }}>
                          🖨️ Cartaz QR
                        </button>
                      </div>
                      <p className="text-xs text-stone-400 mt-2">Instagram: descarrega a imagem e partilha manualmente na app</p>
                    </div>

                    {/* Timeline + Mapa */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="bg-white rounded-2xl border border-stone-200 p-5">
                        <h3 className="font-bold text-stone-900 mb-4">📅 Linha do tempo</h3>
                        {loadingAvistamentos ? <SkeletonTimeline /> : (
                          <div className="flex flex-col gap-0">
                            <div className="flex gap-3 pb-4 relative">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm flex-shrink-0 z-10">📝</div>
                              {avistamentos.length > 0 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-stone-100"></div>}
                              <div className="pt-1">
                                <div className="text-sm font-semibold text-stone-900">Ocorrência aberta</div>
                                <div className="text-xs text-stone-400 mt-1">{new Date(selecionada.created_at).toLocaleString('pt-PT')}</div>
                              </div>
                            </div>
                            {avistamentos.map((av, i) => (
                              <button
                                key={av.id}
                                onClick={() => setAvistamentoSelecionado(av.id)}
                                className={`flex gap-3 pb-4 relative text-left rounded-xl transition-colors -mx-2 px-2 ${avistamentoSelecionado === av.id ? 'bg-orange-50' : 'hover:bg-stone-50'
                                  }`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 z-10 transition-colors ${avistamentoSelecionado === av.id ? 'bg-orange-600' : 'bg-orange-500'
                                  }`}>{i + 1}</div>
                                {i < avistamentos.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-stone-100"></div>}
                                <div className="pt-1 flex-1">
                                  <div className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                                    Avistamento #{i + 1}
                                    {av.latitude && av.longitude && <span className="text-xs font-normal text-orange-600">📍 Ver no mapa</span>}
                                  </div>
                                  <div className="text-xs text-stone-500 mt-1">{av.descricao || 'Sem descrição'}</div>
                                  <div className="text-xs text-stone-400 mt-1">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                                  {av.foto_url && <img src={av.foto_url} alt="Avistamento" className="mt-2 h-20 rounded-lg object-cover" />}
                                </div>
                              </button>
                            ))}
                            {avistamentos.length === 0 && <div className="text-xs text-stone-400 mt-2">Ainda sem avistamentos reportados.</div>}
                            {selecionada.estado === 'resolvida' && (
                              <div className="flex gap-3 pt-2">
                                <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-sm flex-shrink-0">✓</div>
                                <div className="pt-1">
                                  <div className="text-sm font-semibold text-lime-800">Animal encontrado!</div>
                                  {selecionada.resolvida_at && <div className="text-xs text-stone-400 mt-1">{new Date(selecionada.resolvida_at).toLocaleString('pt-PT')}</div>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-stone-100">
                          <h3 className="font-bold text-stone-900 text-sm">🗺 Trajeto dos avistamentos</h3>
                        </div>
                        {(selecionada.animais as any)?.latitude ? (
                          <div className="h-64">
                            <MapContainer center={[(selecionada.animais as any).latitude, (selecionada.animais as any).longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[(selecionada.animais as any).latitude, (selecionada.animais as any).longitude]} icon={iconeVermelho}>
                                <Popup><div className="text-sm font-semibold text-red-700">📍 Local de desaparecimento</div></Popup>
                              </Marker>
                              {avistamentos.filter(a => a.latitude && a.longitude).map((av, i) => (
                                <Marker
                                  key={av.id}
                                  position={[av.latitude, av.longitude]}
                                  icon={iconeAvistamento(i + 1, avistamentoSelecionado === av.id)}
                                  eventHandlers={{ click: () => setAvistamentoSelecionado(av.id) }}
                                >
                                  <Popup>
                                    <div className="text-sm font-semibold text-orange-700">👁 Avistamento #{i + 1}</div>
                                    <div className="text-xs text-stone-500 mt-1">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                                    {av.descricao && <div className="text-xs text-stone-600 mt-1">{av.descricao}</div>}
                                  </Popup>
                                </Marker>
                              ))}
                              {polylinePoints.length > 1 && <Polyline positions={polylinePoints} color="#16a34a" weight={4} opacity={0.85} />}
                              {avistamentoSelecionado && (() => {
                                const av = avistamentos.find(a => a.id === avistamentoSelecionado)
                                return av && av.latitude && av.longitude ? <MapFocus lat={av.latitude} lng={av.longitude} /> : null
                              })()}
                            </MapContainer>
                          </div>
                        ) : (
                          <div className="h-64 flex items-center justify-center text-stone-400 text-sm">Sem localização disponível</div>
                        )}
                        <div className="px-4 py-2 text-xs text-stone-400 bg-stone-50 flex items-center gap-4">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>Desaparecimento</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>Avistamentos</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0.5 bg-green-600"></span>Trajeto</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-2 flex items-center justify-center bg-white rounded-2xl border-2 border-dashed border-stone-200 h-64">
                    <div className="text-center text-stone-400">
                      <div className="text-4xl mb-3">👈</div>
                      <p className="text-sm">Seleciona uma ocorrência para ver os detalhes</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB: AVISTAMENTOS QUE REPORTEI */}
        {tabPrincipal === 'meus-avistamentos' && (
          <>
            {meusAvistamentos.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">👁</div>
                <p className="text-stone-500 mb-4">Ainda não reportaste nenhum avistamento.</p>
                <a href="/mapa" className="bg-lime-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">
                  Ver animais desaparecidos
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-stone-500">Ajudaste a localizar {meusAvistamentos.length} animal{meusAvistamentos.length > 1 ? 'is' : ''} 🐾</p>
                {meusAvistamentos.map(av => (
                  <div key={av.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                    <div className="flex gap-4 items-start">
                      {/* Foto do animal */}
                      <div className="w-16 h-16 rounded-2xl bg-lime-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                        {av.animais?.foto_url
                          ? <img src={av.animais.foto_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                          : iconeEspecie(av.animais?.especie)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="font-bold text-stone-900">{av.animais?.nome || 'Animal'}</div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              {nomeEspecie(av.animais?.especie || '')} · {av.animais?.cor}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {av.animais?.estado === 'encontrado'
                              ? <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-1 rounded-full">Encontrado ✓</span>
                              : <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Ainda desaparecido</span>
                            }
                          </div>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-3 mt-2">
                          <div className="text-xs font-semibold text-stone-500 mb-1">O teu avistamento</div>
                          <div className="text-sm text-stone-700">{av.descricao || 'Sem descrição'}</div>
                          <div className="text-xs text-stone-400 mt-1">{new Date(av.created_at).toLocaleString('pt-PT')}</div>
                        </div>
                        {av.foto_url && (
                          <img src={av.foto_url} alt="Foto do avistamento" className="mt-3 h-24 rounded-xl object-cover" />
                        )}
                        {av.animais?.estado === 'encontrado' && (
                          <div className="mt-3 bg-lime-50 border border-lime-200 rounded-xl px-3 py-2 text-lime-800 text-xs font-medium">
                            🎉 Este animal foi encontrado! O teu avistamento ajudou a reunir esta família.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal mudar estado do animal */}
      {mostrarModalEstado && selecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-stone-900 text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              🔄 Mudar estado de {(selecionada.animais as any)?.nome}
            </h2>
            <p className="text-stone-500 text-sm mb-5">Estado atual: {estadoAnimalBadge((selecionada.animais as any)?.estado)}</p>
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
                      {(selecionada.animais as any)?.estado === val && <span className="text-xs font-normal text-stone-400">atual</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setMostrarModalEstado(false); setNovoEstadoSelecionado(null) }}
                  className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 text-sm">Cancelar</button>
                <button type="button" onClick={aplicarNovoEstado}
                  disabled={aplicandoEstado || !novoEstadoSelecionado || novoEstadoSelecionado === (selecionada.animais as any)?.estado}
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