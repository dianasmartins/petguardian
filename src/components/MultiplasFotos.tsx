import { useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

interface Props {
    fotos: File[]
    previews: string[]
    onChange: (fotos: File[], previews: string[]) => void
    max?: number
    label?: string
}

export default function MultiplasFotos({ fotos, previews, onChange, max = 5, label = 'Fotos' }: Props) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [comprimindo, setComprimindo] = useState(false)

    const handleFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const disponiveis = max - fotos.length
        if (disponiveis <= 0) return

        const selecionadas = files.slice(0, disponiveis)
        setComprimindo(true)

        const novasFotos: File[] = []
        const novosPreviews: string[] = []

        for (const file of selecionadas) {
            try {
                const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true })
                novasFotos.push(compressed)
                novosPreviews.push(URL.createObjectURL(compressed))
            } catch {
                novasFotos.push(file)
                novosPreviews.push(URL.createObjectURL(file))
            }
        }

        setComprimindo(false)
        onChange([...fotos, ...novasFotos], [...previews, ...novosPreviews])
        // Reset input
        if (fileRef.current) fileRef.current.value = ''
    }

    const remover = (index: number) => {
        const novasFotos = fotos.filter((_, i) => i !== index)
        const novosPreviews = previews.filter((_, i) => i !== index)
        onChange(novasFotos, novosPreviews)
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-stone-500">{label}</label>
                <span className="text-xs text-stone-400">{fotos.length}/{max} fotos</span>
            </div>

            {/* Grid de previews */}
            {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {previews.map((preview, i) => (
                        <div key={i} className="relative group aspect-square">
                            <img src={preview} alt={`Foto ${i + 1}`}
                                className="w-full h-full object-cover rounded-xl border-2 border-stone-200" />
                            <button
                                type="button"
                                onClick={() => remover(i)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                                ✕
                            </button>
                            {i === 0 && (
                                <span className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                    Principal
                                </span>
                            )}
                        </div>
                    ))}

                    {/* Botão adicionar mais */}
                    {fotos.length < max && (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={comprimindo}
                            className="aspect-square border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
                        >
                            <span className="text-2xl">+</span>
                            <span className="text-xs mt-1">Adicionar</span>
                        </button>
                    )}
                </div>
            )}

            {/* Área de upload inicial */}
            {previews.length === 0 && (
                <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                    {comprimindo ? (
                        <>
                            <div className="text-3xl mb-2">⏳</div>
                            <p className="text-stone-500 text-sm">A comprimir fotos...</p>
                        </>
                    ) : (
                        <>
                            <div className="text-4xl mb-3">📷</div>
                            <p className="text-stone-600 text-sm font-medium">Clica para adicionar fotos</p>
                            <p className="text-stone-400 text-xs mt-1">Até {max} fotos · JPG, PNG · máx. 5MB cada</p>
                            <p className="text-stone-400 text-xs mt-0.5">A primeira foto será a imagem principal</p>
                        </>
                    )}
                </div>
            )}

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotos}
                className="hidden"
            />

            {comprimindo && previews.length > 0 && (
                <p className="text-xs text-stone-400 text-center">A comprimir fotos...</p>
            )}
        </div>
    )
}