import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface Stats {
  totalAnimais: number
  totalEncontrados: number
  totalDesaparecidos: number
  totalAvistamentos: number
  totalUtilizadores: number
  taxaReencontro: number
  mediaAvistamentosPorCaso: number
  animaisRecentes: any[]
  animaisEncontrados: any[]
  porEspecie: { cao: number; gato: number; outro: number }
}

export default function Estatisticas() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const [animaisRes, avistamentosRes, profilesRes] = await Promise.all([
      supabase.from('animais').select('*').order('created_at', { ascending: false }),
      supabase.from('avistamentos').select('id'),
      supabase.from('profiles').select('id'),
    ])

    const animais = animaisRes.data || []
    const avistamentos = avistamentosRes.data || []
    const profiles = profilesRes.data || []

    const encontrados = animais.filter(a => a.estado === 'encontrado')
    const desaparecidos = animais.filter(a => a.estado === 'desaparecido')
    const taxa = animais.length > 0 ? Math.round((encontrados.length / animais.length) * 100) : 0
    const mediaAvs = animais.length > 0 ? Math.round((avistamentos.length / animais.length) * 10) / 10 : 0

    setStats({
      totalAnimais: animais.length,
      totalEncontrados: encontrados.length,
      totalDesaparecidos: desaparecidos.length,
      totalAvistamentos: avistamentos.length,
      totalUtilizadores: profiles.length,
      taxaReencontro: taxa,
      mediaAvistamentosPorCaso: mediaAvs,
      animaisRecentes: animais.slice(0, 3),
      animaisEncontrados: encontrados.slice(0, 4),
      porEspecie: {
        cao: animais.filter(a => a.especie === 'cao').length,
        gato: animais.filter(a => a.especie === 'gato').length,
        outro: animais.filter(a => a.especie === 'outro').length,
      }
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-stone-400">A carregar estatísticas...</div>
  )

  if (!stats) return null

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-lime-700 to-lime-800 py-16 px-4 text-center">
        <span className="inline-block bg-lime-500 text-lime-100 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 border border-green-400">
          Impacto social
        </span>
        <h1 className="text-4xl font-black text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          Estatísticas da plataforma
        </h1>
        <p className="text-lime-100 text-lg max-w-xl mx-auto">
          Dados em tempo real sobre o impacto do PetGuardian na reunificação de animais com as suas famílias
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Métricas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { value: stats.totalAnimais, label: 'Animais registados', icon: '🐾', cor: 'border-lime-200 bg-lime-50' },
            { value: stats.totalEncontrados, label: 'Reunidos com família', icon: '🎉', cor: 'border-emerald-200 bg-emerald-50' },
            { value: stats.totalAvistamentos, label: 'Avistamentos reportados', icon: '👁', cor: 'border-teal-200 bg-teal-50' },
            { value: stats.totalUtilizadores, label: 'Utilizadores registados', icon: '👥', cor: 'border-cyan-200 bg-cyan-50' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl border-2 ${stat.cor} p-5 text-center`}>
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{stat.value}</div>
              <div className="text-xs text-stone-500 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">

          {/* Taxa de reencontro */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-bold text-stone-900 mb-5">📊 Indicadores de impacto</h2>
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-600">Taxa de reencontro</span>
                  <span className="text-lg font-black text-lime-700">{stats.taxaReencontro}%</span>
                </div>
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-lime-500 rounded-full transition-all" style={{ width: stats.taxaReencontro + '%' }} />
                </div>
                <div className="text-xs text-stone-400 mt-1">{stats.totalEncontrados} de {stats.totalAnimais} animais reunidos</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-600">Casos activos</span>
                  <span className="text-lg font-black text-amber-600">{stats.totalDesaparecidos}</span>
                </div>
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: (stats.totalAnimais > 0 ? (stats.totalDesaparecidos / stats.totalAnimais) * 100 : 0) + '%' }} />
                </div>
                <div className="text-xs text-stone-400 mt-1">Animais ainda à procura de casa</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-stone-600">Média de avistamentos por caso</span>
                  <span className="text-lg font-black text-blue-600">{stats.mediaAvistamentosPorCaso}</span>
                </div>
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: Math.min(stats.mediaAvistamentosPorCaso * 20, 100) + '%' }} />
                </div>
                <div className="text-xs text-stone-400 mt-1">Comunidade activamente a ajudar</div>
              </div>
            </div>
          </div>

          {/* Por espécie */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="font-bold text-stone-900 mb-5">🐾 Por espécie</h2>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Cães', value: stats.porEspecie.cao, emoji: '🐕', cor: 'bg-amber-400' },
                { label: 'Gatos', value: stats.porEspecie.gato, emoji: '🐈', cor: 'bg-blue-400' },
                { label: 'Outros', value: stats.porEspecie.outro, emoji: '🐾', cor: 'bg-purple-400' },
              ].map(esp => {
                const pct = stats.totalAnimais > 0 ? Math.round((esp.value / stats.totalAnimais) * 100) : 0
                return (
                  <div key={esp.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-stone-600 flex items-center gap-2"><span>{esp.emoji}</span>{esp.label}</span>
                      <span className="text-sm font-bold text-stone-900">{esp.value} <span className="text-stone-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${esp.cor} rounded-full`} style={{ width: pct + '%' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-5 border-t border-stone-100">
              <div className="text-center">
                <div className="text-3xl font-black text-lime-700" style={{ fontFamily: 'Georgia, serif' }}>{stats.taxaReencontro}%</div>
                <div className="text-sm text-stone-500 mt-1">taxa de sucesso global</div>
                <div className="text-xs text-stone-400 mt-1">vs ~30% sem plataforma digital</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animais encontrados — página de sucesso */}
        {stats.animaisEncontrados.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-10">
            <div className="bg-gradient-to-r from-lime-50 to-emerald-50 px-6 py-5 border-b border-lime-100">
              <h2 className="font-bold text-stone-900 text-lg">🎉 Histórias de sucesso</h2>
              <p className="text-stone-500 text-sm mt-1">Animais que foram reunidos com as suas famílias graças à comunidade PetGuardian</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              {stats.animaisEncontrados.map(animal => (
                <Link key={animal.id} to={`/animais/${animal.id}`}
                  className="group text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-lime-50 flex items-center justify-center text-4xl mb-3 border-2 border-lime-200 group-hover:border-green-400 transition-colors">
                    {animal.foto_url
                      ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover" />
                      : (animal.especie === 'gato' ? '🐈' : '🐕')}
                  </div>
                  <div className="font-bold text-stone-900 text-sm">{animal.nome}</div>
                  <div className="text-xs text-stone-400">{animal.especie === 'cao' ? 'Cão' : 'Gato'}</div>
                  <div className="mt-1">
                    <span className="text-xs bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full font-semibold border border-lime-200">✓ Encontrado</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 text-center">
              <Link to="/animais" className="text-lime-800 text-sm font-semibold hover:underline">
                Ver todos os animais →
              </Link>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-lime-700 to-lime-800 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>Junta-te à comunidade</h3>
          <p className="text-lime-100 mb-6">Cada avistamento que reportas pode reunir uma família.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/registo" className="bg-white text-lime-800 px-6 py-3 rounded-xl font-semibold hover:bg-lime-50 transition-colors">
              Criar conta gratuita
            </Link>
            <Link to="/mapa" className="bg-lime-800 text-white border-2 border-green-400 px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition-colors">
              Ver mapa ao vivo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
