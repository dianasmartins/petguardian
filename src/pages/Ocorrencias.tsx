import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { gerarCartazPDF } from '../lib/gerarQRCode'
import { registarNotificacoesPush, enviarNotificacaoLocal } from '../lib/notificacoes'
import { SkeletonList, SkeletonTimeline } from '../components/Skeleton'
import type { Ocorrencia, Avistamento } from '../types'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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
  const [editandoDescricao, setEditandoDescricao] = useState(false)
  const [avistamentoSelecionado, setAvistamentoSelecionado] = useState<string | null>(null)
  const [novaDescricao, setNovaDescricao] = useState('')
  const { mostrarToast } = useToast()

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
    setConfirmarArquivar(false)

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

  const editarDescricao = async () => {
    if (!selecionada) return
    await supabase.from('animais').update({ descricao: novaDescricao }).eq('id', selecionada.animal_id)
    await fetchTudo()
    setEditandoDescricao(false)
    mostrarToast('Descrição actualizada!', 'sucesso')
  }

  const marcarResolvida = async (ocorrenciaId: string, animalId: string) => {
    setAtualizando(true)
    await supabase.from('ocorrencias').update({
      estado: 'resolvida', resolvida_at: new Date().toISOString()
    }).eq('id', ocorrenciaId)
    await supabase.from('animais').update({ estado: 'encontrado' }).eq('id', animalId)
    await fetchTudo()
    setSelecionada(prev => prev ? { ...prev, estado: 'resolvida' } : null)
    mostrarToast('Ocorrência marcada como resolvida! 🎉', 'sucesso')
    setAtualizando(false)
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
                          <div className="text-xl font-bold text-stone-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                            {(selecionada.animais as any)?.nome}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {estadoBadge(selecionada.estado)}
                            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{(selecionada.animais as any)?.cor}</span>
                            {(selecionada.animais as any)?.raca && (
                              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{(selecionada.animais as any).raca}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selecionada.estado !== 'resolvida' && selecionada.estado !== 'arquivada' && (
                              <button onClick={() => marcarResolvida(selecionada.id, selecionada.animal_id)}
                                disabled={atualizando}
                                className="bg-lime-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-lime-800 disabled:opacity-60 transition-colors">
                                {atualizando ? 'A atualizar...' : '✓ Marcar como encontrado'}
                              </button>
                            )}
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
                      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-stone-100">
                        <div className="text-center">
                          <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{selecionada.total_avistamentos}</div>
                          <div className="text-xs text-stone-400 mt-1">Avistamentos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                            {Math.floor((Date.now() - new Date(selecionada.created_at).getTime()) / 3600000)}h
                          </div>
                          <div className="text-xs text-stone-400 mt-1">Tempo aberta</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                            {selecionada.estado === 'resolvida' ? '✓' : '…'}
                          </div>
                          <div className="text-xs text-stone-400 mt-1">Estado</div>
                        </div>
                      </div>
                    </div>

                    {/* Editar estado e descrição */}
                    <div className="bg-white rounded-2xl border border-stone-200 p-5">
                      <h3 className="font-bold text-stone-900 mb-4">✏️ Editar ocorrência</h3>
                      <div className="flex flex-col gap-4">
                        {/* Editar descrição */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-stone-500">Descrição do animal</label>
                            {!editandoDescricao && (
                              <button onClick={() => {
                                setNovaDescricao((selecionada.animais as any)?.descricao || '')
                                setEditandoDescricao(true)
                              }} className="text-xs text-lime-700 font-semibold hover:underline">Editar</button>
                            )}
                          </div>
                          {editandoDescricao ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={novaDescricao}
                                onChange={e => setNovaDescricao(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border-2 border-lime-300 rounded-xl text-sm resize-none focus:outline-none focus:border-lime-600"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setEditandoDescricao(false)}
                                  className="flex-1 border-2 border-stone-200 text-stone-600 py-2 rounded-xl text-sm font-semibold hover:bg-stone-50">
                                  Cancelar
                                </button>
                                <button onClick={editarDescricao}
                                  className="flex-1 text-white py-2 rounded-xl text-sm font-semibold"
                                  style={{ background: '#65a30d' }}>
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-stone-500 bg-stone-50 rounded-xl px-4 py-3">
                              {(selecionada.animais as any)?.descricao || 'Sem descrição. Clica em Editar para adicionar.'}
                            </p>
                          )}
                        </div>
                      </div>
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
    </div>
  )
}