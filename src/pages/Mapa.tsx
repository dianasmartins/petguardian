import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import type { Animal } from '../types'
import { iconeEspecie, nomeEspecie } from '../lib/especies'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function criarIcone(estado: string, daltonico: boolean) {
  let cor: string
  let forma: string

  if (daltonico) {
    if (estado === 'desaparecido') {
      cor = '#1D4ED8'
      forma = `<circle cx="12" cy="10" r="7" fill="${cor}" stroke="white" stroke-width="2"/>`
    } else if (estado === 'avistado') {
      cor = '#D97706'
      forma = `<polygon points="12,3 21,17 3,17" fill="${cor}" stroke="white" stroke-width="2"/>`
    } else {
      cor = '#7C3AED'
      forma = `<polygon points="12,2 14.9,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9.1,8.5" fill="${cor}" stroke="white" stroke-width="1.5"/>`
    }
  } else {
    if (estado === 'desaparecido') {
      cor = '#DC2626'
      forma = `<circle cx="12" cy="10" r="7" fill="${cor}" stroke="white" stroke-width="2"/>`
    } else if (estado === 'avistado') {
      cor = '#D97706'
      forma = `<polygon points="12,3 21,17 3,17" fill="${cor}" stroke="white" stroke-width="2"/>`
    } else {
      cor = '#16A34A'
      forma = `<polygon points="12,2 14.9,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9.1,8.5" fill="${cor}" stroke="white" stroke-width="1.5"/>`
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">${forma}</svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

export default function Mapa() {
  const [animais, setAnimais] = useState<Animal[]>([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroEspecie, setFiltroEspecie] = useState('')
  const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')
  const [alertaProximidade, setAlertaProximidade] = useState<number | null>(null)
  const [daltonico, setDaltonico] = useState(false)
  const [filtroDistrito, setFiltroDistrito] = useState('')
  const { mostrarToast } = useToast()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('animais')
        .select('*')
        .not('latitude', 'is', null)
        .order('created_at', { ascending: false })
      setAnimais(data || [])
    }
    fetch()

    const channel = supabase
      .channel('animais-mapa')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animais' },
        (payload) => {
          setAnimais(prev => [payload.new as Animal, ...prev])
          mostrarToast('Novo animal registado no mapa! 📍', 'info')
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'animais' },
        (payload) => setAnimais(prev => prev.map(a => a.id === payload.new.id ? payload.new as Animal : a)))
      .subscribe()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: ula, longitude: ulo } = pos.coords
        const { data } = await supabase.from('animais').select('*').neq('estado', 'encontrado')
        if (data) {
          const nearby = data.filter(a => {
            if (!a.latitude || !a.longitude) return false
            const d = Math.sqrt(Math.pow(a.latitude - ula, 2) + Math.pow(a.longitude - ulo, 2)) * 111
            return d <= 2
          }).length
          if (nearby > 0) setAlertaProximidade(nearby)
        }
      }, () => { })
    }

    return () => { supabase.removeChannel(channel) }
  }, [])

  const DISTRITOS = ['Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Açores', 'Madeira']

  const filtrados = animais.filter(a => {
    if (filtroEstado && a.estado !== filtroEstado) return false
    if (filtroEspecie && a.especie !== filtroEspecie) return false
    if (filtroDistrito && !(a.descricao || '').toLowerCase().includes(filtroDistrito.toLowerCase()) &&
      !(a.nome || '').toLowerCase().includes(filtroDistrito.toLowerCase())) {
      // Filtra por proximidade geográfica aproximada por distrito
      const centros: Record<string, [number, number]> = {
        'Lisboa': [38.72, -9.14], 'Porto': [41.15, -8.61], 'Braga': [41.54, -8.43],
        'Coimbra': [40.21, -8.43], 'Aveiro': [40.64, -8.65], 'Faro': [37.02, -7.93],
        'Setúbal': [38.52, -8.89], 'Leiria': [39.74, -8.81], 'Viseu': [40.66, -7.91],
        'Évora': [38.57, -7.91], 'Santarém': [39.24, -8.69], 'Beja': [38.01, -7.86],
        'Viana do Castelo': [41.69, -8.83], 'Vila Real': [41.30, -7.75],
        'Bragança': [41.80, -6.76], 'Guarda': [40.53, -7.27],
        'Castelo Branco': [39.82, -7.49], 'Portalegre': [39.29, -7.43],
      }
      const centro = centros[filtroDistrito]
      if (centro && a.latitude && a.longitude) {
        const dist = Math.sqrt(Math.pow(a.latitude - centro[0], 2) + Math.pow(a.longitude - centro[1], 2)) * 111
        if (dist > 50) return false
      } else if (!centro) {
        return true // distrito sem coordenadas — mostra tudo
      }
    }
    return true
  })

  const estadoBadge = (estado: string) => {
    if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">Desaparecido</span>
    if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Avistado</span>
    return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-1 rounded-full">Encontrado</span>
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">

      {/* Alerta de proximidade */}
      {alertaProximidade !== null && alertaProximidade > 0 && (
        <div className="bg-lime-700 text-white px-4 py-2 flex items-center justify-between text-sm">
          <span>📍 {alertaProximidade} animal{alertaProximidade > 1 ? 'is' : ''} desaparecido{alertaProximidade > 1 ? 's' : ''} a menos de 2km de ti</span>
          <button onClick={() => setAlertaProximidade(null)} className="ml-4 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex flex-wrap gap-3 items-center">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border-2 border-stone-200 rounded-xl text-sm bg-white focus:border-lime-600 focus:outline-none">
          <option value="">Todos os estados</option>
          <option value="desaparecido">Desaparecido</option>
          <option value="avistado">Avistado</option>
          <option value="encontrado">Encontrado</option>
        </select>

        <select value={filtroEspecie} onChange={e => setFiltroEspecie(e.target.value)}
          className="px-3 py-2 border-2 border-stone-200 rounded-xl text-sm bg-white focus:border-lime-600 focus:outline-none">
          <option value="">Todas as espécies</option>
          <option value="cao">Cão</option>
          <option value="gato">Gato</option>
          <option value="outro">Outro</option>
        </select>

        <select value={filtroDistrito} onChange={e => setFiltroDistrito(e.target.value)}
          className="px-3 py-2 border-2 border-stone-200 rounded-xl text-sm bg-white focus:border-lime-600 focus:outline-none">
          <option value="">Todos os distritos</option>
          {DISTRITOS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Legenda */}
        <div className="flex items-center gap-3 text-xs text-stone-500 ml-2">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill={daltonico ? '#1D4ED8' : '#DC2626'} /></svg>
            Desaparecido
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,3 21,21 3,21" fill="#D97706" /></svg>
            Avistado
          </span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 14.9,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9.1,8.5" fill={daltonico ? '#7C3AED' : '#16A34A'} /></svg>
            Encontrado
          </span>
        </div>

        {/* Modo daltónico */}
        <button
          onClick={() => {
            setDaltonico(!daltonico)
            mostrarToast(daltonico ? 'Modo daltónico desativado' : 'Modo daltónico ativado ♿', 'info')
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${daltonico ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
        >
          👁 Modo daltónico
        </button>

        <div className="ml-auto flex border-2 border-stone-200 rounded-xl overflow-hidden">
          <button onClick={() => setVista('mapa')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${vista === 'mapa' ? 'bg-lime-700 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
            🗺 Mapa
          </button>
          <button onClick={() => setVista('lista')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${vista === 'lista' ? 'bg-lime-700 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
            📋 Lista
          </button>
        </div>
      </div>

      {/* Content */}
      {vista === 'mapa' ? (
        <div className="flex-1">
          <MapContainer center={[39.5, -8.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            {filtrados.filter(a => a.latitude && a.longitude).map(animal => (
              <Marker
                key={animal.id + (daltonico ? '-d' : '-n')}
                position={[animal.latitude!, animal.longitude!]}
                icon={criarIcone(animal.estado, daltonico)}
              >
                <Popup>
                  <div className="min-w-44">
                    {animal.foto_url && (
                      <img src={animal.foto_url} alt={animal.nome} className="w-full h-28 object-cover rounded-lg mb-2" />
                    )}
                    <div className="font-bold text-stone-900 mb-1">{animal.nome}</div>
                    <div className="text-xs text-stone-500 mb-2">
                      {nomeEspecie(animal.especie)}
                      {animal.raca && ` · ${animal.raca}`} · {animal.cor}
                    </div>
                    {estadoBadge(animal.estado)}
                    {animal.descricao && (
                      <p className="text-xs text-stone-500 mt-2 line-clamp-2">{animal.descricao}</p>
                    )}
                    <div className="text-xs text-stone-400 mt-2 mb-3">
                      {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Link
                        to={`/animais/${animal.id}`}
                        className="block w-full text-center bg-white border-2 border-lime-700 text-lime-800 py-2 px-3 rounded-lg text-xs font-semibold hover:bg-lime-50 transition-colors"
                      >
                        🐾 Ver ficha do animal
                      </Link>
                      {animal.estado !== 'encontrado' && (
                        <Link
                          to={`/avistamento/${animal.id}`}
                          className="block w-full text-center bg-lime-700 text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-lime-800 transition-colors"
                        >
                          👁 Reportar avistamento
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 bg-stone-50">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtrados.map(animal => (
              <div key={animal.id} className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:shadow-md transition-shadow">
                <Link to={`/animais/${animal.id}`} className="block">
                  <div className="h-36 bg-lime-50 flex items-center justify-center text-5xl overflow-hidden">
                    {animal.foto_url
                      ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                      : iconeEspecie(animal.especie)}
                  </div>
                  <div className="px-3 pt-3">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-sm text-stone-900">{animal.nome}</span>
                      {estadoBadge(animal.estado)}
                    </div>
                    <div className="text-xs text-stone-400 mb-2">{animal.cor}</div>
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  {animal.estado !== 'encontrado' && (
                    <Link to={`/avistamento/${animal.id}`}
                      className="block w-full text-center bg-lime-700 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-lime-800 transition-colors">
                      👁 Reportar avistamento
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}