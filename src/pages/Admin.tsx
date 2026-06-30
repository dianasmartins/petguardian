import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { nomeEspecie } from '../lib/especies'

interface Stats {
  totalUtilizadores: number
  totalAnimais: number
  totalDesaparecidos: number
  totalEncontrados: number
  totalAvistamentos: number
  taxaReencontro: number
}

interface Utilizador {
  id: string
  nome: string
  telemovel: string | null
  created_at: string
  email?: string
}

interface Animal {
  id: string
  nome: string
  especie: string
  estado: string
  created_at: string
  dono_id: string
}

// Admin emails autorizados - adiciona o teu email aqui
const ADMIN_EMAILS = ['diana@gmail.com', 'admin@petguardian.pt']

export default function Admin() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUtilizadores: 0, totalAnimais: 0, totalDesaparecidos: 0,
    totalEncontrados: 0, totalAvistamentos: 0, taxaReencontro: 0
  })
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])
  const [tabActiva, setTabActiva] = useState<'dashboard' | 'utilizadores' | 'animais'>('dashboard')
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      if (!ADMIN_EMAILS.includes(user.email || '')) {
        navigate('/')
        mostrarToast('Acesso negado — área reservada ao administrador.', 'erro')
        return
      }
      setAuthorized(true)
      fetchData()
    }
    checkAuth()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [animaisRes, avistamentosRes, profilesRes] = await Promise.all([
      supabase.from('animais').select('*').order('created_at', { ascending: false }),
      supabase.from('avistamentos').select('id'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ])

    const animaisData = animaisRes.data || []
    const profilesData = profilesRes.data || []
    const avistamentosData = avistamentosRes.data || []

    const desaparecidos = animaisData.filter(a => a.estado === 'desaparecido').length
    const encontrados = animaisData.filter(a => a.estado === 'encontrado').length
    const taxa = animaisData.length > 0 ? Math.round((encontrados / animaisData.length) * 100) : 0

    setStats({
      totalUtilizadores: profilesData.length,
      totalAnimais: animaisData.length,
      totalDesaparecidos: desaparecidos,
      totalEncontrados: encontrados,
      totalAvistamentos: avistamentosData.length,
      taxaReencontro: taxa,
    })
    setAnimais(animaisData)
    setUtilizadores(profilesData)
    setLoading(false)
  }

  const marcarEncontrado = async (animalId: string) => {
    await supabase.from('animais').update({ estado: 'encontrado' }).eq('id', animalId)
    await supabase.from('ocorrencias').update({ estado: 'resolvida', resolvida_at: new Date().toISOString() }).eq('animal_id', animalId)
    mostrarToast('Animal marcado como encontrado!', 'sucesso')
    fetchData()
  }

  const eliminarAnimal = async (animalId: string) => {
    if (!confirm('Tens a certeza que queres eliminar este registo?')) return
    await supabase.from('animais').delete().eq('id', animalId)
    mostrarToast('Registo eliminado.', 'info')
    fetchData()
  }

  if (!authorized) return null

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-stone-400">A carregar painel...</div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                Painel de Administração
              </h1>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">⚡ Admin</span>
            </div>
            <p className="text-stone-500">Gestão e monitorização da plataforma PetGuardian</p>
          </div>
          <button onClick={fetchData} className="bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
            🔄 Atualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-stone-200">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'utilizadores', label: '👥 Utilizadores' },
            { id: 'animais', label: '🐾 Animais' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id as any)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tabActiva === tab.id
                  ? 'border-lime-700 text-lime-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tabActiva === 'dashboard' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Utilizadores', value: stats.totalUtilizadores, cor: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Animais registados', value: stats.totalAnimais, cor: 'text-stone-900', bg: 'bg-white' },
                { label: 'Desaparecidos', value: stats.totalDesaparecidos, cor: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Encontrados', value: stats.totalEncontrados, cor: 'text-lime-700', bg: 'bg-lime-50' },
                { label: 'Avistamentos', value: stats.totalAvistamentos, cor: 'text-lime-800', bg: 'bg-lime-50' },
                { label: 'Taxa reencontro', value: `${stats.taxaReencontro}%`, cor: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-2xl border border-stone-200 p-4 text-center`}>
                  <div className={`text-2xl font-black ${stat.cor}`} style={{ fontFamily: 'Georgia, serif' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Últimos animais */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                <h2 className="font-bold text-stone-900">🐾 Últimos animais registados</h2>
                <button onClick={() => setTabActiva('animais')} className="text-lime-800 text-sm hover:underline">Ver todos →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Animal</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Espécie</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Estado</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Registado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {animais.slice(0, 5).map(animal => (
                      <tr key={animal.id} className="border-t border-stone-100 hover:bg-stone-50">
                        <td className="px-6 py-3 font-medium">{animal.nome}</td>
                        <td className="px-6 py-3 text-stone-500">{nomeEspecie(animal.especie)}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            animal.estado === 'desaparecido' ? 'bg-red-100 text-red-700' :
                            animal.estado === 'encontrado' ? 'bg-lime-100 text-lime-800' :
                            'bg-amber-100 text-amber-700'
                          }`}>{animal.estado}</span>
                        </td>
                        <td className="px-6 py-3 text-stone-400">{new Date(animal.created_at).toLocaleDateString('pt-PT')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Últimos utilizadores */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                <h2 className="font-bold text-stone-900">👥 Últimos utilizadores registados</h2>
                <button onClick={() => setTabActiva('utilizadores')} className="text-lime-800 text-sm hover:underline">Ver todos →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Nome</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Telemóvel</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Registado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilizadores.slice(0, 5).map(u => (
                      <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                        <td className="px-6 py-3 font-medium">{u.nome}</td>
                        <td className="px-6 py-3 text-stone-500">{u.telemovel || '—'}</td>
                        <td className="px-6 py-3 text-stone-400">{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* UTILIZADORES */}
        {tabActiva === 'utilizadores' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">👥 Todos os utilizadores ({utilizadores.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Nome</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Telemóvel</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Registado em</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizadores.map(u => (
                    <tr key={u.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-6 py-3 font-medium">{u.nome}</td>
                      <td className="px-6 py-3 text-stone-400 text-xs font-mono">{u.id.slice(0, 8)}...</td>
                      <td className="px-6 py-3 text-stone-500">{u.telemovel || '—'}</td>
                      <td className="px-6 py-3 text-stone-400">{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANIMAIS */}
        {tabActiva === 'animais' && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">🐾 Todos os animais ({animais.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Nome</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Espécie</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Estado</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Registado</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {animais.map(animal => (
                    <tr key={animal.id} className="border-t border-stone-100 hover:bg-stone-50">
                      <td className="px-6 py-3 font-medium">{animal.nome}</td>
                      <td className="px-6 py-3 text-stone-500">
                        {nomeEspecie(animal.especie)}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          animal.estado === 'desaparecido' ? 'bg-red-100 text-red-700' :
                          animal.estado === 'encontrado' ? 'bg-lime-100 text-lime-800' :
                          'bg-amber-100 text-amber-700'
                        }`}>{animal.estado}</span>
                      </td>
                      <td className="px-6 py-3 text-stone-400">{new Date(animal.created_at).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          {animal.estado !== 'encontrado' && (
                            <button onClick={() => marcarEncontrado(animal.id)}
                              className="text-xs bg-lime-100 text-lime-800 px-3 py-1.5 rounded-lg hover:bg-green-200 transition-colors font-semibold">
                              ✓ Encontrado
                            </button>
                          )}
                          <button onClick={() => eliminarAnimal(animal.id)}
                            className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors font-semibold">
                            ✕ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
