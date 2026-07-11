import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { OPCOES_ESPECIE } from '../lib/especies'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClick({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

interface LinhaAnimal {
  id: string
  nome: string
  especie: string
  raca: string
  cor: string
  descricao: string
  foto: File | null
  fotoPreview: string | null
}

const novaLinha = (): LinhaAnimal => ({
  id: crypto.randomUUID(), nome: '', especie: 'cao', raca: '', cor: '', descricao: '', foto: null, fotoPreview: null,
})

export default function RegistoLote() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [naoTemOrg, setNaoTemOrg] = useState(false)
  const [loading, setLoading] = useState(true)

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [morada, setMorada] = useState('')
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [linhas, setLinhas] = useState<LinhaAnimal[]>([novaLinha()])
  const [aGuardar, setAGuardar] = useState(false)
  const [erro, setErro] = useState('')

  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      const { data: perfil } = await supabase.from('profiles').select('id, tipo_conta').eq('id', user.id).maybeSingle()
      if (perfil?.tipo_conta === 'organizacao') {
        setOrgId(user.id)
      } else {
        const { data: membro } = await supabase.from('organizacao_membros').select('organizacao_id').eq('user_id', user.id).maybeSingle()
        if (membro) setOrgId(membro.organizacao_id)
        else setNaoTemOrg(true)
      }
      setLoading(false)
    }
    check()
  }, [])

  const geocodificarMorada = async () => {
    if (!morada.trim()) return
    setGeocodingLoading(true)
    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(morada + ', Portugal') + '&limit=1')
      const data = await res.json()
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat))
        setLng(parseFloat(data[0].lon))
        mostrarToast('Localização encontrada!', 'sucesso')
      } else {
        mostrarToast('Morada não encontrada. Tenta ser mais específico ou clica no mapa.', 'erro')
      }
    } catch {
      mostrarToast('Erro ao pesquisar morada.', 'erro')
    }
    setGeocodingLoading(false)
  }

  const handleGPS = () => {
    if (!navigator.geolocation) { mostrarToast('GPS não disponível', 'erro'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); mostrarToast('Localização GPS obtida!', 'sucesso') },
      () => mostrarToast('Não foi possível obter GPS. Clica no mapa.', 'info')
    )
  }

  const atualizarLinha = (id: string, campo: keyof LinhaAnimal, valor: any) => {
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l))
  }

  const handleFotoLinha = (id: string, file: File | null) => {
    atualizarLinha(id, 'foto', file)
    atualizarLinha(id, 'fotoPreview', file ? URL.createObjectURL(file) : null)
  }

  const adicionarLinha = () => setLinhas(prev => [...prev, novaLinha()])
  const removerLinha = (id: string) => setLinhas(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)

  const uploadFoto = async (file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = (orgId || 'lote') + '/' + prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext
    const { error } = await supabase.storage.from('fotos').upload(path, file)
    if (error) return null
    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!lat || !lng) { setErro('Define a localização (morada, GPS ou clica no mapa).'); return }
    const validas = linhas.filter(l => l.nome.trim() && l.cor.trim())
    if (validas.length === 0) { setErro('Preenche pelo menos um animal com nome e cor.'); return }

    setAGuardar(true)
    let sucesso = 0
    let falhas = 0

    for (const linha of validas) {
      let foto_url: string | null = null
      if (linha.foto) foto_url = await uploadFoto(linha.foto, linha.nome.toLowerCase().replace(/\s+/g, '-'))

      const { data: animalCriado, error } = await supabase.from('animais').insert({
        dono_id: orgId, nome: linha.nome.trim(), especie: linha.especie,
        raca: linha.raca.trim() || null, cor: linha.cor.trim(), descricao: linha.descricao || null,
        latitude: lat, longitude: lng, foto_url, estado: 'desaparecido',
      }).select().single()

      if (error || !animalCriado) { falhas++; continue }

      // Cria a ocorrência associada (para aparecer em "O meu histórico" e nos filtros)
      await supabase.from('ocorrencias').insert({
        animal_id: animalCriado.id, estado: 'aberta', total_avistamentos: 0,
      })

      sucesso++
    }

    setAGuardar(false)
    if (sucesso > 0) {
      mostrarToast(`${sucesso} animal${sucesso > 1 ? 'is' : ''} registado${sucesso > 1 ? 's' : ''} com sucesso!${falhas > 0 ? ` (${falhas} falharam)` : ''}`, 'sucesso')
      navigate('/organizacao/painel')
    } else {
      setErro('Não foi possível registar nenhum animal. Tenta novamente.')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>

  if (naoTemOrg) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">📦</div>
          <h1 className="font-bold text-xl text-stone-900 mb-2">Área exclusiva de organizações</h1>
          <p className="text-stone-500 text-sm">O registo em lote está disponível apenas para contas de organização.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/organizacao/painel" className="text-sm text-lime-700 font-semibold hover:underline">← Voltar ao painel</Link>
        <h1 className="text-2xl font-black text-stone-900 mt-2 mb-1" style={{ fontFamily: 'Georgia, serif' }}>📦 Registo em lote</h1>
        <p className="text-stone-500 text-sm mb-8">Regista vários animais de uma vez — ideal para resgates em conjunto.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Localização partilhada */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <label className="text-sm font-semibold text-stone-500 mb-2 block">Localização (partilhada por todos)</label>
            <div className="flex gap-2 mb-3">
              <input value={morada} onChange={e => setMorada(e.target.value)} placeholder="Rua, cidade..."
                className="flex-1 px-4 py-2.5 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
              <button type="button" onClick={geocodificarMorada} disabled={geocodingLoading}
                className="bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 disabled:opacity-60">
                {geocodingLoading ? '...' : '🔍'}
              </button>
              <button type="button" onClick={handleGPS}
                className="bg-stone-100 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200">
                📍 GPS
              </button>
            </div>
            <div className="h-48 rounded-xl overflow-hidden border border-stone-200">
              <MapContainer center={lat && lng ? [lat, lng] : [39.5, -8]} zoom={lat ? 14 : 6.5} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <MapClick onMapClick={(la, ln) => { setLat(la); setLng(ln) }} />
                {lat && lng && <Marker position={[lat, lng]} />}
              </MapContainer>
            </div>
            {!lat && <p className="text-xs text-stone-400 mt-2">Clica no mapa para definir o local, ou usa a pesquisa/GPS acima.</p>}
          </div>

          {/* Linhas de animais */}
          <div className="flex flex-col gap-4">
            {linhas.map((linha, i) => (
              <div key={linha.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-stone-500">Animal {i + 1}</span>
                  {linhas.length > 1 && (
                    <button type="button" onClick={() => removerLinha(linha.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Remover</button>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <label htmlFor={`foto-${linha.id}`} className="w-20 h-20 rounded-xl bg-stone-50 border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer hover:border-lime-400 overflow-hidden">
                      {linha.fotoPreview ? <img src={linha.fotoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl text-stone-300">📷</span>}
                    </label>
                    <input id={`foto-${linha.id}`} type="file" accept="image/*" className="hidden"
                      onChange={e => handleFotoLinha(linha.id, e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input value={linha.nome} onChange={e => atualizarLinha(linha.id, 'nome', e.target.value)} placeholder="Nome *"
                      className="px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-lime-600 focus:outline-none" />
                    <input value={linha.cor} onChange={e => atualizarLinha(linha.id, 'cor', e.target.value)} placeholder="Cor *"
                      className="px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-lime-600 focus:outline-none" />
                    <select value={linha.especie} onChange={e => atualizarLinha(linha.id, 'especie', e.target.value)}
                      className="px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-lime-600 focus:outline-none">
                      {OPCOES_ESPECIE.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                    <input value={linha.raca} onChange={e => atualizarLinha(linha.id, 'raca', e.target.value)} placeholder="Raça (opcional)"
                      className="px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-lime-600 focus:outline-none" />
                    <input value={linha.descricao} onChange={e => atualizarLinha(linha.id, 'descricao', e.target.value)} placeholder="Descrição (opcional)"
                      className="col-span-2 px-3 py-2 border-2 border-stone-200 rounded-lg text-sm focus:border-lime-600 focus:outline-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={adicionarLinha}
            className="border-2 border-dashed border-stone-300 text-stone-500 py-3 rounded-xl text-sm font-semibold hover:border-lime-400 hover:text-lime-700 transition-colors">
            + Adicionar outro animal
          </button>

          {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}

          <button type="submit" disabled={aGuardar}
            className="w-full bg-lime-700 text-white py-4 rounded-xl font-bold hover:bg-lime-800 disabled:opacity-60 transition-colors">
            {aGuardar ? 'A registar...' : `Registar ${linhas.filter(l => l.nome.trim() && l.cor.trim()).length || ''} animal(is)`}
          </button>
        </form>
      </div>
    </div>
  )
}
