import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import MultiplasFotos from '../components/MultiplasFotos'

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

export default function SubmeterAvistamento() {
    const { animalId } = useParams<{ animalId: string }>()
    const [descricao, setDescricao] = useState('')
    const [lat, setLat] = useState<number | null>(null)
    const [lng, setLng] = useState<number | null>(null)
    const [fotos, setFotos] = useState<File[]>([])
    const [fotosPreviews, setFotosPreviews] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const { mostrarToast } = useToast()

    const handleGPS = () => {
        if (!navigator.geolocation) { mostrarToast('GPS não disponível', 'erro'); return }
        navigator.geolocation.getCurrentPosition(
            pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); mostrarToast('Localização obtida!', 'sucesso') },
            () => mostrarToast('Não foi possível obter GPS. Clica no mapa.', 'info')
        )
    }

    const uploadFoto = async (file: File, prefix: string): Promise<string | null> => {
        const ext = file.name.split('.').pop()
        const path = 'avistamentos/' + prefix + '-' + Date.now() + '.' + ext
        const { error } = await supabase.storage.from('fotos').upload(path, file)
        if (error) return null
        return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lat || !lng) { mostrarToast('Seleciona a localização no mapa ou usa o GPS.', 'erro'); return }
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        // Upload da foto principal
        let foto_url = null
        if (fotos.length > 0) {
            foto_url = await uploadFoto(fotos[0], 'av-principal')
        }

        // Inserir avistamento
        const { data: avistamento, error } = await supabase.from('avistamentos').insert({
            animal_id: animalId,
            reporter_id: user?.id || null,
            descricao, latitude: lat, longitude: lng, foto_url,
        }).select().single()

        if (error || !avistamento) {
            mostrarToast('Erro ao submeter avistamento. Tenta novamente.', 'erro')
            setLoading(false)
            return
        }

        // Actualizar estado do animal para "avistado" (só se ainda não estiver encontrado)
        const { data: animalActual } = await supabase.from('animais').select('estado').eq('id', animalId).single()
        if (animalActual && animalActual.estado !== 'encontrado') {
            await supabase.from('animais').update({ estado: 'avistado' }).eq('id', animalId)
        }

        // Upload de fotos adicionais
        if (fotos.length > 1) {
            for (let i = 1; i < fotos.length; i++) {
                const url = await uploadFoto(fotos[i], 'av-foto' + i)
                if (url) {
                    await supabase.from('avistamento_fotos').insert({
                        avistamento_id: avistamento.id, foto_url: url, ordem: i
                    })
                }
            }
        }

        setSucesso(true)
        mostrarToast('Avistamento submetido! O dono foi notificado. 🐾', 'sucesso')
        setLoading(false)
    }

    if (sucesso) return (
        <div className="min-h-screen bg-lime-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md text-center border border-lime-100">
                <div className="text-6xl mb-4">🐾</div>
                <h2 className="text-2xl font-bold text-stone-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                    Avistamento submetido!
                </h2>
                <p className="text-stone-500 mb-2">O dono do animal foi notificado em tempo real.</p>
                <p className="text-stone-400 text-sm mb-8">Obrigada por ajudares a reunir esta família! 💛</p>
                <div className="flex gap-3">
                    <Link to="/mapa" className="flex-1 bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors text-center text-sm">
                        Ver no mapa
                    </Link>
                    <Link to="/animais" className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors text-center text-sm">
                        Ver animais
                    </Link>
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="mb-8">
                    <Link to="/mapa" className="text-lime-800 text-sm hover:underline">← Voltar ao mapa</Link>
                    <h1 className="text-3xl font-bold text-stone-900 mt-3" style={{ fontFamily: 'Georgia, serif' }}>
                        Reportar avistamento
                    </h1>
                    <p className="text-stone-500 mt-1">Viste este animal? Ajuda o dono a encontrá-lo.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-5">
                        <h2 className="font-bold text-stone-900">Detalhes do avistamento</h2>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Onde o viste? *</label>
                            <button type="button" onClick={handleGPS}
                                className="w-full bg-stone-100 text-stone-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                                📍 GPS automático
                            </button>
                            {lat && lng && (
                                <div className="bg-lime-50 border border-lime-200 rounded-xl px-4 py-2 text-lime-800 text-sm mt-1">
                                    ✓ {lat.toFixed(5)}°N, {lng.toFixed(5)}°W
                                </div>
                            )}
                            <p className="text-xs text-stone-400">Ou clica no mapa ao lado para marcar o local exacto.</p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Descrição do avistamento</label>
                            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4}
                                placeholder="Ex: Vi o animal junto ao parque, estava calmo e sozinho..."
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm resize-none" />
                        </div>

                        <MultiplasFotos
                            fotos={fotos}
                            previews={fotosPreviews}
                            onChange={(f: File[], p: string[]) => { setFotos(f); setFotosPreviews(p) }}
                            max={3}
                            label="Fotos do avistamento (até 3)"
                        />

                        <button type="submit" disabled={loading || !lat || !lng}
                            className="w-full bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors disabled:opacity-60">
                            {loading ? 'A submeter...' : '🐾 Submeter avistamento'}
                        </button>

                        <p className="text-xs text-stone-400 text-center">
                            Não é necessário ter conta para reportar um avistamento.
                        </p>
                    </form>

                    {/* Mapa */}
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100">
                            <h3 className="font-bold text-stone-900">Clica no mapa para marcar onde viste o animal</h3>
                            <p className="text-xs text-stone-400 mt-1">Quanto mais preciso, mais útil para o dono</p>
                        </div>
                        <div className="h-[420px]">
                            <MapContainer center={[39.5, -8.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                                <MapClick onMapClick={(lt, ln) => { setLat(lt); setLng(ln) }} />
                                {lat && lng && <Marker position={[lat, lng]} />}
                            </MapContainer>
                        </div>
                        {lat && lng && (
                            <div className="px-5 py-3 bg-lime-50 border-t border-lime-100 text-lime-800 text-sm">
                                ✓ Local marcado: {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}