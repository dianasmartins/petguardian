import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { iconeEspecie } from '../lib/especies'

interface OrgProfile {
  id: string
  organizacao_nome: string | null
  organizacao_descricao: string | null
  organizacao_distrito: string | null
  organizacao_nif: string | null
  organizacao_aprovada: boolean
  foto_url: string | null
  telemovel: string | null
}

interface AnimalOrg {
  id: string
  nome: string
  foto_url: string | null
  especie: string
  estado: string
  created_at: string
}

interface Membro {
  id: string
  user_id: string
  role: string
  nome: string
  foto_url: string | null
}

const estadoBadge = (estado: string) => {
  if (estado === 'desaparecido') return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Desaparecido</span>
  if (estado === 'avistado') return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Avistado</span>
  return <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full">Encontrado</span>
}

export default function OrganizacaoPainel() {
  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [souDono, setSouDono] = useState(false)
  const [meuRole, setMeuRole] = useState<string | null>(null)
  const [animais, setAnimais] = useState<AnimalOrg[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [naoTemOrg, setNaoTemOrg] = useState(false)

  const [emailNovoMembro, setEmailNovoMembro] = useState('')
  const [aAdicionar, setAAdicionar] = useState(false)

  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  const souAdmin = souDono || meuRole === 'admin'

  useEffect(() => {
    const fetchTudo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      // 1. O próprio utilizador é uma conta de organização?
      const { data: profileProprio } = await supabase
        .from('profiles')
        .select('id, organizacao_nome, organizacao_descricao, organizacao_distrito, organizacao_nif, organizacao_aprovada, foto_url, telemovel, tipo_conta')
        .eq('id', user.id)
        .maybeSingle()

      let orgId: string | null = null
      let role: string | null = null

      if (profileProprio?.tipo_conta === 'organizacao') {
        orgId = user.id
        role = 'admin'
        setSouDono(true)
      } else {
        // 2. É membro de alguma organização?
        const { data: membroDe } = await supabase
          .from('organizacao_membros')
          .select('organizacao_id, role')
          .eq('user_id', user.id)
          .maybeSingle()
        if (membroDe) {
          orgId = membroDe.organizacao_id
          role = membroDe.role
          setMeuRole(role)
        }
      }

      if (!orgId) { setNaoTemOrg(true); setLoading(false); return }

      const { data: orgData } = await supabase
        .from('profiles')
        .select('id, organizacao_nome, organizacao_descricao, organizacao_distrito, organizacao_nif, organizacao_aprovada, foto_url, telemovel')
        .eq('id', orgId)
        .single()
      setOrg(orgData)

      const { data: animaisData } = await supabase
        .from('animais')
        .select('id, nome, foto_url, especie, estado, created_at')
        .eq('dono_id', orgId)
        .order('created_at', { ascending: false })
      setAnimais(animaisData || [])

      const { data: membrosData } = await supabase
        .from('organizacao_membros')
        .select('id, user_id, role, profiles(nome, foto_url)')
        .eq('organizacao_id', orgId)
      setMembros((membrosData || []).map((m: any) => ({
        id: m.id, user_id: m.user_id, role: m.role,
        nome: m.profiles?.nome || 'Utilizador', foto_url: m.profiles?.foto_url || null,
      })))

      setLoading(false)
    }
    fetchTudo()
  }, [])

  const adicionarMembro = async () => {
    if (!emailNovoMembro.trim() || !org) return
    setAAdicionar(true)
    const { data: pessoa } = await supabase.from('profiles').select('id, nome').eq('email', emailNovoMembro.trim()).maybeSingle()
    if (!pessoa) {
      mostrarToast('Não encontrámos nenhuma conta com esse email.', 'erro')
      setAAdicionar(false)
      return
    }
    const { error } = await supabase.from('organizacao_membros').insert({
      organizacao_id: org.id, user_id: pessoa.id, role: 'voluntario',
    })
    if (error) {
      mostrarToast(error.code === '23505' ? 'Essa pessoa já faz parte da equipa.' : 'Erro ao adicionar membro.', 'erro')
    } else {
      mostrarToast(`${pessoa.nome} foi adicionado à equipa!`, 'sucesso')
      setEmailNovoMembro('')
      setMembros(prev => [...prev, { id: crypto.randomUUID(), user_id: pessoa.id, role: 'voluntario', nome: pessoa.nome, foto_url: null }])
    }
    setAAdicionar(false)
  }

  const removerMembro = async (membroId: string) => {
    const { error } = await supabase.from('organizacao_membros').delete().eq('id', membroId)
    if (!error) {
      setMembros(prev => prev.filter(m => m.id !== membroId))
      mostrarToast('Membro removido da equipa.', 'info')
    }
  }

  const alternarRole = async (membro: Membro) => {
    const novoRole = membro.role === 'admin' ? 'voluntario' : 'admin'
    const { error } = await supabase.from('organizacao_membros').update({ role: novoRole }).eq('id', membro.id)
    if (!error) setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, role: novoRole } : m))
  }

  if (loading) return <div className="flex items-center justify-center h-96 text-stone-400">A carregar...</div>

  if (naoTemOrg) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🏢</div>
          <h1 className="font-bold text-xl text-stone-900 mb-2">Área exclusiva de organizações</h1>
          <p className="text-stone-500 text-sm">
            Esta área é só para contas de organização (abrigos, associações, clínicas) ou pessoas convidadas para uma equipa.
            Se representas uma organização, cria uma conta desse tipo ou pede a quem já a criou para te adicionar à equipa.
          </p>
        </div>
      </div>
    )
  }

  const animaisFiltrados = filtroEstado === 'todos' ? animais : animais.filter(a => a.estado === filtroEstado)

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-lime-50 flex items-center justify-center border border-stone-200 flex-shrink-0">
              {org?.foto_url ? <img src={org.foto_url} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">🏢</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-stone-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{org?.organizacao_nome}</h1>
                {org?.organizacao_aprovada
                  ? <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">✅ Verificada</span>
                  : <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⏳ Verificação pendente</span>
                }
              </div>
              {org && <Link to={`/organizacao/${org.id}`} className="text-xs text-lime-700 font-semibold hover:underline">Ver página pública →</Link>}
            </div>
          </div>
          {!org?.organizacao_aprovada && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs mt-4">
              ⏳ A tua organização ainda está a aguardar aprovação da nossa equipa (24-48h). Já podes usar tudo normalmente entretanto.
            </div>
          )}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/registar-animal" className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:border-lime-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-1">➕</div>
            <div className="text-xs font-semibold text-stone-700">Registar 1 animal</div>
          </Link>
          <Link to="/organizacao/registo-lote" className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:border-lime-300 hover:shadow-sm transition-all">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-xs font-semibold text-stone-700">Registo em lote</div>
          </Link>
        </div>

        {/* Todos os animais da organização */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-stone-900">🐾 Animais da organização ({animais.length})</h2>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="text-xs border-2 border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-lime-600">
              <option value="todos">Todos os estados</option>
              <option value="desaparecido">⚠ Desaparecido</option>
              <option value="avistado">👁 Avistado</option>
              <option value="encontrado">✓ Encontrado</option>
            </select>
          </div>
          {animaisFiltrados.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">Nenhum animal neste estado.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {animaisFiltrados.map(a => (
                <Link key={a.id} to={`/animais/${a.id}`} className="rounded-xl border border-stone-200 overflow-hidden hover:shadow-sm transition-all">
                  <div className="h-24 bg-lime-50 flex items-center justify-center overflow-hidden">
                    {a.foto_url ? <img src={a.foto_url} alt={a.nome} className="w-full h-full object-cover" /> : <span className="text-3xl">{iconeEspecie(a.especie)}</span>}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold text-stone-900 truncate">{a.nome}</div>
                    <div className="mt-1">{estadoBadge(a.estado)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Equipa */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-bold text-stone-900 mb-1">👥 Equipa</h2>
          <p className="text-stone-400 text-sm mb-4">Pessoas que podem gerir os animais desta organização.</p>

          <div className="flex items-center gap-3 mb-3 py-2">
            <div className="w-9 h-9 rounded-full bg-lime-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">🏢</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-stone-900">{org?.organizacao_nome} (conta principal)</div>
            </div>
            <span className="text-xs font-semibold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full">admin</span>
          </div>

          {membros.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-t border-stone-100">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-sm flex-shrink-0">
                {m.foto_url ? <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" /> : m.nome[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-900 truncate">{m.nome}</div>
              </div>
              {souAdmin ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => alternarRole(m)}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${m.role === 'admin' ? 'bg-lime-100 text-lime-800' : 'bg-stone-100 text-stone-600'}`}>
                    {m.role}
                  </button>
                  <button onClick={() => removerMembro(m.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Remover</button>
                </div>
              ) : (
                <span className="text-xs font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{m.role}</span>
              )}
            </div>
          ))}

          {souAdmin && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-stone-100">
              <input value={emailNovoMembro} onChange={e => setEmailNovoMembro(e.target.value)}
                placeholder="email@exemplo.com" type="email"
                className="flex-1 px-4 py-2.5 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
              <button onClick={adicionarMembro} disabled={aAdicionar || !emailNovoMembro.trim()}
                className="bg-lime-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-lime-800 disabled:opacity-60 transition-colors">
                {aAdicionar ? 'A adicionar...' : '+ Adicionar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
