import { useState, useEffect } from 'react'



import { useNavigate } from 'react-router-dom'



import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'



import L from 'leaflet'



import { supabase } from '../lib/supabase'



import { useToast } from '../components/Toast'



import MultiplasFotos from '../components/MultiplasFotos'



import { OPCOES_ESPECIE } from '../lib/especies'







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







function MapCenter({ lat, lng }: { lat: number | null; lng: number | null }) {



  const map = useMap()



  useEffect(() => {



    if (lat && lng) {



      map.flyTo([lat, lng], 15, { duration: 1 })



    }



  }, [lat, lng])



  return null



}







const AUTOSAVE_KEY = 'pg-registo-animal'







export default function RegistarAnimal() {



  const [nome, setNome] = useState('')

  const [especie, setEspecie] = useState('cao')

  const [raca, setRaca] = useState('')

  const [cor, setCor] = useState('')
  
  const [corOlhos, setCorOlhos] = useState('')

  const [descricao, setDescricao] = useState('')

  const [apelo, setApelo] = useState('')



  const [lat, setLat] = useState<number | null>(null)



  const [lng, setLng] = useState<number | null>(null)



  const [morada, setMorada] = useState('')



  const [geocodingLoading, setGeocodingLoading] = useState(false)



  const [fotos, setFotos] = useState<File[]>([])



  const [fotosPreviews, setFotosPreviews] = useState<string[]>([])



  const [loading, setLoading] = useState(false)



  const [erro, setErro] = useState('')



  const [step, setStep] = useState(1)



  const [temRascunho, setTemRascunho] = useState(false)



  const navigate = useNavigate()



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



      setApelo(dados.apelo || '')



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



    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ nome, especie, raca, cor, corOlhos, descricao, apelo, lat, lng }))



  }, [nome, especie, raca, cor, corOlhos, descricao, lat, lng])







  const pesquisarMorada = async () => {



    if (!morada.trim()) return



    setGeocodingLoading(true)



    try {



      const res = await fetch(



        'https://nominatim.openstreetmap.org/search?format=json&q=' +



        encodeURIComponent(morada + ', Portugal') + '&limit=1'



      )



      const data = await res.json()



      if (data && data.length > 0) {



        setLat(parseFloat(data[0].lat))



        setLng(parseFloat(data[0].lon))



        mostrarToast('Localização encontrada: ' + data[0].display_name.split(',').slice(0, 2).join(','), 'sucesso')



      } else {



        mostrarToast('Morada não encontrada. Tenta ser mais específico ou clica no mapa.', 'erro')



      }



    } catch {



      mostrarToast('Erro ao pesquisar morada.', 'erro')



    }



    setGeocodingLoading(false)



  }







  const handleGPS = () => {



    if (!navigator.geolocation) { mostrarToast('GPS não disponível', 'erro'); return }



    navigator.geolocation.getCurrentPosition(



      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); mostrarToast('Localização GPS obtida!', 'sucesso') },



      () => mostrarToast('Não foi possível obter GPS. Clica no mapa.', 'info')



    )



  }







  const analisarFotoComIA = async (file: File): Promise<object | null> => {

    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

    console.log('=== INÍCIO ANÁLISE GEMINI ===')

    console.log('Chave Gemini carregada?', Boolean(GEMINI_KEY))

    if (!GEMINI_KEY) {

      console.error('VITE_GEMINI_API_KEY não foi encontrada.')

      mostrarToast('Chave da IA não configurada.', 'erro')

      return null

    }

    try {

      const base64 = await new Promise<string>((resolve, reject) => {

        const reader = new FileReader()

        reader.onload = () => {

          const partes = (reader.result as string)?.split(',')

          if (!partes || partes.length < 2) return reject(new Error('Falha ao converter a fotografia para Base64.'))

          resolve(partes[1])

        }

        reader.onerror = () => reject(new Error('Erro ao ler a fotografia.'))

        reader.readAsDataURL(file)

      })

      const prompt = 'Analisa esta imagem de um animal de estimação. Responde EXCLUSIVAMENTE em JSON válido, sem texto adicional, sem markdown, sem backticks. Estrutura: {"especie": string, "raca_estimada": string, "cor_principal": string, "cores_secundarias": [string], "tamanho": "pequeno" ou "medio" ou "grande", "caracteristicas_distintivas": [string], "confianca": number entre 0 e 1}. O campo "caracteristicas_distintivas" deve conter APENAS características físicas visíveis e objetivas.'

      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_KEY

      const response = await fetch(geminiUrl, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } }] }], generationConfig: { responseMimeType: 'application/json' } })

      })

      console.log('STATUS GEMINI:', response.status)

      if (!response.ok) {

        const erroTexto = await response.text()

        console.error('ERRO HTTP GEMINI:', response.status, erroTexto)

        mostrarToast(`Erro na análise IA (${response.status}).`, 'erro')

        return null

      }

      const data = await response.json()

      console.log('RESPOSTA COMPLETA GEMINI:', data)

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) throw new Error('Gemini respondeu sem conteúdo de texto.')

      const resultado: any = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim())

      if (!resultado?.especie) throw new Error('Resposta Gemini sem a estrutura esperada.')

      if (!Array.isArray(resultado.cores_secundarias)) resultado.cores_secundarias = []

      if (!Array.isArray(resultado.caracteristicas_distintivas)) resultado.caracteristicas_distintivas = []

      if (!['pequeno','medio','grande'].includes(resultado.tamanho)) resultado.tamanho = 'medio'

      const confianca = Number(resultado.confianca)

      resultado.confianca = Number.isFinite(confianca) ? Math.max(0, Math.min(confianca, 1)) : 0.5

      console.log('CARACTERÍSTICAS IA EXTRAÍDAS:', resultado)

      mostrarToast('Características extraídas com IA!', 'sucesso')

      return resultado

    } catch (err) {

      console.error('ERRO FINAL NA ANÁLISE GEMINI:', err)

      mostrarToast('Não foi possível analisar a fotografia com IA.', 'erro')

      return null

    }

  }



  const uploadFoto = async (file: File, userId: string, prefix: string): Promise<string | null> => {



    const ext = file.name.split('.').pop()



    const path = userId + '/' + prefix + '-' + Date.now() + '.' + ext



    const { error } = await supabase.storage.from('fotos').upload(path, file)



    if (error) return null



    return supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl



  }







  const handleSubmit = async (e: React.FormEvent) => {



    e.preventDefault()



    if (!lat || !lng) { setErro('Seleciona a localização no mapa ou usa o GPS.'); return }



    setLoading(true)



    setErro('')







    const { data: { user } } = await supabase.auth.getUser()



    if (!user) { mostrarToast('Sessão expirada.', 'erro'); setLoading(false); return }







    // Upload da foto principal



    let foto_url = null



    if (fotos.length > 0) {



      foto_url = await uploadFoto(fotos[0], user.id, 'principal')



    }







    // Análise IA da foto principal



    let caracteristicas_ia = null



    if (fotos.length > 0) {



      mostrarToast('A extrair características com IA...', 'info')



      caracteristicas_ia = await analisarFotoComIA(fotos[0])



    }







    // Inserir animal



    const { data: animal, error } = await supabase.from('animais').insert({



      dono_id: user.id, nome, especie, raca: raca || null, cor,
      descricao: descricao || null,
      cor_olhos: corOlhos || null,
      apelo: apelo || null,



      latitude: lat, longitude: lng, foto_url, estado: 'desaparecido', caracteristicas_ia



    }).select().single()







    if (error || !animal) {



      mostrarToast('Erro ao registar o animal. Tenta novamente.', 'erro')



      setLoading(false)



      return



    }







    // Upload das fotos adicionais



    if (fotos.length > 1) {



      mostrarToast('A guardar fotos adicionais...', 'info')



      for (let i = 1; i < fotos.length; i++) {



        const url = await uploadFoto(fotos[i], user.id, 'foto' + i)



        if (url) {



          await supabase.from('animal_fotos').insert({



            animal_id: animal.id, foto_url: url, ordem: i



          })



        }



      }



    }







    localStorage.removeItem(AUTOSAVE_KEY)



    mostrarToast('Animal registado com sucesso! 🐾', 'sucesso')



    setTimeout(() => navigate('/ocorrencias'), 500)



    setLoading(false)



  }







  const avancarStep1 = () => {



    if (!nome.trim()) { setErro('O nome é obrigatório.'); return }



    if (!cor.trim()) { setErro('A cor é obrigatória.'); return }



    setErro(''); setStep(2)



  }







  const avancarStep2 = () => {



    if (!lat || !lng) { setErro('Seleciona a localização no mapa ou usa o GPS.'); return }



    setErro(''); setStep(3)



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



          {['Dados', 'Localização', 'Fotos'].map((label, i) => (



            <div key={i} className={`flex-1 pb-2 text-center text-sm font-semibold border-b-2 transition-colors ${step === i + 1 ? 'border-lime-700 text-lime-800'



              : step > i + 1 ? 'border-emerald-500 text-emerald-600'



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



                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />



                  </div>



                  <div className="flex flex-col gap-1">



                    <label className="text-sm font-semibold text-stone-500">Espécie *</label>



                    <div className="grid grid-cols-3 gap-2">



                      {OPCOES_ESPECIE.map(([val, label]) => (



                        <button key={val} type="button" onClick={() => setEspecie(val)}



                          className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${especie === val ? 'border-lime-700 bg-lime-50 text-lime-800' : 'border-stone-200 text-stone-600'



                            }`}>{label}</button>



                      ))}



                    </div>



                  </div>



                  <div className="grid md:grid-cols-3 gap-3">



                    <div className="flex flex-col gap-1">



                      <label className="text-sm font-semibold text-stone-500">Raça</label>



                      <input value={raca} onChange={e => setRaca(e.target.value)} placeholder="Ex: Labrador"



                        className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />



                    </div>



                    <div className="flex flex-col gap-1">



                      <label className="text-sm font-semibold text-stone-500">Cor *</label>



                      <input value={cor} onChange={e => setCor(e.target.value)} placeholder="Ex: Castanho"



                        className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />



                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-stone-500">Cor dos olhos</label>
                      <input
                        value={corOlhos}
                        onChange={e => setCorOlhos(e.target.value)}
                        placeholder="Ex: Castanhos"
                        className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm"
                      />
                    </div>



                  </div>



                  <div className="flex flex-col gap-1">



                    <label className="text-sm font-semibold text-stone-500">Descrição</label>



                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}



                      placeholder="Coleira, marcas, comportamento..."



                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm resize-none" />



                  </div>



                  <div className="flex flex-col gap-1">



                    <label className="text-sm font-semibold text-stone-500">Mensagem de apelo <span className="text-stone-400 font-normal">(opcional)</span></label>



                    <textarea value={apelo} onChange={e => setApelo(e.target.value)} rows={2}



                      placeholder=""



                      className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm resize-none" />



                    <p className="text-xs text-stone-400">Esta mensagem aparece no anúncio do animal e aumenta o apelo emocional.</p>



                  </div>



                  {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}



                  <button type="button" onClick={avancarStep1}



                    className="w-full bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">



                    Seguinte: Localização →



                  </button>



                </div>



              </>



            )}







            {step === 2 && (



              <>



                <h2 className="font-bold text-stone-900 mb-5">Onde desapareceu?</h2>



                <div className="flex flex-col gap-4">



                  <div className="flex gap-2">



                    <input value={morada} onChange={e => setMorada(e.target.value)}



                      placeholder="Ex: Rua das Flores, Lisboa"



                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), pesquisarMorada())}



                      className="flex-1 px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />



                    <button type="button" onClick={pesquisarMorada} disabled={geocodingLoading}



                      className="bg-lime-700 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-lime-800 disabled:opacity-60 transition-colors whitespace-nowrap">



                      {geocodingLoading ? '...' : '🔍 Pesquisar'}



                    </button>



                  </div>



                  <div className="flex items-center gap-3 text-xs text-stone-400">



                    <div className="flex-1 h-px bg-stone-200"></div>



                    <span>ou</span>



                    <div className="flex-1 h-px bg-stone-200"></div>



                  </div>



                  <button type="button" onClick={handleGPS}



                    className="w-full bg-stone-100 text-stone-700 py-3 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">



                    📍 Usar GPS automático



                  </button>



                  {lat && lng && (



                    <div className="bg-lime-50 border border-lime-200 rounded-xl px-4 py-3 text-lime-800 text-sm">



                      ✓ {lat.toFixed(5)}°N, {lng.toFixed(5)}°W



                    </div>



                  )}



                  <p className="text-xs text-stone-400 text-center">Ou clica no mapa →</p>



                  {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}



                  <div className="flex gap-3">



                    <button type="button" onClick={() => { setErro(''); setStep(1) }}



                      className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors">← Voltar</button>



                    <button type="button" onClick={avancarStep2}



                      className="flex-1 bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors">Seguinte: Fotos →</button>



                  </div>



                </div>



              </>



            )}







            {step === 3 && (



              <form onSubmit={handleSubmit}>



                <h2 className="font-bold text-stone-900 mb-5">Fotos do animal</h2>



                <div className="flex flex-col gap-4">



                  <MultiplasFotos



                    fotos={fotos}



                    previews={fotosPreviews}



                    onChange={(f: File[], p: string[]) => { setFotos(f); setFotosPreviews(p) }}



                    max={5}



                    label="Fotos do animal (até 5)"



                  />







                  {fotos.length > 0 && (



                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-xs">



                      🤖 A IA vai analisar a primeira foto automaticamente para facilitar correspondências futuras.



                    </div>



                  )}







                  {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>}



                  <div className="flex gap-3">



                    <button type="button" onClick={() => { setErro(''); setStep(2) }}



                      className="flex-1 border-2 border-stone-200 text-stone-600 py-3 rounded-xl font-semibold hover:bg-stone-50 transition-colors">← Voltar</button>



                    <button type="submit" disabled={loading}



                      className="flex-1 bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors disabled:opacity-60">



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



              <h3 className="font-bold text-stone-900">📍 Confirma a localização exacta</h3>



              <p className="text-xs text-stone-400 mt-1">



                {lat && lng ? 'O marcador mostra o ponto exacto — arrasta o mapa ou clica para ajustar' : 'Usa o GPS, escreve a morada ou clica no mapa para marcar'}



              </p>



            </div>



            <div className="h-96 relative">



              <MapContainer center={[39.5, -8.0]} zoom={6} style={{ height: '100%', width: '100%' }}>



                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"



                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />



                <MapClick onMapClick={(lt, ln) => { setLat(lt); setLng(ln) }} />



                <MapCenter lat={lat} lng={lng} />



                {lat && lng && <Marker position={[lat, lng]} />}



              </MapContainer>



              {lat && lng && (



                <div className="absolute top-3 right-3 bg-white rounded-xl shadow-md px-3 py-2 text-xs font-semibold text-lime-800 border border-lime-200">



                  ✓ Localização marcada



                </div>



              )}



            </div>



            {lat && lng && (



              <div className="px-5 py-3 bg-lime-50 border-t border-lime-100 text-lime-800 text-sm flex items-center justify-between">



                <span>✓ {lat.toFixed(5)}°N, {lng.toFixed(5)}°W</span>



                <button type="button" onClick={() => { setLat(null); setLng(null) }}



                  className="text-xs text-lime-700 hover:underline font-semibold">



                  Limpar e marcar novamente



                </button>



              </div>



            )}



          </div>



        </div>



      </div>



    </div>



  )



}