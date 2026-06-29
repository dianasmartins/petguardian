import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

interface Conversa {
  id: string
  user1_id: string
  user2_id: string
  animal_id: string | null
  created_at: string
  outro_user?: { id: string; nome: string }
  animal?: { nome: string; foto_url: string | null; especie: string } | null
  ultima_msg?: string
  nao_lidas?: number
}

interface MensagemPrivada {
  id: string
  conversa_id: string
  sender_id: string
  conteudo: string
  lida: boolean
  created_at: string
}

export default function Mensagens() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionada, setSelecionada] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<MensagemPrivada[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { mostrarToast } = useToast()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return }
      setSession(session)
      fetchConversas(session.user.id)

      // Se vier com ?iniciar=userId&animal=animalId abre ou cria conversa
      const iniciarCom = searchParams.get('iniciar')
      const animalId = searchParams.get('animal')
      if (iniciarCom) {
        abrirOuCriarConversa(session.user.id, iniciarCom, animalId || undefined)
      }
    })
  }, [])

  useEffect(() => {
    if (!selecionada || !session) return
    fetchMensagens(selecionada.id)
    marcarComoLidas(selecionada.id)

    const channel = supabase
      .channel('msgs-privadas-' + selecionada.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagens_privadas',
        filter: `conversa_id=eq.${selecionada.id}`
      }, () => {
        fetchMensagens(selecionada.id)
        marcarComoLidas(selecionada.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selecionada?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const fetchConversas = async (userId: string) => {
    const { data } = await supabase
      .from('conversas')
      .select('*, animais(nome, foto_url, especie)')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const comOutros = await Promise.all(data.map(async (c: any) => {
      const outroId = c.user1_id === userId ? c.user2_id : c.user1_id
      const { data: perfil } = await supabase.from('profiles').select('id, nome').eq('id', outroId).single()

      const { data: msgs } = await supabase
        .from('mensagens_privadas')
        .select('conteudo, lida, sender_id')
        .eq('conversa_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const { count } = await supabase
        .from('mensagens_privadas')
        .select('id', { count: 'exact' })
        .eq('conversa_id', c.id)
        .eq('lida', false)
        .neq('sender_id', userId)

      return {
        ...c,
        outro_user: perfil,
        animal: c.animais,
        ultima_msg: msgs?.[0]?.conteudo || '',
        nao_lidas: count || 0,
      }
    }))

    setConversas(comOutros)
    setLoading(false)
  }

  const abrirOuCriarConversa = async (myId: string, outroId: string, animalId?: string) => {
    // Verifica se já existe conversa
    const { data: existente } = await supabase
      .from('conversas')
      .select('*')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${outroId}),and(user1_id.eq.${outroId},user2_id.eq.${myId})`)
      .single()

    if (existente) {
      setSelecionada(existente)
      return
    }

    // Cria nova conversa
    const { data: nova } = await supabase
      .from('conversas')
      .insert({ user1_id: myId, user2_id: outroId, animal_id: animalId || null })
      .select()
      .single()

    if (nova) {
      await fetchConversas(myId)
      setSelecionada(nova)
    }
  }

  const fetchMensagens = async (conversaId: string) => {
    const { data } = await supabase
      .from('mensagens_privadas')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })
    setMensagens(data || [])
  }

  const marcarComoLidas = async (conversaId: string) => {
    if (!session) return
    await supabase
      .from('mensagens_privadas')
      .update({ lida: true })
      .eq('conversa_id', conversaId)
      .neq('sender_id', session.user.id)
      .eq('lida', false)
    fetchConversas(session.user.id)
  }

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaMensagem.trim() || !selecionada || !session) return
    const texto = novaMensagem.trim()
    setNovaMensagem('')

    // Adiciona optimisticamente
    const msgTemp = {
      id: 'temp-' + Date.now(),
      conversa_id: selecionada.id,
      sender_id: session.user.id,
      conteudo: texto,
      lida: false,
      created_at: new Date().toISOString()
    }
    setMensagens(prev => [...prev, msgTemp])

    const { error } = await supabase.from('mensagens_privadas').insert({
      conversa_id: selecionada.id,
      sender_id: session.user.id,
      conteudo: texto
    })

    if (error) {
      mostrarToast('Erro ao enviar mensagem.', 'erro')
      setMensagens(prev => prev.filter(m => m.id !== msgTemp.id))
    } else {
      fetchMensagens(selecionada.id)
    }
  }

  const totalNaoLidas = conversas.reduce((acc, c) => acc + (c.nao_lidas || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-96 text-stone-400">A carregar mensagens...</div>
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
            Mensagens
          </h1>
          {totalNaoLidas > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
              {totalNaoLidas}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden" style={{ height: '70vh' }}>
          <div className="grid grid-cols-3 h-full">

            {/* Lista de conversas */}
            <div className="border-r border-stone-200 flex flex-col">
              <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                <div className="text-sm font-semibold text-stone-600">
                  {conversas.length} conversa{conversas.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversas.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-stone-400 text-sm">Ainda não tens mensagens.</p>
                    <p className="text-stone-300 text-xs mt-1">Envia uma mensagem a partir do perfil de um animal.</p>
                  </div>
                ) : (
                  conversas.map(c => (
                    <button key={c.id} onClick={() => setSelecionada(c)}
                      className={`w-full text-left px-4 py-4 border-b border-stone-100 hover:bg-lime-50 transition-colors ${
                        selecionada?.id === c.id ? 'bg-lime-50 border-l-2 border-l-green-600' : ''
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-lime-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(c.outro_user?.nome || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-stone-900 text-sm truncate">
                              {c.outro_user?.nome || 'Utilizador'}
                            </span>
                            {(c.nao_lidas || 0) > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {c.nao_lidas}
                              </span>
                            )}
                          </div>
                          {c.animal && (
                            <div className="text-xs text-lime-800 mb-0.5">
                              🐾 {c.animal.nome}
                            </div>
                          )}
                          {c.ultima_msg && (
                            <div className="text-xs text-stone-400 truncate">{c.ultima_msg}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Área de chat */}
            <div className="col-span-2 flex flex-col">
              {selecionada ? (
                <>
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-lime-700 flex items-center justify-center text-white font-bold text-sm">
                      {(selecionada.outro_user?.nome || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">
                        {selecionada.outro_user?.nome || 'Utilizador'}
                      </div>
                      {selecionada.animal && (
                        <div className="text-xs text-lime-800">Sobre: {selecionada.animal.nome}</div>
                      )}
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-stone-50">
                    {mensagens.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                        <div className="text-4xl">👋</div>
                        <p className="text-stone-400 text-sm">Começa a conversa enviando uma mensagem!</p>
                      </div>
                    ) : (
                      mensagens.map(msg => {
                        const isMinha = msg.sender_id === session?.user?.id
                        return (
                          <div key={msg.id} className={`flex gap-2 ${isMinha ? 'flex-row-reverse' : ''}`}>
                            <div className={`max-w-sm flex flex-col gap-1 ${isMinha ? 'items-end' : 'items-start'}`}>
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isMinha
                                  ? 'bg-lime-700 text-white rounded-tr-sm'
                                  : 'bg-white text-stone-800 border border-stone-200 rounded-tl-sm'
                              }`}>
                                {msg.conteudo}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-stone-400">
                                <span>{new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMinha && <span>{msg.lida ? '✓✓' : '✓'}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-stone-200 bg-white">
                    <form onSubmit={enviarMensagem} className="flex gap-3">
                      <input
                        type="text"
                        value={novaMensagem}
                        onChange={e => setNovaMensagem(e.target.value)}
                        placeholder="Escreve uma mensagem..."
                        className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-2xl focus:border-lime-600 focus:outline-none text-sm"
                      />
                      <button type="submit" disabled={enviando || !novaMensagem.trim()}
                        className="bg-lime-700 text-white px-5 py-3 rounded-2xl font-semibold hover:bg-lime-800 disabled:opacity-60 transition-colors">
                        {enviando ? '...' : '→'}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-stone-300">
                  <div className="text-6xl">💬</div>
                  <div>
                    <p className="text-stone-400 font-medium">Seleciona uma conversa</p>
                    <p className="text-stone-300 text-sm mt-1">ou envia uma mensagem a partir do perfil de um animal</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
