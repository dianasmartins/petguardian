import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function AnimaisEncontrados() {
  const [session, setSession] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [especie, setEspecie] = useState('cao')
  const [cor, setCor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) navigate('/login')
    })
  }, [])

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!session) { navigate('/login'); return }
    setLoading(true)

    let foto_url = null
    if (foto) {
      const ext = foto.name.split('.').pop()
      const path = session.user.id + '/encontrado-' + Date.now() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, foto)
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
    setSucesso(true)
    setLoading(false)
  }

  if (sucesso) return (
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
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Encontrei um animal
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Registar animal encontrado
          </h1>
          <p className="text-lg" style={{ color: '#4d7c0f' }}>
            Encontraste um animal perdido? Regista-o aqui para que o dono o possa encontrar.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 flex flex-col gap-5" style={{ borderColor: '#d9f99d' }}>
            <h2 className="font-bold text-stone-900 text-lg">Dados do animal encontrado</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" style={{ color: '#365314' }}>Nome/Alcunha (se tiver coleira)</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Sem identificação"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" style={{ color: '#365314' }}>Espécie *</label>
              <div className="grid grid-cols-3 gap-2">
                {[['cao', '🐕 Cão'], ['gato', '🐈 Gato'], ['outro', '🐾 Outro']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setEspecie(val)}
                    className="py-3 rounded-xl text-sm font-semibold border-2 transition-colors"
                    style={{ borderColor: especie === val ? '#65a30d' : '#d9f99d', background: especie === val ? '#ecfccb' : 'white', color: especie === val ? '#365314' : '#6b7280' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" style={{ color: '#365314' }}>Cor</label>
              <input value={cor} onChange={e => setCor(e.target.value)} placeholder="Ex: Castanho e branco"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" style={{ color: '#365314' }}>Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                placeholder="Coleira, marcas, comportamento, onde foi encontrado..."
                className="w-full px-4 py-3 border-2 rounded-xl text-sm resize-none focus:outline-none" style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold" style={{ color: '#365314' }}>Foto</label>
              {fotoPreview
                ? <div className="relative"><img src={fotoPreview} className="w-full h-40 object-cover rounded-xl" /><button type="button" onClick={() => { setFoto(null); setFotoPreview(null) }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs font-bold">✕</button></div>
                : <label className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-lime-50 transition-colors" style={{ borderColor: '#d9f99d' }}>
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-sm" style={{ color: '#4d7c0f' }}>Clica para adicionar foto</p>
                    <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
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
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
              style={{ background: '#ea580c' }}>
              {loading ? 'A registar...' : '🐾 Registar animal encontrado'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#d9f99d' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: '#d9f99d' }}>
              <h3 className="font-bold" style={{ color: '#365314' }}>Clica no mapa para marcar onde encontraste o animal</h3>
            </div>
            <div style={{ height: 420 }}>
              <MapContainer center={[39.5, -8.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                <MapClick onMapClick={(lt, ln) => { setLat(lt); setLng(ln) }} />
                {lat && lng && <Marker position={[lat, lng]} />}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
