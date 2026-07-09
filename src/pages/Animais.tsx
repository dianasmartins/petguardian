import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Animal } from '../types'

const PERIODOS = [
  { label: 'Últimos 15 dias', dias: 15 },
  { label: 'Último mês', dias: 30 },
  { label: 'Últimos 3 meses', dias: 90 },
  { label: 'Últimos 6 meses', dias: 180 },
  { label: 'Último ano', dias: 365 },
  { label: 'Todos', dias: 0 },
]

function iconeEspecie(especie: string) {
  switch (especie) {
    case 'gato': return '🐈'
    case 'ave': return '🦜'
    case 'coelho': return '🐰'
    case 'roedor': return '🐹'
    case 'reptil': return '🦎'
    case 'outro': return '🐾'
    default: return '🐕'
  }
}

export default function Animais() {
  const [animais, setAnimais] = useState<Animal[]>([])
  const [filtrados, setFiltrados] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('desaparecido')
  const [filtroEspecie, setFiltroEspecie] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState(0)
  const [filtroDistancia, setFiltroDistancia] = useState(0)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState('recente')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('animais').select('*').order('created_at', { ascending: false })
      setAnimais(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  useEffect(() => {
    let res = [...animais]

    // Estado — "Desaparecido" inclui também os avistados, pois o animal continua desaparecido
    if (filtroEstado === 'desaparecido') res = res.filter(a => a.estado === 'desaparecido' || a.estado === 'avistado')
    else if (filtroEstado !== 'todos') res = res.filter(a => a.estado === filtroEstado)

    // Espécie
    if (filtroEspecie !== 'todos') res = res.filter(a => a.especie === filtroEspecie)

    // Período
    if (filtroPeriodo > 0) {
      const limite = new Date()
      limite.setDate(limite.getDate() - filtroPeriodo)
      res = res.filter(a => new Date(a.created_at) >= limite)
    }

    // Busca
    if (busca.trim()) {
      const q = busca.toLowerCase()
      res = res.filter(a => a.nome.toLowerCase().includes(q) || (a.raca || '').toLowerCase().includes(q) || (a.cor || '').toLowerCase().includes(q))
    }

    // Distância
    if (filtroDistancia > 0 && userLat && userLng) {
      res = res.filter(a => {
        if (!a.latitude || !a.longitude) return false
        const R = 6371
        const dLat = (a.latitude - userLat) * Math.PI / 180
        const dLon = (a.longitude - userLng) * Math.PI / 180
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(a.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) <= filtroDistancia
      })
    }

    // Sort
    if (sortBy === 'recente') res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === 'antigo') res.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sortBy === 'nome') res.sort((a, b) => a.nome.localeCompare(b.nome))

    setFiltrados(res)
  }, [animais, filtroEstado, filtroEspecie, filtroPeriodo, filtroDistancia, userLat, userLng, sortBy, busca])

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      setUserLat(pos.coords.latitude)
      setUserLng(pos.coords.longitude)
    })
  }

  const estadoBadge = (estado: string) => {
    if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Desaparecido</span>
    if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Avistado</span>
    if (estado === 'para_adocao') return <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Para adoção</span>
    if (estado === 'encontrado') return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full">Encontrado</span>
    return <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Encontrado na rua</span>
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>

      {/* Intro */}
      <section className="py-14 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wider" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Base de dados pública
          </div>
          <h1 className="text-5xl font-black mb-4" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Animais desaparecidos
          </h1>
          <p className="text-lg mb-2" style={{ color: '#4d7c0f' }}>
            Todos os animais registados na plataforma, actualizados em tempo real.
          </p>
          <p className="text-base" style={{ color: '#6b7280' }}>
            Viste algum? Clica no cartão e reporta um avistamento — não precisas de conta.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Filtros */}
        <div className="bg-white rounded-2xl border p-5 mb-8 flex flex-col gap-4" style={{ borderColor: '#d9f99d' }}>
          {/* Linha 1: busca + estado + espécie */}
          <div className="flex flex-wrap gap-3 items-center">
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="🔍 Pesquisar por nome, raça ou cor..."
              className="flex-1 min-w-48 px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: '#d9f99d', background: '#f7fee7' }} />

            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
              style={{ borderColor: '#d9f99d' }}>
              <option value="todos">Todos os estados</option>
              <option value="desaparecido">⚠ Desaparecido (inclui avistados)</option>
              <option value="avistado">👁 Avistado</option>
              <option value="para_adocao">🏠 Para adoção</option>
              <option value="encontrado">✓ Encontrado</option>
            </select>

            <select value={filtroEspecie} onChange={e => setFiltroEspecie(e.target.value)}
              className="px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
              style={{ borderColor: '#d9f99d' }}>
              <option value="todos">Todas as espécies</option>
              <option value="cao">🐕 Cão</option>
              <option value="gato">🐈 Gato</option>
              <option value="ave">🦜 Ave</option>
              <option value="coelho">🐰 Coelho</option>
              <option value="roedor">🐹 Roedor</option>
              <option value="outro">🐾 Outro</option>
            </select>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
              style={{ borderColor: '#d9f99d' }}>
              <option value="recente">↓ Mais recentes</option>
              <option value="antigo">↑ Mais antigos</option>
              <option value="nome">A-Z Nome</option>
            </select>
          </div>

          {/* Linha 2: período + distância */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 flex-wrap">
              {PERIODOS.map(p => (
                <button key={p.dias} onClick={() => setFiltroPeriodo(p.dias)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  style={{
                    background: filtroPeriodo === p.dias ? '#65a30d' : 'white',
                    color: filtroPeriodo === p.dias ? 'white' : '#4d7c0f',
                    borderColor: filtroPeriodo === p.dias ? '#65a30d' : '#d9f99d'
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-semibold" style={{ color: '#365314' }}>Raio:</span>
              <select value={filtroDistancia} onChange={e => setFiltroDistancia(Number(e.target.value))}
                className="px-3 py-1.5 border-2 rounded-lg text-xs focus:outline-none bg-white"
                style={{ borderColor: '#d9f99d' }}>
                <option value={0}>Qualquer distância</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
              {filtroDistancia > 0 && !userLat && (
                <button onClick={handleGPS} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
                  📍 Usar GPS
                </button>
              )}
              {userLat && <span className="text-xs" style={{ color: '#65a30d' }}>✓ GPS activo</span>}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-semibold" style={{ color: '#4d7c0f' }}>{filtrados.length} {filtrados.length === 1 ? 'animal encontrado' : 'animais encontrados'}</span>
          <Link to="/animais-encontrados" className="text-sm font-semibold px-4 py-2 rounded-xl" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            🐾 Encontrei um animal →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border overflow-hidden animate-pulse" style={{ borderColor: '#d9f99d' }}>
                <div className="h-44 bg-lime-100"></div>
                <div className="p-4"><div className="h-4 bg-lime-100 rounded mb-2"></div><div className="h-3 bg-lime-50 rounded w-2/3"></div></div>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#365314' }}>Nenhum animal encontrado</h2>
            <p style={{ color: '#4d7c0f' }}>Tenta ajustar os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtrados.map(animal => (
              <Link key={animal.id} to={`/animais/${animal.id}`}
                className="bg-white rounded-2xl overflow-hidden border-2 hover:shadow-lg transition-all group"
                style={{ borderColor: '#d9f99d' }}>
                <div className="h-44 bg-lime-50 flex items-center justify-center overflow-hidden">
                  {animal.foto_url
                    ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <span className="text-6xl">{iconeEspecie(animal.especie)}</span>
                  }
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold" style={{ color: '#365314' }}>{animal.nome}</span>
                    {estadoBadge(animal.estado)}
                  </div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>
                    {{ cao: 'Cão', gato: 'Gato', ave: 'Ave', coelho: 'Coelho', roedor: 'Roedor', outro: 'Outro' }[animal.especie] || 'Outro'}
                    {animal.raca && ` · ${animal.raca}`}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                    {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}