import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { iconeEspecie } from '../lib/especies'

interface OrgProfile {
  id: string
  organizacao_nome: string | null
  organizacao_descricao: string | null
  organizacao_distrito: string | null
  organizacao_aprovada: boolean
  foto_url: string | null
  telemovel: string | null
  email: string | null
  created_at?: string | null
}

interface AnimalOrg {
  id: string
  nome: string
  foto_url: string | null
  especie: string
  estado: string
}

export default function OrganizacaoPerfil() {
  const { id } = useParams<{ id: string }>()
  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [animais, setAnimais] = useState<AnimalOrg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: orgData } = await supabase
        .from('profiles')
        .select('id, organizacao_nome, organizacao_descricao, organizacao_distrito, organizacao_aprovada, foto_url, telemovel, email, created_at')
        .eq('id', id)
        .eq('tipo_conta', 'organizacao')
        .maybeSingle()
      if (!orgData) { setLoading(false); return }
      setOrg(orgData)
      const { data: animaisData } = await supabase
        .from('animais')
        .select('id, nome, foto_url, especie, estado')
        .eq('dono_id', id)
        .order('created_at', { ascending: false })
      setAnimais(animaisData || [])
      setLoading(false)
    }
    fetchOrg()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>
  if (!org) return <div className="flex items-center justify-center h-96 text-stone-400">Organização não encontrada.</div>

  const total = animais.length
  const reunidos = animais.filter(a => a.estado === 'encontrado').length
  const desaparecidos = animais.filter(a => a.estado === 'desaparecido' || a.estado === 'avistado')

  const estadoBadge = (estado: string) => {
    if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Desaparecido</span>
    if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Avistado</span>
    return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full">Encontrado</span>
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Cabeçalho da organização */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-lime-50 flex items-center justify-center border border-stone-200 flex-shrink-0">
              {org.foto_url
                ? <img src={org.foto_url} alt={org.organizacao_nome || ''} className="w-full h-full object-cover" />
                : <span className="text-5xl">🏢</span>
              }
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{org.organizacao_nome}</h1>
                {org.organizacao_aprovada && (
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">✅ Organização verificada</span>
                )}
              </div>
              {org.organizacao_distrito && <div className="text-sm text-stone-400 mt-1">{org.organizacao_distrito}</div>}
              {org.organizacao_descricao && <p className="text-stone-600 text-sm mt-3 leading-relaxed">{org.organizacao_descricao}</p>}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
                {org.telemovel && (
                  <a href={`tel:${org.telemovel}`} className="text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full font-semibold hover:bg-stone-200 transition-colors">
                    📞 {org.telemovel}
                  </a>
                )}
                {org.email && (
                  <a href={`mailto:${org.email}`} className="text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full font-semibold hover:bg-stone-200 transition-colors">
                    ✉️ {org.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-stone-100">
            <div className="text-center">
              <div className="text-2xl font-black text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>{total}</div>
              <div className="text-xs text-stone-400 mt-1">Animais geridos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-lime-700" style={{ fontFamily: 'Georgia, serif' }}>{reunidos}</div>
              <div className="text-xs text-stone-400 mt-1">Reunidos 🎉</div>
            </div>
          </div>
        </div>

        {desaparecidos.length > 0 && (
          <div className="mb-8">
            <h2 className="font-bold text-xl text-stone-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>⚠ Animais desaparecidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {desaparecidos.map(a => (
                <Link key={a.id} to={`/animais/${a.id}`} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-all">
                  <div className="h-32 bg-lime-50 flex items-center justify-center overflow-hidden">
                    {a.foto_url ? <img src={a.foto_url} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-4xl">{iconeEspecie(a.especie)}</span>}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-stone-900 truncate">{a.nome}</div>
                    <div className="mt-1">{estadoBadge(a.estado)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {total === 0 && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-5xl mb-4">🐾</div>
            Esta organização ainda não tem animais registados.
          </div>
        )}
      </div>
    </div>
  )
}
