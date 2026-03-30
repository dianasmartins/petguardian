import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

interface Animal {
    id: string
    dono_id: string
    nome: string
    especie: string
    raca: string
    cor: string
    descricao: string
    estado: string
    latitude: number
    longitude: number
    foto_url: string
    created_at: string
}

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function Mapa() {
    const [animais, setAnimais] = useState<Animal[]>([])

    useEffect(() => {
        const carregarAnimais = async () => {
            const { data } = await supabase
                .from('animais')
                .select('*')
                .eq('estado', 'desaparecido')
            if (data) setAnimais(data)
        }
        carregarAnimais()

        // Realtime — atualiza automaticamente quando há novos animais
        const canal = supabase
            .channel('animais')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animais' }, payload => {
                setAnimais(prev => [...prev, payload.new as Animal])
            })
            .subscribe()

        return () => { supabase.removeChannel(canal) }
    }, [])

    return (
        <div className="h-screen w-full flex flex-col">
            <div className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center">
                <h1 className="font-bold text-lg">PetGuardian — Mapa</h1>
                <div className="flex gap-4">
                    <a href="/registar-animal" className="bg-white text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-50">
                        + Registar Animal
                    </a>
                    <a href="/" className="text-white text-sm hover:underline">Sair</a>
                </div>
            </div>

            <MapContainer
                center={[38.7169, -9.1399]}
                zoom={7}
                className="flex-1"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {animais.map(animal => (
                    animal.latitude && animal.longitude ? (
                        <Marker key={animal.id} position={[animal.latitude, animal.longitude]}>
                            <Popup>
                                <div style={{ minWidth: '160px' }}>
                                    {animal.foto_url && (
                                        <img
                                            src={animal.foto_url}
                                            alt={animal.nome}
                                            style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                                        />
                                    )}
                                    <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{animal.nome}</p>
                                    <p style={{ color: '#666', fontSize: '13px' }}>{animal.especie} · {animal.cor}</p>
                                    {animal.raca && <p style={{ color: '#666', fontSize: '13px' }}>{animal.raca}</p>}
                                    {animal.descricao && <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{animal.descricao}</p>}
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                ))}
            </MapContainer>
        </div>
    )
}