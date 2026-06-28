import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import type { Animal } from '../types'

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
        let score = 0
        const esp = res.especie?.toLowerCase() || ''
        if ((esp.includes('cão') || esp.includes('cao') || esp.includes('dog')) && animal.especie === 'cao') score += 40
        else if ((esp.includes('gato') || esp.includes('cat')) && animal.especie === 'gato') score += 40
        const corAnimal = animal.cor.toLowerCase()
        if (res.cor_principal?.toLowerCase().includes(corAnimal) || corAnimal.includes(res.cor_principal?.toLowerCase() || '')) score += 25
        if (res.raca_estimada && animal.raca && animal.raca.toLowerCase().includes(res.raca_estimada.toLowerCase().split(' ')[0])) score += 20
        if (res.tamanho && animal.descricao?.toLowerCase().includes(res.tamanho.toLowerCase())) score += 15
        return Math.min(score, 100)
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
                const prompt = `Analisa esta imagem de um animal. Responde EXCLUSIVAMENTE em JSON válido, sem texto adicional, sem markdown, sem backticks. O JSON deve ter exatamente esta estrutura: {"especie": string, "raca_estimada": string, "cor_principal": string, "cores_secundarias": [string], "tamanho": "pequeno" ou "medio" ou "grande", "caracteristicas_distintivas": [string], "confianca": number entre 0 e 1}. Se não conseguires identificar, retorna {"erro": "nao_identificado"}.`
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
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
                const data = await response.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
                const clean = text.replace(/```json|```/g, '').trim()
                resultadoIA = JSON.parse(clean)
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
            }

            if ((resultadoIA as any).erro) {
                setErro('Não foi possível identificar um animal nesta fotografia. Tenta com uma imagem mais clara.')
                setAnalisando(false)
                return
            }

            setResultado(resultadoIA)

            const { data: animais } = await supabase
                .from('animais')
                .select('*')
                .neq('estado', 'encontrado')
                .order('created_at', { ascending: false })

            if (animais) {
                const scored = animais
                    .map(animal => ({ animal, score: calcularScore(resultadoIA, animal) }))
                    .filter(s => s.score >= 20)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                setSugestoes(scored)
            }

            mostrarToast('Análise concluída!', 'sucesso')
        } catch {
            setErro('Erro ao analisar a fotografia. Tenta novamente.')
        }
        setAnalisando(false)
    }

    const corScore = (score: number) => {
        if (score >= 70) return 'text-green-600'
        if (score >= 40) return 'text-amber-600'
        return 'text-stone-400'
    }

    const labelScore = (score: number) => {
        if (score >= 70) return { label: 'Correspondência provável', cor: 'bg-green-100 text-green-700 border-green-200' }
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
                                className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors mb-4"
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
                                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60"
                            >
                                {analisando ? '🤖 A analisar...' : '🤖 Analisar com IA'}
                            </button>
                        </div>

                        {/* Resultado da análise */}
                        {resultado && (
                            <div className="bg-white rounded-2xl border border-stone-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="font-bold text-stone-900">🤖 2. Resultado da análise</h2>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                        {GEMINI_KEY ? 'Gemini Flash' : 'Modo demo'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">{resultado.especie}</span>
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">{resultado.raca_estimada}</span>
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
                            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-sm">{erro}</div>
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
                                                        <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                                                            {animal.foto_url
                                                                ? <img src={animal.foto_url} alt={animal.nome} className="w-full h-full object-cover rounded-xl" />
                                                                : (animal.especie === 'gato' ? '🐈' : '🐕')}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <span className="font-bold text-stone-900">{animal.nome}</span>
                                                                <span className={`text-sm font-black ${corScore(score)}`}>{score}%</span>
                                                            </div>
                                                            <div className="text-xs text-stone-400 mb-2">
                                                                {animal.especie === 'cao' ? 'Cão' : 'Gato'}{animal.raca && ` · ${animal.raca}`} · {animal.cor}
                                                            </div>
                                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cor}`}>
                                                                {label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Barra de score */}
                                                    <div className="px-4 pb-2">
                                                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-400' : 'bg-stone-300'
                                                                }`} style={{ width: `${score}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Ações de follow-up */}
                                                    <div className={`px-4 py-3 border-t flex flex-wrap gap-2 ${i === 0 && score >= 60 ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'
                                                        }`}>
                                                        {score >= 60 && (
                                                            <div className="w-full text-xs font-semibold text-orange-700 mb-1">
                                                                🎯 Correspondência provável — toma uma ação:
                                                            </div>
                                                        )}
                                                        {score >= 30 && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleReportarAvistamento(animal.id)}
                                                                    className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-orange-700 transition-colors"
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
                                            className="block w-full text-center bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors">
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