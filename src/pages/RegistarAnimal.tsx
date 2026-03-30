import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function SelecionarLocalizacao({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng)
        }
    })
    return null
}

export default function RegistarAnimal() {
    const [nome, setNome] = useState('')
    const [especie, setEspecie] = useState('')
    const [raca, setRaca] = useState('')
    const [cor, setCor] = useState('')
    const [descricao, setDescricao] = useState('')
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [foto, setFoto] = useState<File | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState(false)
    const [loading, setLoading] = useState(false)
    const [gpsLoading, setGpsLoading] = useState(false)

    const obterLocalizacao = () => {
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude)
                setLongitude(pos.coords.longitude)
                setGpsLoading(false)
            },
            () => {
                setErro('Não foi possível obter a localização.')
                setGpsLoading(false)
            },
            { enableHighAccuracy: true }
        )
    }

    const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFoto(file)
            setFotoPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async () => {
        setErro('')

        if (!nome || !especie || !cor) {
            setErro('Nome, espécie e cor são obrigatórios.')
            return
        }

        if (!latitude || !longitude) {
            setErro('Por favor indica a localização — usa o GPS ou clica no mapa.')
            return
        }

        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()

        let foto_url = null

        if (foto) {
            const nomeficheiro = `${Date.now()}_${foto.name}`
            const { error: uploadError } = await supabase.storage
                .from('animais')
                .upload(nomeficheiro, foto)

            if (!uploadError) {
                const { data: urlData } = supabase.storage
                    .from('animais')
                    .getPublicUrl(nomeficheiro)
                foto_url = urlData.publicUrl
            }
        }

        const { error } = await supabase.from('animais').insert({
            dono_id: user?.id,
            nome,
            especie,
            raca,
            cor,
            descricao,
            estado: 'desaparecido',
            latitude,
            longitude,
            foto_url
        })

        if (error) {
            setErro('Erro ao registar animal. Tenta novamente.')
            setLoading(false)
            return
        }

        setSucesso(true)
        setLoading(false)
    }

    if (sucesso) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Animal registado!</h2>
                    <p className="text-gray-500 mb-4">O animal foi adicionado ao mapa.</p>
                    <a href="/mapa" className="text-blue-600 hover:underline">Ver no mapa</a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-lg mx-auto">
                <h1 className="text-2xl font-bold text-blue-700 mb-2">Registar Animal</h1>
                <p className="text-gray-500 mb-6">Preenche os dados do animal desaparecido</p>

                {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}

                <input
                    type="text"
                    placeholder="Nome do animal"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <select
                    value={especie}
                    onChange={e => setEspecie(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="">Seleciona a espécie</option>
                    <option value="cão">Cão</option>
                    <option value="gato">Gato</option>
                    <option value="outro">Outro</option>
                </select>

                <input
                    type="text"
                    placeholder="Raça (opcional)"
                    value={raca}
                    onChange={e => setRaca(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <input
                    type="text"
                    placeholder="Cor predominante"
                    value={cor}
                    onChange={e => setCor(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <textarea
                    placeholder="Descrição (marcas especiais, coleira, etc.)"
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <div className="mb-3">
                    <label className="block text-sm text-gray-600 mb-1">Foto do animal</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFoto}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    {fotoPreview && (
                        <img
                            src={fotoPreview}
                            alt="Preview"
                            className="mt-2 w-full h-48 object-cover rounded-lg"
                        />
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-2">Localização onde o animal desapareceu</label>

                    <button
                        onClick={obterLocalizacao}
                        disabled={gpsLoading}
                        className="w-full border-2 border-blue-400 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition mb-2"
                    >
                        {gpsLoading ? 'A obter localização...' : '📍 Usar a minha localização atual'}
                    </button>

                    <p className="text-center text-sm text-gray-400 mb-2">ou clica no mapa para escolher o local</p>

                    <div className="rounded-lg overflow-hidden border" style={{ height: '250px' }}>
                        <MapContainer
                            center={latitude && longitude ? [latitude, longitude] : [38.7169, -9.1399]}
                            zoom={6}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <SelecionarLocalizacao onSelect={(lat, lng) => {
                                setLatitude(lat)
                                setLongitude(lng)
                            }} />
                            {latitude && longitude && (
                                <Marker position={[latitude, longitude]} />
                            )}
                        </MapContainer>
                    </div>

                    {latitude && longitude && (
                        <p className="text-green-600 text-sm mt-2">
                            ✓ Localização selecionada: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </p>
                    )}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    {loading ? 'A registar...' : 'Registar Animal'}
                </button>

                <p className="text-center text-sm text-gray-500 mt-4">
                    <a href="/mapa" className="text-blue-600 hover:underline">Voltar ao mapa</a>
                </p>
            </div>
        </div>
    )
}