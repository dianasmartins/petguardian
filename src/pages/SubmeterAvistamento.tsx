import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import imageCompression from 'browser-image-compression'

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
    const [foto, setFoto] = useState<File | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const navigate = useNavigate()
    const { mostrarToast } = useToast()

    const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
            setFoto(compressed)
            setFotoPreview(URL.createObjectURL(compressed))
        } catch {
            setFoto(file)
            setFotoPreview(URL.createObjectURL(file))
        }
    }

    const handleGPS = () => {
        if (!navigator.geolocation) { mostrarToast('GPS não disponível', 'erro'); return }
        navigator.geolocation.getCurrentPosition(
            pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); mostrarToast('Localização obtida!', 'sucesso') },
            () => mostrarToast('Não foi possível obter GPS. Clica no mapa.', 'info')
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lat || !lng) { mostrarToast('Seleciona a localização no mapa ou usa o GPS.', 'erro'); return }
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        let foto_url = null
        if (foto) {
            const ext = foto.name.split('.').pop()
            const path = `avistamentos/${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage.from('fotos').upload(path, foto)
            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
                foto_url = urlData.publicUrl
            }
        }

        const { error } = await supabase.from('avistamentos').insert({
            animal_id: animalId,
            reporter_id: user?.id || null,
            descricao,
            latitude: lat,
            longitude: lng,
            foto_url,
        })

        if (error) {
            mostrarToast('Erro ao submeter avistamento. Tenta novamente.', 'erro')
        } else {
            setSucesso(true)
            mostrarToast('Avistamento submetido! O dono foi notificado. 🐾', 'sucesso')
        }
        setLoading(false)
    }

    if (sucesso) return (
        <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md text-center">
                <div className="text-6xl mb-4">🐾</div>
                <h2 className="text-2xl font-bold text-stone-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                    Avistamento submetido!
                </h2>
                <p className="text-stone-500 mb-2">O dono do animal foi notificado em tempo real.</p>
                <p className="text-stone-400 text-sm mb-8">Obrigada por ajudares a reunir esta família! 💛</p>
                <div className="flex gap-3">
                    <Link to="/mapa" className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors text-center">
                        Ver no mapa
                    </Link>
                    <Link to="/animais" className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors text-center">
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
                    <Link to="/mapa" className="text-orange-600 text-sm hover:underline">← Voltar ao mapa</Link>
                    <h1 className="text-3xl font-bold text-stone-900 mt-3" style={{ fontFamily: 'Georgia, serif' }}>
                        Reportar avistamento
                    </h1>
                    <p className="text-stone-500 mt-1">Viste este animal? Ajuda o dono a encontrá-lo.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-4">
                        <h2 className="font-bold text-stone-900">Detalhes do avistamento</h2>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Onde o viste? *</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleGPS}
                                    className="flex-1 bg-stone-100 text-stone-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                                    📍 GPS automático
                                </button>
                            </div>
                            {lat && lng && (
                                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-green-700 text-sm mt-1">
                                    ✓ {lat.toFixed(5)}°N, {lng.toFixed(5)}°W
                                </div>
                            )}
                            <p className="text-xs text-stone-400">Ou clica no mapa ao lado para marcar o local exacto.</p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Descrição do avistamento</label>
                            <textarea
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                rows={4}
                                placeholder="Ex: Vi o animal junto ao parque, estava calmo e sozinho. Parecia ter coleira mas não consegui ver o nome..."
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Foto (opcional mas muito útil)</label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                            >
                                {fotoPreview ? (
                                    <img src={fotoPreview} alt="Preview" className="max-h-32 mx-auto rounded-xl object-cover" />
                                ) : (
                                    <>
                                        <div className="text-3xl mb-2">📷</div>
                                        <p className="text-stone-500 text-sm">Clica para adicionar foto</p>
                                        <p className="text-stone-400 text-xs mt-1">JPG, PNG · máx. 5MB</p>
                                    </>
                                )}
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !lat || !lng}
                            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60 mt-2"
                        >
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
                            <div className="px-5 py-3 bg-green-50 border-t border-green-100 text-green-700 text-sm">
                                ✓ Local marcado: {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}