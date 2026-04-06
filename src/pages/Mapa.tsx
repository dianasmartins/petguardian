import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

interface Animal {
    id: string
    dono_id: string
    nome: string
    especie: string
    raca: string
    cor: string
    descricao: string
    estado: string
    latitude: number
    longitude: number
    foto_url: string
    created_at: string
}

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DISTRITOS: Record<string, string[]> = {
    'Aveiro': ['Aveiro', 'Águeda', 'Albergaria-a-Velha', 'Anadia', 'Arouca', 'Castelo de Paiva', 'Espinho', 'Estarreja', 'Ílhavo', 'Mealhada', 'Murtosa', 'Oliveira de Azeméis', 'Oliveira do Bairro', 'Ovar', 'Santa Maria da Feira', 'São João da Madeira', 'Sever do Vouga', 'Vagos', 'Vale de Cambra'],
    'Beja': ['Beja', 'Aljustrel', 'Almodôvar', 'Alvito', 'Barrancos', 'Castro Verde', 'Ferreira do Alentejo', 'Mértola', 'Moura', 'Odemira', 'Ourique', 'Serpa', 'Vidigueira'],
    'Braga': ['Braga', 'Amares', 'Barcelos', 'Cabeceiras de Basto', 'Celorico de Basto', 'Esposende', 'Fafe', 'Guimarães', 'Póvoa de Lanhoso', 'Terras de Bouro', 'Vieira do Minho', 'Vila Nova de Famalicão', 'Vila Verde', 'Vizela'],
    'Bragança': ['Bragança', 'Alfândega da Fé', 'Carrazeda de Ansiães', 'Freixo de Espada à Cinta', 'Macedo de Cavaleiros', 'Miranda do Douro', 'Mirandela', 'Mogadouro', 'Torre de Moncorvo', 'Vila Flor', 'Vimioso', 'Vinhais'],
    'Castelo Branco': ['Castelo Branco', 'Belmonte', 'Covilhã', 'Fundão', 'Idanha-a-Nova', 'Oleiros', 'Penamacor', 'Proença-a-Nova', 'Sertã', 'Vila de Rei', 'Vila Velha de Ródão'],
    'Coimbra': ['Coimbra', 'Arganil', 'Cantanhede', 'Condeixa-a-Nova', 'Figueira da Foz', 'Góis', 'Lousã', 'Mira', 'Miranda do Corvo', 'Montemor-o-Velho', 'Oliveira do Hospital', 'Pampilhosa da Serra', 'Penacova', 'Penela', 'Soure', 'Tábua', 'Vila Nova de Poiares'],
    'Évora': ['Évora', 'Alandroal', 'Arraiolos', 'Borba', 'Estremoz', 'Montemor-o-Novo', 'Mora', 'Mourão', 'Portel', 'Redondo', 'Reguengos de Monsaraz', 'Vendas Novas', 'Viana do Alentejo', 'Vila Viçosa'],
    'Faro': ['Faro', 'Albufeira', 'Alcoutim', 'Aljezur', 'Castro Marim', 'Lagoa', 'Lagos', 'Loulé', 'Monchique', 'Olhão', 'Portimão', 'São Brás de Alportel', 'Silves', 'Tavira', 'Vila do Bispo', 'Vila Real de Santo António'],
    'Guarda': ['Guarda', 'Aguiar da Beira', 'Almeida', 'Celorico da Beira', 'Figueira de Castelo Rodrigo', 'Fornos de Algodres', 'Gouveia', 'Manteigas', 'Meda', 'Pinhel', 'Sabugal', 'Seia', 'Trancoso', 'Vila Nova de Foz Côa'],
    'Leiria': ['Leiria', 'Alcobaça', 'Alvaiázere', 'Ansião', 'Batalha', 'Bombarral', 'Caldas da Rainha', 'Castanheira de Pêra', 'Figueiró dos Vinhos', 'Marinha Grande', 'Nazaré', 'Óbidos', 'Pedrógão Grande', 'Peniche', 'Pombal', 'Porto de Mós'],
    'Lisboa': ['Lisboa', 'Alenquer', 'Arruda dos Vinhos', 'Azambuja', 'Cadaval', 'Cascais', 'Loures', 'Lourinhã', 'Mafra', 'Oeiras', 'Sintra', 'Sobral de Monte Agraço', 'Torres Vedras', 'Vila Franca de Xira', 'Amadora', 'Odivelas'],
    'Portalegre': ['Portalegre', 'Alter do Chão', 'Arronches', 'Avis', 'Campo Maior', 'Castelo de Vide', 'Crato', 'Elvas', 'Fronteira', 'Gavião', 'Marvão', 'Monforte', 'Nisa', 'Ponte de Sor', 'Sousel'],
    'Porto': ['Porto', 'Amarante', 'Baião', 'Felgueiras', 'Gondomar', 'Lousada', 'Maia', 'Marco de Canaveses', 'Matosinhos', 'Paços de Ferreira', 'Paredes', 'Penafiel', 'Póvoa de Varzim', 'Santo Tirso', 'Trofa', 'Valongo', 'Vila do Conde', 'Vila Nova de Gaia'],
    'Santarém': ['Santarém', 'Abrantes', 'Alcanena', 'Almeirim', 'Alpiarça', 'Benavente', 'Cartaxo', 'Chamusca', 'Constância', 'Coruche', 'Entroncamento', 'Ferreira do Zêzere', 'Golega', 'Mação', 'Rio Maior', 'Salvaterra de Magos', 'Sardoal', 'Tomar', 'Torres Novas', 'Vila Nova da Barquinha', 'Ourém'],
    'Setúbal': ['Setúbal', 'Alcácer do Sal', 'Alcochete', 'Almada', 'Barreiro', 'Grândola', 'Moita', 'Montijo', 'Palmela', 'Santiago do Cacém', 'Seixal', 'Sesimbra', 'Sines'],
    'Viana do Castelo': ['Viana do Castelo', 'Arcos de Valdevez', 'Caminha', 'Melgaço', 'Monção', 'Paredes de Coura', 'Ponte da Barca', 'Ponte de Lima', 'Valença', 'Vila Nova de Cerveira'],
    'Vila Real': ['Vila Real', 'Alijó', 'Boticas', 'Chaves', 'Mesão Frio', 'Mondim de Basto', 'Montalegre', 'Murça', 'Peso da Régua', 'Ribeira de Pena', 'Sabrosa', 'Santa Marta de Penaguião', 'Valpaços', 'Vila Pouca de Aguiar'],
    'Viseu': ['Viseu', 'Armamar', 'Carregal do Sal', 'Castro Daire', 'Cinfães', 'Lamego', 'Mangualde', 'Moimenta da Beira', 'Mortágua', 'Nelas', 'Oliveira de Frades', 'Penalva do Castelo', 'Penedono', 'Resende', 'Santa Comba Dão', 'São João da Pesqueira', 'São Pedro do Sul', 'Sátão', 'Sernancelhe', 'Tabuaço', 'Tarouca', 'Tondela', 'Vila Nova de Paiva', 'Vouzela'],
    'Açores': ['Ponta Delgada', 'Angra do Heroísmo', 'Horta'],
    'Madeira': ['Funchal', 'Câmara de Lobos', 'Ribeira Brava', 'Santana', 'Machico'],
}

