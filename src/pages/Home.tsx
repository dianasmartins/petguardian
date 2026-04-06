import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function UltimasOcorrencias() {
    const [animais, setAnimais] = useState<any[]>([])

    useEffect(() => {
        supabase
            .from('animais')
            .select('*')
            .eq('estado', 'desaparecido')
            .order('created_at', { ascending: false })
            .limit(4)
            .then(({ data }) => { if (data) setAnimais(data) })
    }, [])

    return (
        <section className="py-20 px-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Últimas ocorrências</h2>
                <p className="text-center text-gray-400 mb-12">Animais recentemente reportados como desaparecidos</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {animais.map(animal => (
                        <div key={animal.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition">
                            {animal.foto_url ? (
                                <img src={animal.foto_url} alt={animal.nome} className="w-full h-44 object-cover" />
                            ) : (
                                <div className="w-full h-44 bg-orange-50 flex items-center justify-center text-5xl">🐾</div>
                            )}
                            <div className="p-4">
                                <h3 className="font-bold text-gray-800 mb-1">{animal.nome}</h3>
                                <p className="text-gray-400 text-sm">{animal.especie}{animal.raca ? ` · ${animal.raca}` : ''}</p>
                                <p className="text-gray-300 text-xs mt-2">
                                    {new Date(animal.created_at).toLocaleDateString('pt-PT')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <a href="/animais" className="bg-orange-500 text-white px-8 py-3 rounded-xl hover:bg-orange-600 transition inline-block font-medium">
                        Ver todos os animais
                    </a>
                </div>
            </div>
        </section>
    )
}

export default function Home() {
    const [stats, setStats] = useState({ total: 0, encontrados: 0, desaparecidos: 0 })

    useEffect(() => {
        const carregarStats = async () => {
            const { data } = await supabase.from('animais').select('estado')
            if (data) {
                setStats({
                    total: data.length,
                    encontrados: data.filter(a => a.estado === 'encontrado').length,
                    desaparecidos: data.filter(a => a.estado === 'desaparecido').length,
                })
            }
        }
        carregarStats()
    }, [])

    return (
        <div className="min-h-screen bg-white">

            {/* Navbar */}
            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <span className="text-xl font-bold text-orange-500">🐾 PetGuardian</span>
                <div className="flex gap-3">
                    <a href="/login" className="text-gray-600 text-sm hover:text-orange-500 px-4 py-2">Entrar</a>
                    <a href="/registo" className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                        Criar conta
                    </a>
                </div>
            </nav>

            {/* Hero */}
            <section className="bg-gradient-to-br from-orange-50 to-orange-100 px-6 py-24 text-center">
                <div className="max-w-3xl mx-auto">
                    <span className="text-6xl mb-6 block">🐾</span>
                    <h1 className="text-5xl font-bold text-gray-800 mb-4 leading-tight">
                        Encontra o teu<br />
                        <span className="text-orange-500">animal de estimação</span>
                    </h1>
                    <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
                        A plataforma portuguesa que liga donos, voluntários e associações para reunir animais desaparecidos com as suas famílias.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
                        <a href="/registo" className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-orange-600 transition shadow-lg">
                            Registar animal desaparecido
                        </a>
                        <a href="/animais" className="bg-white text-orange-500 border-2 border-orange-500 px-8 py-3 rounded-xl font-medium text-lg hover:bg-orange-50 transition">
                            Ver animais
                        </a>
                        <a href="/identificar" className="bg-orange-100 text-orange-600 border-2 border-orange-300 px-8 py-3 rounded-xl font-medium text-lg hover:bg-orange-200 transition">
                            Encontrei um animal
                        </a>
                    </div>
                </div>
            </section>

            {/* Estatísticas */}
            <section className="bg-orange-500 py-12 px-6">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center text-white">
                    <div>
                        <p className="text-4xl font-bold">{stats.total}</p>
                        <p className="text-orange-100 mt-1">Animais registados</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold">{stats.encontrados}</p>
                        <p className="text-orange-100 mt-1">Reunidos com família</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold">{stats.desaparecidos}</p>
                        <p className="text-orange-100 mt-1">À procura de casa</p>
                    </div>
                </div>
            </section>

            {/* Como funciona */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Como funciona</h2>
                    <p className="text-center text-gray-400 mb-14">Em três passos simples</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                            { num: '1', icon: '📝', titulo: 'Regista o animal', desc: 'Cria um perfil com foto, descrição e a localização onde o animal desapareceu. Leva menos de 2 minutos.' },
                            { num: '2', icon: '🗺️', titulo: 'Aparece no mapa', desc: 'O animal fica visível no mapa em tempo real para toda a comunidade — voluntários, associações e outros donos.' },
                            { num: '3', icon: '🤝', titulo: 'A comunidade ajuda', desc: 'Qualquer pessoa pode reportar um avistamento com foto e localização. Recebes uma notificação imediatamente.' },
                        ].map(passo => (
                            <div key={passo.num} className="text-center">
                                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                    {passo.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{passo.titulo}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{passo.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Últimas ocorrências */}
            <UltimasOcorrencias />

            {/* Testemunhos */}
            <section className="py-20 px-6 bg-orange-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">Histórias reais</h2>
                    <p className="text-center text-gray-400 mb-14">Famílias que encontraram os seus animais</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { nome: 'Ana Silva', local: 'Lisboa', texto: 'O Bolinhas desapareceu numa sexta-feira à noite. No domingo já estava em casa graças a um avistamento reportado por um vizinho no PetGuardian.', animal: '🐕' },
                            { nome: 'João Ferreira', local: 'Porto', texto: 'Nunca pensei que ia encontrar a Mimi. Passaram três semanas. Uma voluntária viu-a a três ruas de distância e registou no mapa.', animal: '🐈' },
                            { nome: 'Carla Santos', local: 'Braga', texto: 'A plataforma é fantástica. Em menos de 24 horas tínhamos cinco avistamentos do Rex. Estava a dois quilómetros de casa.', animal: '🐕' },
                        ].map((t, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                                <p className="text-4xl mb-4">{t.animal}</p>
                                <p className="text-gray-500 text-sm leading-relaxed mb-4 italic">"{t.texto}"</p>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{t.nome}</p>
                                    <p className="text-gray-400 text-xs">{t.local}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="py-20 px-6 bg-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Pronto para começar?</h2>
                    <p className="text-gray-400 mb-8">Cria a tua conta gratuitamente e ajuda a reunir animais com as suas famílias.</p>
                    <a href="/registo" className="bg-orange-500 text-white px-10 py-4 rounded-xl font-medium text-lg hover:bg-orange-600 transition shadow-lg inline-block">
                        Criar conta gratuita
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 text-gray-400 px-6 py-10">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-white font-bold text-lg mb-1">🐾 PetGuardian</p>
                        <p className="text-sm">A plataforma portuguesa de animais desaparecidos</p>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <a href="/mapa" className="hover:text-white transition">Mapa</a>
                        <a href="/registo" className="hover:text-white transition">Registar animal</a>
                        <a href="/login" className="hover:text-white transition">Entrar</a>
                    </div>
                    <div className="text-sm text-center">
                        <p>Desenvolvido por Diana Soares Martins</p>
                        <p>Licenciatura em Gestão de Sistemas e Computação · 2026</p>
                    </div>
                </div>
            </footer>

        </div>
    )
}