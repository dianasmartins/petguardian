import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Animal {
    id: string
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

const badgeEstado = (estado: string) => {
    const estilos: Record<string, { bg: string; cor: string }> = {
        desaparecido: { bg: '#fee2e2', cor: '#b91c1c' },
        avistado: { bg: '#fef3c7', cor: '#b45309' },
        encontrado: { bg: '#dcfce7', cor: '#15803d' },
    }
    return estilos[estado] || { bg: '#f3f4f6', cor: '#374151' }
}

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

export default function Animais() {
    const [animais, setAnimais] = useState<Animal[]>([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [filtroEspecie, setFiltroEspecie] = useState('todos')
    const [filtroDistrito, setFiltroDistrito] = useState('')
    const [filtroConselho, setFiltroConselho] = useState('')
    const [pesquisa, setPesquisa] = useState('')

    const conselhos = filtroDistrito ? DISTRITOS[filtroDistrito] : []

    useEffect(() => {
        const carregar = async () => {
            setLoading(true)
            let query = supabase.from('animais').select('*').order('created_at', { ascending: false })
            if (filtroEstado !== 'todos') query = query.eq('estado', filtroEstado)
            if (filtroEspecie !== 'todos') query = query.eq('especie', filtroEspecie)
            const { data } = await query
            if (data) setAnimais(data)
            setLoading(false)
        }
        carregar()
    }, [filtroEstado, filtroEspecie])

    const animaisFiltrados = animais.filter(a => {
        if (pesquisa && !a.nome.toLowerCase().includes(pesquisa.toLowerCase()) && !a.raca?.toLowerCase().includes(pesquisa.toLowerCase())) return false
        return true
    })

    return (
        <div className="min-h-screen bg-gray-50">

            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <a href="/" className="text-xl font-bold text-orange-500">PetGuardian</a>
                <div className="flex gap-4 items-center">
                    <a href="/animais" className="text-orange-500 font-medium text-sm">Animais</a>
                    <a href="/mapa" className="text-gray-500 text-sm hover:text-orange-500">Mapa</a>
                    <a href="/login" className="text-gray-500 text-sm hover:text-orange-500">Entrar</a>
                    <a href="/registo" className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                        Criar conta
                    </a>
                </div>
            </nav>

            <div className="bg-orange-500 px-6 py-10 text-white text-center">
                <h1 className="text-3xl font-bold mb-2">Animais desaparecidos</h1>
                <p className="text-orange-100 mb-6">Ajuda a reunir estes animais com as suas familias</p>
                <div className="max-w-md mx-auto">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou raca..."
                        value={pesquisa}
                        onChange={e => setPesquisa(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-gray-800 focus:outline-none shadow"
                    />
                </div>
            </div>

            <div className="bg-white border-b px-6 py-3 flex flex-wrap gap-3 items-center">
                <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    <option value="todos">Todos os estados</option>
                    <option value="desaparecido">Desaparecido</option>
                    <option value="avistado">Avistado</option>
                    <option value="encontrado">Encontrado</option>
                </select>

                <select
                    value={filtroEspecie}
                    onChange={e => setFiltroEspecie(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                    <option value="todos">Todas as especies</option>
                    <option value="cao">Cao</option>
                    <option value="gato">Gato</option>
                    <option value="outro">Outro</option>
                </select>

                <select
                    value={filtroDistrito}
                    onChange={e => { setFiltroDistrito(e.target.value); setFiltroConselho('') }}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                        className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <option value="">Todos os concelhos</option>
                        {conselhos.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                )}

                <span className="ml-auto text-sm text-gray-400">
                    {animaisFiltrados.length} {animaisFiltrados.length !== 1 ? 'animais' : 'animal'}
                </span>

                <a href="/mapa" className="bg-orange-500 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-orange-600 transition">
                    Ver no mapa
                </a>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="text-center text-gray-400 py-20">A carregar...</div>
                ) : animaisFiltrados.length === 0 ? (
                    <div className="text-center text-gray-400 py-20">
                        <p className="text-lg">Nenhum animal encontrado</p>
                        <p className="text-sm mt-1">Tenta ajustar os filtros</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {animaisFiltrados.map(animal => {
                            const badge = badgeEstado(animal.estado)
                            return (
                                <div key={animal.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition">
                                    {animal.foto_url ? (
                                        <img
                                            src={animal.foto_url}
                                            alt={animal.nome}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-orange-50 flex items-center justify-center text-5xl">
                                            🐾
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-800 text-lg">{animal.nome}</h3>
                                            <span
                                                className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                                                style={{ background: badge.bg, color: badge.cor }}
                                            >
                                                {animal.estado}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm">
                                            {animal.especie}{animal.raca ? ` · ${animal.raca}` : ''}
                                        </p>
                                        <p className="text-gray-400 text-sm">Cor: {animal.cor}</p>
                                        {animal.descricao && (
                                            <p className="text-gray-400 text-xs mt-2 line-clamp-2">{animal.descricao}</p>
                                        )}
                                        <div className="flex justify-between items-center mt-4">
                                            <p className="text-gray-300 text-xs">
                                                {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                                            </p>
                                            {animal.latitude && animal.longitude && (
                                                <a href="/mapa" className="text-orange-500 text-xs font-medium hover:underline">
                                                    Ver no mapa
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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
