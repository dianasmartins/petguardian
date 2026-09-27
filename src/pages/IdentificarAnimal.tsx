import { useState, useRef, useEffect } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

import { useToast } from '../components/Toast'

import type { Animal } from '../types'

import { iconeEspecie, nomeEspecie } from '../lib/especies'



interface ResultadoIA {

  especie: string

  raca_estimada: string

  cor_principal: string

  cores_secundarias: string[]

  tamanho: string

  caracteristicas_distintivas: string[]

  confianca: number

}



export default function IdentificarAnimal() {

  const [, setSession] = useState<any>(null)

  const [verificandoSessao, setVerificandoSessao] = useState(true)

  const [foto, setFoto] = useState<File | null>(null)

  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const [analisando, setAnalisando] = useState(false)

  const [resultado, setResultado] = useState<ResultadoIA | null>(null)

  const [sugestoes, setSugestoes] = useState<Array<{ animal: Animal; score: number }>>([])

  const [erro, setErro] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()

  const { mostrarToast } = useToast()

  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY



  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {

      setSession(session)

      if (!session) {

        navigate('/registo')

      } else {

        setVerificandoSessao(false)

      }

    })

  }, [])



  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]

    if (!file) return

    setFoto(file)

    setFotoPreview(URL.createObjectURL(file))

    setResultado(null)

    setSugestoes([])

    setErro('')

  }



  const fileToBase64 = (file: File): Promise<string> =>

    new Promise((resolve, reject) => {

      const reader = new FileReader()

      reader.onload = () => resolve((reader.result as string).split(',')[1])

      reader.onerror = reject

      reader.readAsDataURL(file)

    })



  const calcularScore = (res: ResultadoIA, animal: Animal): number => {

    const iaAnimal = (animal as any).caracteristicas_ia

    // ── FILTRO POR RAÇA ──────────────────────────────────────────

    // Se a IA reconheceu a raça na fotografia e o animal registado

    // também tem uma raça conhecida, raças diferentes são excluídas.



    const normalizarRaca = (valor?: string) =>

      (valor || '')

        .toLowerCase()

        .normalize('NFD')

        .replace(/[\u0300-\u036f]/g, '')

        .trim()



    const racaFoto = normalizarRaca(res.raca_estimada)



    const racaAnimal = normalizarRaca(

      iaAnimal?.raca_estimada || animal.raca

    )



    const racaConhecida = (raca: string) =>

      raca !== '' &&

      raca !== 'desconhecida' &&

      raca !== 'desconhecido' &&

      raca !== 'indefinida' &&

      raca !== 'indefinido'



    // Se ambas as raças são conhecidas e diferentes,

    // o animal não é considerado uma correspondência.

    if (

      racaConhecida(racaFoto) &&

      racaConhecida(racaAnimal) &&

      racaFoto !== racaAnimal

    ) {

      return 0

    }



    // Normalizar espécie para comparação robusta

    const normalizarEspecie = (s: string) => {

      const v = (s || '').toLowerCase()

      if (v.includes('cão') || v.includes('cao') || v.includes('dog')) return 'cao'

      if (v.includes('gato') || v.includes('cat')) return 'gato'

      if (v.includes('ave') || v.includes('papagaio') || v.includes('periquito') || v.includes('canário') || v.includes('canario') || v.includes('bird') || v.includes('pássaro') || v.includes('passaro')) return 'ave'

      if (v.includes('coelho') || v.includes('rabbit')) return 'coelho'

      if (v.includes('hamster') || v.includes('rato') || v.includes('roedor') || v.includes('porquinho')) return 'roedor'

      if (v.includes('tartaruga') || v.includes('réptil') || v.includes('reptil') || v.includes('lagarto') || v.includes('cobra') || v.includes('serpente') || v.includes('snake') || v.includes('lizard') || v.includes('turtle')) return 'reptil'

      return 'outro'

    }



    const espIAFoto = normalizarEspecie(res.especie)

    const espAnimalRegistado = normalizarEspecie(iaAnimal?.especie || animal.especie)



    // Só corta a zero se AMBAS as espécies forem reconhecidas e claramente diferentes.

    // Se alguma for desconhecida ("outro"), deixa continuar a comparar por cor/raça/características.

    if (espIAFoto !== 'outro' && espAnimalRegistado !== 'outro' && espIAFoto !== espAnimalRegistado) return 0

    const especieConfirmadaIgual = espIAFoto !== 'outro' && espIAFoto === espAnimalRegistado



    // Se o animal tem características IA guardadas — comparação estruturada

    if (iaAnimal && !iaAnimal.modo) {

      let score = especieConfirmadaIgual ? 40 : 15



      // Cor principal — 25 pontos

      const corIA = (res.cor_principal || '').toLowerCase()

      const corAnimal2 = (iaAnimal.cor_principal || '').toLowerCase()

      if (corIA === corAnimal2) score += 25

      else if (corIA.includes(corAnimal2) || corAnimal2.includes(corIA)) score += 15

      else {

        const todasCoresAnimal = [corAnimal2, ...(iaAnimal.cores_secundarias || []).map((c: string) => c.toLowerCase())]

        const todasCoresIA = [corIA, ...(res.cores_secundarias || []).map((c: string) => c.toLowerCase())]

        if (todasCoresAnimal.some(ca => todasCoresIA.some(ci => ca.includes(ci) || ci.includes(ca)))) score += 10

      }



      // Raça — 20 pontos

      const racaIA2 = (res.raca_estimada || '').toLowerCase()

      const racaAnimal2 = (iaAnimal.raca_estimada || '').toLowerCase()

      if (racaIA2 && racaAnimal2) {

        if (racaIA2 === racaAnimal2) score += 20

        else if (racaIA2.includes(racaAnimal2.split(' ')[0]) || racaAnimal2.includes(racaIA2.split(' ')[0])) score += 12

      } else {

        score += 8

      }



      // Tamanho — 10 pontos

      if (res.tamanho && iaAnimal.tamanho && res.tamanho === iaAnimal.tamanho) score += 10



      // Características distintivas — 5 pontos

      if (res.caracteristicas_distintivas?.length && iaAnimal.caracteristicas_distintivas?.length) {

        const matchCaract = res.caracteristicas_distintivas.some((c: string) =>

          iaAnimal.caracteristicas_distintivas.some((ca: string) =>

            c.toLowerCase().includes(ca.toLowerCase().split(' ')[0]) ||

            ca.toLowerCase().includes(c.toLowerCase().split(' ')[0])

          )

        )

        if (matchCaract) score += 5

      }



      return Math.min(Math.round(score), 100)

    }



    // Fallback sem características IA

    let score = especieConfirmadaIgual ? 35 : 12



    const corIA3 = (res.cor_principal || '').toLowerCase()

    const corAnimal3 = animal.cor.toLowerCase()

    const similares: Record<string, string[]> = {

      'castanho': ['marrom', 'dourado', 'bege', 'creme', 'caramelo'],

      'preto': ['escuro', 'negro'],

      'branco': ['creme', 'bege', 'claro'],

      'dourado': ['castanho', 'bege', 'amarelo', 'caramelo'],

    }

    const palavrasCorIA = [corIA3, ...(res.cores_secundarias || []).map((c: string) => c.toLowerCase())]

    const palavrasCorAnimal = corAnimal3.split(' ').filter(Boolean)

    const matchCor = palavrasCorAnimal.some(pa =>

      palavrasCorIA.some(pi => pa === pi || pa.includes(pi) || pi.includes(pa) ||

        (similares[pa] || []).includes(pi) || (similares[pi] || []).includes(pa))

    )

    if (matchCor) score += 35

    else score += 5



    if (res.raca_estimada && animal.raca) {

      const racaIA3 = res.raca_estimada.toLowerCase()

      const racaAnimal3 = animal.raca.toLowerCase()

      if (racaAnimal3.includes(racaIA3) || racaIA3.includes(racaAnimal3)) score += 20

      else if (racaIA3.split(' ')[0] === racaAnimal3.split(' ')[0]) score += 10

    } else if (!animal.raca) {

      score += 10

    }



    return Math.min(Math.round(score), 100)

  }



  const analisar = async () => {

    if (!foto) return

    setAnalisando(true)

    setErro('')

    setResultado(null)

    setSugestoes([])



    try {

      let resultadoIA: ResultadoIA



      if (GEMINI_KEY) {

        const base64 = await fileToBase64(foto)

        const prompt = `Analisa esta imagem de um animal. Responde EXCLUSIVAMENTE em JSON válido, sem texto adicional, sem markdown, sem backticks. O JSON deve ter exatamente esta estrutura: {"especie": string, "raca_estimada": string, "cor_principal": string, "cores_secundarias": [string], "tamanho": "pequeno" ou "medio" ou "grande", "caracteristicas_distintivas": [string], "confianca": number entre 0 e 1}. O campo "caracteristicas_distintivas" deve conter APENAS características físicas visíveis e objetivas (ex: padrões, marcas, cicatrizes, formato de orelhas/cauda). NÃO incluas suposições sobre se o animal é doméstico, selvagem, perigoso, venenoso ou sobre a sua origem — o animal é sempre tratado como um possível animal de estimação, seja qual for a espécie. Se não conseguires identificar, retorna {"erro": "nao_identificado"}.`

        const response = await fetch(

          `https\://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,

          {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

              contents: [{

                parts: [

                  { text: prompt },

                  { inline_data: { mime_type: foto.type, data: base64 } }

                ]

              }]

            })

          }

        )



        if (!response.ok) {

          const errBody = await response.text()

          console.error('Gemini API erro HTTP', response.status, errBody)

          setErro(`Erro na API Gemini (${response.status}). Verifica a chave VITE_GEMINI_API_KEY no Vercel.`)

          setAnalisando(false)

          return

        }



        const data = await response.json()

        console.log('Resposta Gemini completa:', data)



        // Verificar se o conteúdo foi bloqueado por filtros de segurança

        const finishReason = data.candidates?.[0]?.finishReason

        if (finishReason && finishReason !== 'STOP') {

          console.error('Gemini bloqueou a resposta:', finishReason, data.candidates?.[0]?.safetyRatings)

          setErro('A IA não conseguiu processar esta imagem (motivo: ' + finishReason + '). Tenta outra foto.')

          setAnalisando(false)

          return

        }



        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {

          console.error('Gemini não devolveu texto. Resposta completa:', JSON.stringify(data))

          setErro('A IA não devolveu resultado. Verifica a consola (F12) para detalhes técnicos.')

          setAnalisando(false)

          return

        }



        const clean = text.replace(/```json|```/g, '').trim()

        try {

          resultadoIA = JSON.parse(clean)

        } catch (parseErr) {

          console.error('Erro ao interpretar JSON da IA. Texto recebido:', text)

          setErro('A IA devolveu uma resposta inesperada. Tenta novamente.')

          setAnalisando(false)

          return

        }

      } else {

        await new Promise(r => setTimeout(r, 1500))

        resultadoIA = {

          especie: 'Cão',

          raca_estimada: 'Corgi',

          cor_principal: 'Castanho',

          cores_secundarias: ['branco'],

          tamanho: 'medio',

          caracteristicas_distintivas: ['pelo curto', 'orelhas pontiagudas', 'focinho comprido'],

          confianca: 0.87

        }

        mostrarToast('Modo demo activo — resultado simulado, não real', 'info')

      }



      if ((resultadoIA as any).erro) {

        setErro('Não foi possível identificar um animal nesta fotografia. Tenta com uma imagem mais clara.')

        setAnalisando(false)

        return

      }



      setResultado(resultadoIA)



      const { data: animais, error: dbError } = await supabase

        .from('animais')

        .select('*')

        .neq('estado', 'encontrado')

        .order('created_at', { ascending: false })



      if (dbError) {

        console.error('Erro ao buscar animais:', dbError)

      }



      if (animais) {
        const normalizarRacaFiltro = (valor?: string) =>
          (valor || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()

        const racaConhecida = (valor: string) =>
          valor !== '' &&
          valor !== 'desconhecida' &&
          valor !== 'desconhecido' &&
          valor !== 'indefinida' &&
          valor !== 'indefinido'

        const racaFoto = normalizarRacaFiltro(resultadoIA.raca_estimada)

        // Se a IA reconheceu uma raça, exclui animais cuja raça conhecida é diferente.
        // Ex.: fotografia = Pug e animal registado = Corgi -> não entra nas sugestões.
        const animaisFiltrados = animais.filter(animal => {
          if (!racaConhecida(racaFoto)) return true

          const iaAnimal = (animal as any).caracteristicas_ia
          const racaAnimal = normalizarRacaFiltro(
            iaAnimal?.raca_estimada || animal.raca
          )

          if (!racaConhecida(racaAnimal)) return true

          return racaAnimal === racaFoto
        })

        const scored = animaisFiltrados
          .map(animal => ({
            animal,
            score: calcularScore(resultadoIA, animal)
          }))
          .filter(s => s.score >= 20)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        setSugestoes(scored)
      }



      mostrarToast('Análise concluída!', 'sucesso')

    } catch (err) {

      console.error('Erro inesperado na análise:', err)

      setErro('Erro ao analisar a fotografia: ' + (err instanceof Error ? err.message : 'erro desconhecido') + '. Verifica a consola (F12).')

    }

    setAnalisando(false)

  }



  const diagnosticarModelos = async () => {

    if (!GEMINI_KEY) {

      mostrarToast('Sem chave Gemini configurada — não é possível listar modelos.', 'erro')

      return

    }

    try {

      const res = await fetch(`https\://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`)

      const data = await res.json()

      const comGenerateContent = (data.models || [])

        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))

        .map((m: any) => m.name)

      console.log('Modelos disponíveis para esta chave (suportam generateContent):', comGenerateContent)

      console.log('Resposta completa do ListModels:', data)

      mostrarToast(`${comGenerateContent.length} modelos disponíveis — ver consola (F12)`, 'info')

    } catch (err) {

      console.error('Erro ao listar modelos:', err)

      mostrarToast('Erro ao consultar modelos disponíveis.', 'erro')

    }

  }



  const corScore = (score: number) => {

    if (score >= 70) return 'text-lime-700'

    if (score >= 40) return 'text-amber-600'

    return 'text-stone-400'

  }



  const labelScore = (score: number) => {

    if (score >= 70) return { label: 'Correspondência provável', cor: 'bg-lime-100 text-lime-800 border-lime-200' }

    if (score >= 40) return { label: 'Correspondência possível', cor: 'bg-amber-100 text-amber-700 border-amber-200' }

    return { label: 'Correspondência baixa', cor: 'bg-stone-100 text-stone-500 border-stone-200' }

  }



  const handleContactarDono = (animalId: string, nome: string) => {

    mostrarToast(`A abrir chat de ${nome}...`, 'info')

    navigate(`/animais/${animalId}?tab=chat`)

  }



  const handleReportarAvistamento = (animalId: string) => {

    navigate(`/avistamento/${animalId}`)

  }



  if (verificandoSessao) return (

    <div className="min-h-screen flex items-center justify-center bg-stone-50">

      <div className="text-center">

        <div className="text-4xl mb-3">🐾</div>

        <div className="text-sm font-semibold text-lime-800">A verificar sessão...</div>

      </div>

    </div>

  )



  return (

    <div className="min-h-screen bg-stone-50">

      <div className="max-w-5xl mx-auto px-4 py-10">

        <div className="mb-8">

          <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>

            Identificação visual por IA

          </h1>

          <p className="text-stone-500 mt-1">Carrega a foto de um animal encontrado — a IA compara com os animais desaparecidos</p>

        </div>



        {!GEMINI_KEY && (

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-amber-700 text-sm mb-6">

            ℹ️ <strong>Modo demonstração</strong> — adiciona VITE_GEMINI_API_KEY ao .env para análise real com Google Gemini

          </div>

        )}



        <div className="grid lg:grid-cols-2 gap-6">



          {/* Upload e análise */}

          <div className="flex flex-col gap-5">

            <div className="bg-white rounded-2xl border border-stone-200 p-6">

              <h2 className="font-bold text-stone-900 mb-4">📷 1. Foto do animal encontrado</h2>

              <div

                onClick={() => fileRef.current?.click()}

                className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-lime-50 transition-colors mb-4"

              >

                {fotoPreview ? (

                  <img src={fotoPreview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-cover" />

                ) : (

                  <>

                    <div className="text-4xl mb-3">📷</div>

                    <p className="text-stone-500 text-sm font-medium">Clica para adicionar uma foto</p>

                    <p className="text-stone-400 text-xs mt-1">JPG, PNG · foto clara de frente</p>

                  </>

                )}

              </div>

              <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} className="hidden" />

              <button

                onClick={analisar}

                disabled={!foto || analisando}

                className="w-full bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors disabled:opacity-60"

              >

                {analisando ? '🤖 A analisar...' : '🤖 Analisar com IA'}

              </button>

            </div>



            {/* Resultado da análise */}

            {resultado && (

              <div className="bg-white rounded-2xl border border-stone-200 p-6">

                <div className="flex items-center gap-2 mb-4">

                  <h2 className="font-bold text-stone-900">🤖 2. Resultado da análise</h2>

                  <span className="text-xs bg-lime-100 text-lime-800 px-2 py-1 rounded-full font-semibold">

                    {GEMINI_KEY ? 'Gemini Flash' : 'Modo demo'}

                  </span>

                </div>

                <div className="flex flex-wrap gap-2 mb-3">

                  <span className="bg-lime-100 text-lime-900 px-3 py-1 rounded-full text-sm font-semibold">{resultado.especie}</span>

                  <span className="bg-lime-100 text-lime-900 px-3 py-1 rounded-full text-sm font-semibold">{resultado.raca_estimada}</span>

                  <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm">{resultado.cor_principal}</span>

                  {resultado.cores_secundarias?.map(c => (

                    <span key={c} className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm">{c}</span>

                  ))}

                  <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm">Porte {resultado.tamanho}</span>

                  {resultado.caracteristicas_distintivas?.map(c => (

                    <span key={c} className="bg-stone-50 text-stone-500 px-3 py-1 rounded-full text-sm border border-stone-200">{c}</span>

                  ))}

                </div>

                {resultado.confianca && (

                  <div className="text-xs text-stone-400">Confiança da análise: {Math.round(resultado.confianca * 100)}%</div>

                )}

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs">

                  ⚠️ <strong>Sugestão de apoio — não é confirmação.</strong> Confirma sempre presencialmente antes de contactar o dono.

                </div>

              </div>

            )}



            {erro && (

              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-sm flex flex-col gap-2">

                <span>{erro}</span>

                <button onClick={diagnosticarModelos} className="text-xs font-semibold text-red-800 hover:underline self-start">

                  🔍 Ver modelos disponíveis para esta chave (consola F12)

                </button>

              </div>

            )}

          </div>



          {/* Sugestões com follow-up */}

          <div className="bg-white rounded-2xl border border-stone-200 p-6">

            <h2 className="font-bold text-stone-900 mb-1">🔎 3. Possíveis correspondências</h2>

            {resultado ? (

              sugestoes.length > 0 ? (

                <>

                  <p className="text-xs text-stone-400 mb-4">

                    {sugestoes.length} resultado{sugestoes.length > 1 ? 's' : ''} · ordenados por grau de semelhança

                  </p>

                  <div className="flex flex-col gap-4">

                    {sugestoes.map(({ animal, score }, i) => {

                      const { label, cor } = labelScore(score)

                      return (

                        <div key={animal.id} className={`border-2 rounded-2xl overflow-hidden transition-all ${i === 0 && score >= 60 ? 'border-orange-400' : 'border-stone-200'

                          }`}>

                          {/* Header do cartão */}

                          <div className="p-4 flex gap-3">

                            <div className="w-16 h-16 rounded-xl bg-lime-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">

                              {animal.foto_url

                                ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover rounded-xl" />

                                : iconeEspecie(animal.especie)}

                            </div>

                            <div className="flex-1 min-w-0">

                              <div className="flex items-center justify-between gap-2 mb-1">

                                <span className="font-bold text-stone-900">{animal.nome}</span>

                                <span className={`text-sm font-black ${corScore(score)}`}>{score}%</span>

                              </div>

                              <div className="text-xs text-stone-400 mb-2">

                                {nomeEspecie(animal.especie)}{animal.raca && ` · ${animal.raca}`} · {animal.cor}

                              </div>

                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cor}`}>

                                {label}

                              </span>

                            </div>

                          </div>



                          {/* Barra de score */}

                          <div className="px-4 pb-2">

                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">

                              <div className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-lime-500' : score >= 40 ? 'bg-amber-400' : 'bg-stone-300'

                                }`} style={{ width: `${score}%` }} />

                            </div>

                          </div>



                          {/* Ações de follow-up */}

                          <div className={`px-4 py-3 border-t flex flex-wrap gap-2 ${i === 0 && score >= 60 ? 'bg-lime-50 border-lime-200' : 'bg-stone-50 border-stone-200'

                            }`}>

                            {score >= 60 && (

                              <div className="w-full text-xs font-semibold text-lime-900 mb-1">

                                🎯 Correspondência provável — toma uma ação:

                              </div>

                            )}

                            {score >= 30 && (

                              <>

                                <button

                                  onClick={() => handleReportarAvistamento(animal.id)}

                                  className="flex items-center gap-1.5 bg-lime-700 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-lime-800 transition-colors"

                                >

                                  👁 Reportar avistamento

                                </button>

                                <button

                                  onClick={() => handleContactarDono(animal.id, animal.nome)}

                                  className="flex items-center gap-1.5 bg-white text-stone-700 border border-stone-300 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors"

                                >

                                  💬 Contactar dono

                                </button>

                              </>

                            )}

                            <Link

                              to={`/animais/${animal.id}`}

                              className="flex items-center gap-1.5 bg-white text-stone-500 border border-stone-200 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors"

                            >

                              🐾 Ver perfil

                            </Link>

                          </div>

                        </div>

                      )

                    })}

                  </div>



                  {/* Nenhuma correspondência é o animal certo */}

                  <div className="mt-5 border-t border-stone-100 pt-4">

                    <p className="text-xs text-stone-400 mb-3">Nenhuma das sugestões é o animal correto?</p>

                    <Link to="/animais"

                      className="block w-full text-center border-2 border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">

                      🔍 Ver todos os animais desaparecidos

                    </Link>

                  </div>

                </>

              ) : (

                <div className="text-center py-10">

                  <div className="text-4xl mb-3">🔍</div>

                  <p className="text-stone-500 text-sm mb-2">Nenhuma correspondência encontrada na base de dados.</p>

                  <p className="text-stone-400 text-xs mb-5">O animal pode não estar registado ainda.</p>

                  <div className="flex flex-col gap-2">

                    <Link to="/animais"

                      className="block w-full text-center bg-lime-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-lime-800 transition-colors">

                      Ver todos os animais desaparecidos

                    </Link>

                  </div>

                </div>

              )

            ) : (

              <div className="text-center py-16 text-stone-300">

                <div className="text-5xl mb-4">🤖</div>

                <p className="text-sm text-stone-400">Carrega uma foto e clica em "Analisar com IA"<br />para ver as possíveis correspondências</p>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  )

}