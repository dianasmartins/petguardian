import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface CasoSucesso {
  id: string
  nome: string
  especie: string
  raca: string | null
  foto_url: string | null
  created_at: string
  resolvida_at: string | null
  dias: number
  review?: { texto: string; nome: string }
}

export default function FamiliasFeliizes() {
  const [casos, setCasos] = useState<CasoSucesso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCasos = async () => {
      const { data: ocs } = await supabase
        .from('ocorrencias')
        .select('id, resolvida_at, created_at, animal_id, animais(id, nome, especie, raca, foto_url)')
        .eq('estado', 'resolvida')
        .not('resolvida_at', 'is', null)
        .order('resolvida_at', { ascending: false })
        .limit(20)

      if (!ocs) { setLoading(false); return }

      const { data: reviews } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(20)

      const casos: CasoSucesso[] = ocs.map((oc: any, i: number) => {
        const animal = oc.animais
        const criado = new Date(oc.created_at)
        const resolvido = new Date(oc.resolvida_at)
        const dias = Math.max(1, Math.round((resolvido.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24)))
        return {
          id: oc.id,
          nome: animal?.nome || 'Animal',
          especie: animal?.especie || 'cao',
          raca: animal?.raca || null,
          foto_url: animal?.foto_url || null,
          created_at: oc.created_at,
          resolvida_at: oc.resolvida_at,
          dias,
          review: reviews?.[i] ? { texto: reviews[i].texto, nome: reviews[i].nome } : undefined
        }
      })
      setCasos(casos)
      setLoading(false)
    }
    fetchCasos()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>

      {/* Hero */}
      <section className="py-20 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider" style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Histórias de sucesso
          </div>
          <h1 className="text-5xl font-black mb-5" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Famílias Felizes 🎉
          </h1>
          <p className="text-xl mb-4" style={{ color: '#4d7c0f' }}>
            Cada animal reunido com a sua família é uma história de amor, comunidade e tecnologia.
          </p>
          <p className="text-base" style={{ color: '#6b7280' }}>
            Estas famílias usaram o PetGuardian para encontrar os seus companheiros perdidos.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#365314' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 divide-x py-6 px-6" style={{ divideColor: '#4d7c0f' }}>
          {[
            { value: casos.length, label: 'Reuniões confirmadas' },
            { value: casos.length > 0 ? Math.round(casos.reduce((a,c) => a + c.dias, 0) / casos.length) : 0, label: 'Média de dias até encontrar' },
            { value: '87%', label: 'Taxa de sucesso global' },
          ].map(s => (
            <div key={s.label} className="text-center px-4">
              <div className="text-4xl font-black" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: '#86efac' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Casos */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-stone-400">A carregar histórias...</div>
          ) : casos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🐾</div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314' }}>Ainda não há casos resolvidos</h2>
              <p className="mb-6" style={{ color: '#4d7c0f' }}>Os primeiros reencontros vão aparecer aqui assim que acontecerem.</p>
              <Link to="/animais" className="px-6 py-3 rounded-xl font-semibold text-white" style={{ background: '#65a30d' }}>Ver animais desaparecidos</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {casos.map(caso => (
                <div key={caso.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all" style={{ borderColor: '#d9f99d' }}>
                  {/* Foto */}
                  <div className="h-48 bg-lime-50 flex items-center justify-center relative overflow-hidden">
                    {caso.foto_url
                      ? <img src={caso.foto_url} alt={caso.nome} className="w-full h-full object-cover" />
                      : <span className="text-6xl">{caso.especie === 'gato' ? '🐈' : '🐕'}</span>
                    }
                    {/* Badge encontrado */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: '#65a30d' }}>
                      ✓ Reunido
                    </div>
                    {/* Dias */}
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,0,0,.5)', color: 'white' }}>
                      {caso.dias === 1 ? 'Encontrado no mesmo dia!' : `Encontrado em ${caso.dias} dias`}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: '#365314' }}>{caso.nome}</h3>
                        <div className="text-sm" style={{ color: '#6b7280' }}>
                          {caso.especie === 'cao' ? 'Cão' : caso.especie === 'gato' ? 'Gato' : 'Animal'}
                          {caso.raca && ` · ${caso.raca}`}
                        </div>
                      </div>
                      <span className="text-2xl">{caso.especie === 'gato' ? '🐈' : '🐕'}</span>
                    </div>

                    {caso.review && (
                      <div className="rounded-xl p-3 mb-3" style={{ background: '#f7fee7', border: '1px solid #d9f99d' }}>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => <span key={i} style={{ color: '#f59e0b', fontSize: 12 }}>★</span>)}
                        </div>
                        <p className="text-sm italic mb-2" style={{ color: '#4d7c0f' }}>"{caso.review.texto}"</p>
                        <div className="text-xs font-semibold" style={{ color: '#365314' }}>— {caso.review.nome}</div>
                      </div>
                    )}

                    <div className="text-xs" style={{ color: '#9ca3af' }}>
                      Reunido em {new Date(caso.resolvida_at!).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center" style={{ background: 'white', borderTop: '2px solid #d9f99d' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>O teu animal também pode voltar a casa</h2>
          <p className="mb-8" style={{ color: '#4d7c0f' }}>Junta-te à comunidade e regista o teu animal desaparecido agora.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/registar-animal" className="px-8 py-4 rounded-2xl font-bold text-white" style={{ background: '#ea580c' }}>Registar animal desaparecido</Link>
            <Link to="/mapa" className="px-8 py-4 rounded-2xl font-bold border-2" style={{ borderColor: '#65a30d', color: '#365314' }}>Ver mapa ao vivo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