const iconePorEstado = (estado: string) => {
    const cor = estado === 'desaparecido' ? 'red' : estado === 'avistado' ? 'orange' : 'green'
    return L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${cor};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    })
}

const badgeEstado = (estado: string) => {
    const estilos: Record<string, string> = {
        desaparecido: 'background:#fee2e2;color:#b91c1c',
        avistado: 'background:#fef3c7;color:#b45309',
        encontrado: 'background:#dcfce7;color:#15803d',
    }
    return estilos[estado] || 'background:#f3f4f6;color:#374151'
}

export default function Mapa() {
    const [animais, setAnimais] = useState<Animal[]>([])
    const [vista, setVista] = useState<'mapa' | 'lista'>('mapa')
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [filtroEspecie, setFiltroEspecie] = useState('todos')
    const [filtroDistrito, setFiltroDistrito] = useState('')
    const [filtroConselho, setFiltroConselho] = useState('')

    const conselhos = filtroDistrito ? DISTRITOS[filtroDistrito] : []

    useEffect(() => {
        const carregarAnimais = async () => {
            let query = supabase.from('animais').select('*')
            if (filtroEstado !== 'todos') query = query.eq('estado', filtroEstado)
            if (filtroEspecie !== 'todos') query = query.eq('especie', filtroEspecie)
            const { data } = await query
            if (data) setAnimais(data)
        }
        carregarAnimais()

        const canal = supabase
            .channel('animais')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animais' }, payload => {
                setAnimais(prev => [...prev, payload.new as Animal])
            })
            .subscribe()

        return () => { supabase.removeChannel(canal) }
    }, [filtroEstado, filtroEspecie])

    const animaisFiltrados = animais.filter(a => {
        if (filtroDistrito && filtroConselho) return a.descricao?.includes(filtroConselho)
        if (filtroDistrito) return a.descricao?.includes(filtroDistrito)
        return true
    })

    return (
        <div className="h-screen w-full flex flex-col">

            {/* Header */}
            <div className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center">
                <h1 className="font-bold text-lg">PetGuardian</h1>
                <div className="flex gap-4 items-center">
                    <a href="/registar-animal" className="bg-white text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-50">
                        + Registar Animal
                    </a>
                    <a href="/" className="text-white text-sm hover:underline">Sair</a>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-3 items-center">

                {/* Toggle mapa/lista */}
                <div className="flex rounded-lg border overflow-hidden mr-2">
                    <button
                        onClick={() => setVista('mapa')}
                        className={`px-4 py-1.5 text-sm font-medium transition ${vista === 'mapa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        🗺️ Mapa
                    </button>
                    <button
                        onClick={() => setVista('lista')}
                        className={`px-4 py-1.5 text-sm font-medium transition ${vista === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        📋 Lista
                    </button>
                </div>

                <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="todos">Todos os estados</option>
                    <option value="desaparecido">Desaparecido</option>
                    <option value="avistado">Avistado</option>
                    <option value="encontrado">Encontrado</option>
                </select>

                <select
                    value={filtroEspecie}
                    onChange={e => setFiltroEspecie(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="todos">Todas as espécies</option>
                    <option value="cão">Cão</option>
                    <option value="gato">Gato</option>
                    <option value="outro">Outro</option>
                </select>

                <select
                    value={filtroDistrito}
                    onChange={e => { setFiltroDistrito(e.target.value); setFiltroConselho('') }}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    <option value="">Todos os distritos</option>
                    {Object.keys(DISTRITOS).map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>

                {filtroDistrito && (
                    <select
                        value={filtroConselho}
                        onChange={e => setFiltroConselho(e.target.value)}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Todos os concelhos</option>
                        {conselhos.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                )}

                {/* Legenda */}
                <div className="flex gap-3 ml-auto text-xs text-gray-600 items-center">
                    <span className="flex items-center gap-1">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'red', display: 'inline-block' }}></span>
                        Desaparecido
                    </span>
                    <span className="flex items-center gap-1">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'orange', display: 'inline-block' }}></span>
                        Avistado
                    </span>
                    <span className="flex items-center gap-1">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'green', display: 'inline-block' }}></span>
                        Encontrado
                    </span>
                </div>
            </div>

            {/* Vista Mapa */}
            {vista === 'mapa' && (
                <MapContainer center={[39.5, -8.0]} zoom={7} className="flex-1">
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {animaisFiltrados.map(animal => (
                        animal.latitude && animal.longitude ? (
                            <Marker
                                key={animal.id}
                                position={[animal.latitude, animal.longitude]}
                                icon={iconePorEstado(animal.estado)}
                            >
                                <Popup>
                                    <div style={{ minWidth: '160px' }}>
                                        {animal.foto_url && (
                                            <img
                                                src={animal.foto_url}
                                                alt={animal.nome}
                                                style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                                            />
                                        )}
                                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{animal.nome}</p>
                                        <p style={{ color: '#666', fontSize: '13px' }}>{animal.especie} · {animal.cor}</p>
                                        {animal.raca && <p style={{ color: '#666', fontSize: '13px' }}>{animal.raca}</p>}
                                        {animal.descricao && <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{animal.descricao}</p>}
                                        <p style={{ fontSize: '11px', marginTop: '6px', fontWeight: 'bold', ...Object.fromEntries(badgeEstado(animal.estado).split(';').map(s => s.split(':').map(x => x.trim()))) }}>
                                            {animal.estado.toUpperCase()}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>
            )}

            {/* Vista Lista */}
            {vista === 'lista' && (
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                    {animaisFiltrados.length === 0 ? (
                        <div className="text-center text-gray-400 mt-20">
                            <p className="text-lg">Nenhum animal encontrado</p>
                            <p className="text-sm mt-1">Tenta ajustar os filtros</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                            {animaisFiltrados.map(animal => (
                                <div key={animal.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    {animal.foto_url ? (
                                        <img
                                            src={animal.foto_url}
                                            alt={animal.nome}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-300 text-5xl">
                                            🐾
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-800 text-lg">{animal.nome}</h3>
                                            <span
                                                className="text-xs font-medium px-2 py-1 rounded-full"
                                                style={{ background: badgeEstado(animal.estado).split(';')[0].split(':')[1], color: badgeEstado(animal.estado).split(';')[1].split(':')[1] }}
                                            >
                                                {animal.estado}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm">{animal.especie}{animal.raca ? ` · ${animal.raca}` : ''}</p>
                                        <p className="text-gray-500 text-sm">Cor: {animal.cor}</p>
                                        {animal.descricao && (
                                            <p className="text-gray-400 text-xs mt-2 line-clamp-2">{animal.descricao}</p>
                                        )}
                                        <p className="text-gray-300 text-xs mt-3">
                                            {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}