import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import imageCompression from 'browser-image-compression'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClick({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
    return null
}

const AUTOSAVE_KEY = 'pg-registo-animal'

export default function RegistarAnimal() {
    const [nome, setNome] = useState('')
    const [especie, setEspecie] = useState('cao')
    const [raca, setRaca] = useState('')
    const [cor, setCor] = useState('')
    const [descricao, setDescricao] = useState('')
    const [lat, setLat] = useState<number | null>(null)
    const [lng, setLng] = useState<number | null>(null)
    const [foto, setFoto] = useState<File | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [step, setStep] = useState(1)
    const [temRascunho, setTemRascunho] = useState(false)
    const navigate = useNavigate()
    const fileRef = useRef<HTMLInputElement>(null)
    const { mostrarToast } = useToast()

    useEffect(() => {
        const guardado = localStorage.getItem(AUTOSAVE_KEY)
        if (guardado) {
            try {
                const dados = JSON.parse(guardado)
                if (dados.nome || dados.cor) setTemRascunho(true)
            } catch { }
        }
    }, [])

    const restaurarRascunho = () => {
        const guardado = localStorage.getItem(AUTOSAVE_KEY)
        if (!guardado) return
        try {
            const dados = JSON.parse(guardado)
            setNome(dados.nome || '')
            setEspecie(dados.especie || 'cao')
            setRaca(dados.raca || '')
            setCor(dados.cor || '')
            setDescricao(dados.descricao || '')
            if (dados.lat && dados.lng) { setLat(dados.lat); setLng(dados.lng) }
            setTemRascunho(false)
            mostrarToast('Rascunho restaurado!', 'info')
        } catch { }
    }

    const descartarRascunho = () => {
        localStorage.removeItem(AUTOSAVE_KEY)
        setTemRascunho(false)
    }

    useEffect(() => {
        if (!nome && !cor) return
        const dados = { nome, especie, raca, cor, descricao, lat, lng }
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dados))
    }, [nome, especie, raca, cor, descricao, lat, lng])

    const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            mostrarToast('A fotografia excede o limite de 5MB', 'erro')
            return
        }
        try {
            const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
            setFoto(compressed)
            setFotoPreview(URL.createObjectURL(compressed))
        } catch {
            setFoto(file)
            setFotoPreview(URL.createObjectURL(file))
        }
    }

    const handleGPS = () => {
        if (!navigator.geolocation) {
            mostrarToast('GPS não disponível neste dispositivo', 'erro')
            return
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLat(pos.coords.latitude)
                setLng(pos.coords.longitude)
                mostrarToast('Localização GPS obtida!', 'sucesso')
            },
            () => mostrarToast('Não foi possível obter GPS. Clica no mapa.', 'info')
        )
    }

    const analisarFotoComIA = async (file: File): Promise<object | null> => {
        const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
        if (!GEMINI_KEY) {
            // Modo demo — características baseadas nos dados introduzidos
            return {
                especie: especie,
                raca_estimada: raca || 'desconhecida',
                cor_principal: cor,
                cores_secundarias: [],
                tamanho: 'medio',
                caracteristicas_distintivas: descricao ? descricao.split(' ').slice(0, 5) : [],
                confianca: 0.5,
                modo: 'demo'
            }
        }
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve((reader.result as string).split(',')[1])
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
            const prompt = 'Analisa esta imagem de um animal de estimação. Responde EXCLUSIVAMENTE em JSON válido, sem texto adicional, sem markdown, sem backticks. Estrutura obrigatória: {"especie": string, "raca_estimada": string, "cor_principal": string, "cores_secundarias": [string], "tamanho": "pequeno" ou "medio" ou "grande", "caracteristicas_distintivas": [string com máximo 5 itens], "confianca": number entre 0 e 1}.'
            const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY
            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: file.type, data: base64 } }
                        ]
                    }]
                })
            })
            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            const clean = text.replace(/```json|```/g, '').trim()
            return JSON.parse(clean)
        } catch {
            return null
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lat || !lng) { setErro('Seleciona a localização no mapa ou usa o GPS.'); return }
        setLoading(true)
        setErro('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { mostrarToast('Sessão expirada. Faz login novamente.', 'erro'); setLoading(false); return }

        let foto_url = null
        if (foto) {
            const ext = foto.name.split('.').pop()
            const path = user.id + '/' + Date.now() + '.' + ext
            const { error: uploadError } = await supabase.storage.from('fotos').upload(path, foto)
            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
                foto_url = urlData.publicUrl
            }
        }

        // Analisa foto com IA
        let caracteristicas_ia = null
        if (foto) {
            mostrarToast('A extrair características com IA...', 'info')
            caracteristicas_ia = await analisarFotoComIA(foto)
        }

        const { error } = await supabase.from('animais').insert({
            dono_id: user.id,
            nome, especie, raca: raca || null, cor, descricao,
            latitude: lat, longitude: lng, foto_url, estado: 'desaparecido',
            caracteristicas_ia
        })

        if (error) {
            mostrarToast('Erro ao registar o animal. Tenta novamente.', 'erro')
        } else {
            localStorage.removeItem(AUTOSAVE_KEY)
            mostrarToast('Animal registado com sucesso! 🐾', 'sucesso')
            setTimeout(() => navigate('/ocorrencias'), 500)
        }
        setLoading(false)
    }

    const avancarStep1 = () => {
        if (!nome.trim()) { setErro('O nome é obrigatório.'); return }
        if (!cor.trim()) { setErro('A cor é obrigatória.'); return }
        setErro('')
        setStep(2)
    }

    const avancarStep2 = () => {
        if (!lat || !lng) { setErro('Seleciona a localização no mapa ou usa o GPS.'); return }
        setErro('')
        setStep(3)
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                        Registar animal desaparecido
                    </h1>
                    <p className="text-stone-500 mt-1">Preenche os dados — leva menos de 2 minutos</p>
                </div>

                {temRascunho && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
                        <div>
                            <div className="font-semibold text-amber-800 text-sm">Encontrámos um registo não concluído</div>
                            <div className="text-amber-600 text-xs mt-0.5">Queres continuar de onde ficaste?</div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={descartarRascunho} className="text-xs text-amber-600 hover:text-amber-800 px-3 py-1.5 rounded-lg">Descartar</button>
                            <button onClick={restaurarRascunho} className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700">Continuar</button>
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div className="flex gap-0 mb-8">
                    {['Dados', 'Localização', 'Foto'].map((label, i) => (
                        <div key={i} className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-colors ${step === i + 1 ? 'border-orange-600 text-orange-600'
                                : step > i + 1 ? 'border-green-500 text-green-600'
                                    : 'border-stone-200 text-stone-400'
                            }`}>
                            {step > i + 1 ? '✓ ' : ''}{label}
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-stone-200 p-6">

                        {step === 1 && (
                            <>
                                <h2 className="font-bold text-stone-900 mb-5">Dados do animal</h2>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-semibold text-stone-500">Nome *</label>
                                        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bolinhas"
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-semibold text-stone-500">Espécie *</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[['cao', '🐕 Cão'], ['gato', '🐈 Gato'], ['outro', '🐾 Outro']].map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => setEspecie(val)}
                                                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${especie === val ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-stone-200 text-stone-600'
                                                        }`}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-semibold text-stone-500">Raça</label>
                                            <input value={raca} onChange={e => setRaca(e.target.value)} placeholder="Ex: Labrador"
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-semibold text-stone-500">Cor *</label>
                                            <input value={cor} onChange={e => setCor(e.target.value)} placeholder="Ex: Castanho"
                                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-semibold text-stone-500">Descrição (coleira, marcas, comportamento)</label>
                                        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                                            placeholder="Descreve características que ajudem a identificar o animal..."
                                            className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-orange-500 focus:outline-none text-sm resize-none" />
                                    </div>
                                    {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}
                                    <button type="button" onClick={avancarStep1}
                                        className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                                        Seguinte: Localização →
                                    </button>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <h2 className="font-bold text-stone-900 mb-5">Onde desapareceu?</h2>
                                <div className="flex flex-col gap-4">
                                    <button type="button" onClick={handleGPS}
                                        className="w-full bg-stone-100 text-stone-700 py-3 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                                        📍 Usar GPS automático
                                    </button>
                                    {lat && lng && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
                                            ✓ Localização selecionada: {lat.toFixed(5)}°N, {lng.toFixed(5)}°W
                                        </div>
                                    )}
                                    <p className="text-xs text-stone-400 text-center">Ou clica directamente no mapa →</p>
                                    {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setErro(''); setStep(1) }}
                                            className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors">
                                            ← Voltar
                                        </button>
                                        <button type="button" onClick={avancarStep2}
                                            className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                                            Seguinte: Foto →
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleSubmit}>
                                <h2 className="font-bold text-stone-900 mb-5">Foto do animal</h2>
                                <div className="flex flex-col gap-4">
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                                    >
                                        {fotoPreview ? (
                                            <img src={fotoPreview} alt="Preview" className="max-h-40 mx-auto rounded-xl object-cover" />
                                        ) : (
                                            <>
                                                <div className="text-4xl mb-3">📷</div>
                                                <p className="text-stone-500 text-sm font-medium">Clica para adicionar uma foto</p>
                                                <p className="text-stone-400 text-xs mt-1">JPG, PNG · máx. 5MB</p>
                                            </>
                                        )}
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />

                                    {foto && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-xs">
                                            🤖 A IA vai analisar esta foto automaticamente para facilitar correspondências futuras.
                                        </div>
                                    )}

                                    {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setErro(''); setStep(2) }}
                                            className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors">
                                            ← Voltar
                                        </button>
                                        <button type="submit" disabled={loading}
                                            className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-60">
                                            {loading ? 'A registar...' : '✓ Registar animal'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Mini mapa */}
                    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-100">
                            <h3 className="font-bold text-stone-900">Clica no mapa para marcar a localização</h3>
                            <p className="text-xs text-stone-400 mt-1">Podes afinar o ponto com zoom</p>
                        </div>
                        <div className="h-96">
                            <MapContainer center={[39.5, -8.0]} zoom={6} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                                <MapClick onMapClick={(lt, ln) => { setLat(lt); setLng(ln) }} />
                                {lat && lng && <Marker position={[lat, lng]} />}
                            </MapContainer>
                        </div>
                        {lat && lng && (
                            <div className="px-5 py-3 bg-green-50 border-t border-green-100 text-green-700 text-sm">
                                ✓ {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}