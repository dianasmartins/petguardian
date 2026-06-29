import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import imageCompression from 'browser-image-compression'

export default function Perfil() {
  const [nome, setNome] = useState('')
  const [telemovel, setTelemovel] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [novaFoto, setNovaFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { mostrarToast } = useToast()

  useEffect(() => {
    const fetchPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setNome(data.nome || '')
        setTelemovel(data.telemovel || '')
        setFotoPerfil(data.foto_url || null)
        setFotoPreview(data.foto_url || null)
      }
    }
    fetchPerfil()
  }, [])

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { mostrarToast('Foto muito grande. Máximo 5MB.', 'erro'); return }
    // Validate square-ish
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise(r => { img.onload = r })
    const ratio = img.width / img.height
    if (ratio < 0.5 || ratio > 2) {
      mostrarToast('Recomendamos uma foto próxima do formato quadrado.', 'info')
    }
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 400, useWebWorker: true })
      setNovaFoto(compressed)
      setFotoPreview(URL.createObjectURL(compressed))
    } catch {
      setNovaFoto(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) { setErro('O nome é obrigatório.'); return }
    if (telemovel && !/^[+]?[\d\s\-()]{7,20}$/.test(telemovel)) {
      setErro('Número de telemóvel inválido.')
      return
    }
    setGuardando(true)
    setErro('')

    let foto_url = fotoPerfil
    if (novaFoto && userId) {
      const ext = novaFoto.name.split('.').pop()
      const path = 'perfis/' + userId + '.' + ext
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, novaFoto, { upsert: true })
      if (!uploadError) {
        foto_url = supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
      }
    }

    const { error } = await supabase.from('profiles').update({ nome: nome.trim(), telemovel: telemovel || null, foto_url }).eq('id', userId)
    if (error) {
      setErro('Erro ao guardar. Tenta novamente.')
    } else {
      mostrarToast('Perfil atualizado!', 'sucesso')
    }
    setGuardando(false)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-8" style={{ fontFamily: 'Georgia, serif' }}>Editar perfil</h1>

        <form onSubmit={handleGuardar} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col gap-5">

          {/* Foto de perfil */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-full overflow-hidden bg-green-100 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-green-200"
              >
                {fotoPreview
                  ? <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                  : <span className="text-4xl text-green-600">{nome ? nome[0].toUpperCase() : '?'}</span>
                }
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-green-700 transition-colors shadow-md">
                ✏️
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-stone-700">Foto de perfil</p>
              <p className="text-xs text-stone-400 mt-0.5">Formato quadrado recomendado · máx. 5MB · JPG ou PNG</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFoto} className="hidden" />
          </div>

          <div className="border-t border-stone-100 pt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">Nome *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} required
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">Telemóvel</label>
              <input value={telemovel}
                onChange={e => setTelemovel(e.target.value.replace(/[^\d+\s\-()]/g, '').slice(0, 20))}
                placeholder="+351 912 345 678"
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm" />
              <p className="text-xs text-stone-400">Aceita formatos internacionais (+351, +44, +1, etc.)</p>
            </div>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}

          <button type="submit" disabled={guardando}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60">
            {guardando ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
