import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Animal {
    id: string
    nome: string
    especie: string
    raca: string
    cor: string
    descricao: string
    foto_url: string
    created_at: string
}

export default function IdentificarAnimal() {
    const [foto, setFoto] = useState<File | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<any>(null)
    const [matches, setMatches] = useState<Animal[]>([])
    const [animaisDB, setAnimaisDB] = useState<Animal[]>([])

    useEffect(() => {
        supabase
            .from('animais')
            .select('*')
            .eq('estado', 'desaparecido')
            .then(({ data }) => { if (data) setAnimaisDB(data) })
    }, [])

    const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFoto(file)
            setFotoPreview(URL.createObjectURL(file))
            setResultado(null)
            setMatches([])
        }
    }

    const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                resolve(base64)
            }
            reader.readAsDataURL(file)
        })
    }

    const analisar = async () => {
        if (!foto) return
        setLoading(true)
        setResultado(null)
        setMatches([])

        try {
            const base64 = await toBase64(foto)
            const apiKey = 'AIzaSyAEE_HnpmlF5UD1W0EbuIIHwO1nxmRtRQs'

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    text: `Analisa esta foto de um animal e responde APENAS com um objeto JSON sem markdown, sem backticks, sem explicações. O JSON deve ter exatamente esta estrutura:
{
  "especie": "cão" ou "gato" ou "outro",
  "cor_principal": "cor predominante em portugues",
  "cores": ["lista", "de", "cores"],
  "raca_estimada": "raca ou desconhecida",
  "tamanho": "pequeno" ou "medio" ou "grande",
  "caracteristicas": ["lista de marcas ou caracteristicas distintivas"]
}`
                                },
                                {
                                    inline_data: {
                                        mime_type: foto.type,
                                        data: base64
                                    }
                                }
                            ]
                        }]
                    })
                }
            )

            const data = await response.json()
            const texto = data.candidates?.[0]?.content?.parts?.[0]?.text

            console.log('resposta da API:', JSON.stringify(data))
            if (!texto) throw new Error('Sem resposta da IA')

            const analise = JSON.parse(texto.trim())
            setResultado(analise)

            // Compara com animais da base de dados
            const candidatos = animaisDB.filter(animal => {
                let score = 0
                if (animal.especie?.toLowerCase() === analise.especie?.toLowerCase()) score += 3
                if (analise.cores?.some((c: string) => animal.cor?.toLowerCase().includes(c.toLowerCase()))) score += 2
                if (analise.cor_principal && animal.cor?.toLowerCase().includes(analise.cor_principal.toLowerCase())) score += 2
                if (analise.raca_estimada && analise.raca_estimada !== 'desconhecida' && animal.raca?.toLowerCase().includes(analise.raca_estimada.toLowerCase())) score += 3
                return score >= 2
            })

            setMatches(candidatos)
        } catch (err) {
            console.error(err)
            setResultado({ erro: 'Não foi possível analisar a imagem. Tenta novamente.' })
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50">

            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <a href="/" className="text-xl font-bold text-orange-500">PetGuardian</a>
                <div className="flex gap-4 items-center">
                    <a href="/animais" className="text-gray-500 text-sm hover:text-orange-500">Animais</a>
                    <a href="/mapa" className="text-gray-500 text-sm hover:text-orange-500">Mapa</a>
                    <a href="/login" className="text-gray-500 text-sm hover:text-orange-500">Entrar</a>
                </div>
            </nav>

            <div className="bg-orange-500 px-6 py-10 text-white text-center">
                <h1 className="text-3xl font-bold mb-2">Encontraste um animal?</h1>
                <p className="text-orange-100">Carrega uma foto e a IA verifica se corresponde a algum animal desaparecido</p>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-10">

                <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                    <h2 className="font-bold text-gray-800 mb-4">1. Carrega uma foto do animal encontrado</h2>

                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFoto}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
                    />

                    {fotoPreview && (
                        <img
                            src={fotoPreview}
                            alt="Animal encontrado"
                            className="w-full h-64 object-cover rounded-xl mb-4"
                        />
                    )}

                    <button
                        onClick={analisar}
                        disabled={!foto || loading}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition disabled:opacity-50"
                    >
                        {loading ? 'A analisar com IA...' : 'Analisar foto'}
                    </button>
                </div>

                {resultado && !resultado.erro && (
                    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                        <h2 className="font-bold text-gray-800 mb-4">2. Resultado da análise</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Espécie</p>
                                <p className="font-medium text-gray-800 capitalize">{resultado.especie}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Raça estimada</p>
                                <p className="font-medium text-gray-800 capitalize">{resultado.raca_estimada}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Cor principal</p>
                                <p className="font-medium text-gray-800 capitalize">{resultado.cor_principal}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-1">Tamanho</p>
                                <p className="font-medium text-gray-800 capitalize">{resultado.tamanho}</p>
                            </div>
                        </div>
                        {resultado.caracteristicas?.length > 0 && (
                            <div className="mt-3 bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400 mb-2">Características identificadas</p>
                                <div className="flex flex-wrap gap-2">
                                    {resultado.caracteristicas.map((c: string, i: number) => (
                                        <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {resultado?.erro && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                        <p className="text-red-600">{resultado.erro}</p>
                    </div>
                )}

                {resultado && !resultado.erro && (
                    <div className="bg-white rounded-2xl shadow-sm border p-6">
                        <h2 className="font-bold text-gray-800 mb-2">3. Possíveis correspondências</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            {matches.length > 0
                                ? `Encontrámos ${matches.length} animal${matches.length !== 1 ? 'is' : ''} com características semelhantes`
                                : 'Não encontrámos correspondências na base de dados. O animal pode não ter sido registado ainda.'}
                        </p>

                        {matches.length > 0 && (
                            <div className="flex flex-col gap-4">
                                {matches.map(animal => (
                                    <div key={animal.id} className="flex gap-4 border rounded-xl p-4 hover:bg-orange-50 transition">
                                        {animal.foto_url ? (
                                            <img src={animal.foto_url} alt={animal.nome} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                                        ) : (
                                            <div className="w-20 h-20 bg-orange-50 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">🐾</div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{animal.nome}</h3>
                                            <p className="text-gray-500 text-sm">{animal.especie}{animal.raca ? ` · ${animal.raca}` : ''}</p>
                                            <p className="text-gray-400 text-sm">Cor: {animal.cor}</p>
                                            {animal.descricao && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{animal.descricao}</p>}
                                        </div>
                                    </div>
                                ))}
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-2">
                                    <p className="text-orange-700 text-sm font-medium">Reconheces este animal?</p>
                                    <p className="text-orange-600 text-xs mt-1">Cria uma conta para submeter um avistamento e notificar o dono.</p>
                                    <a href="/registo" className="inline-block mt-3 bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                                        Criar conta e reportar
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <footer className="bg-gray-800 text-gray-400 px-6 py-8 text-center text-sm mt-10">
                <p className="text-white font-bold mb-1">PetGuardian</p>
                <p>Desenvolvido por Diana Soares Martins - Licenciatura em GSC - 2026</p>
            </footer>
        </div>
    )
}