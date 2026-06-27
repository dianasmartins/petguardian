import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
    const [visivel, setVisivel] = useState(false)
    const [personalizar, setPersonalizar] = useState(false)
    const [analiticos, setAnaliticos] = useState(true)
    const [funcionais, setFuncionais] = useState(true)

    useEffect(() => {
        const consentimento = localStorage.getItem('pg-cookies')
        if (!consentimento) {
            setTimeout(() => setVisivel(true), 800)
        }
    }, [])

    const guardar = (opcao: 'todos' | 'essenciais' | 'personalizado') => {
        const prefs = {
            essenciais: true,
            analiticos: opcao === 'todos' || (opcao === 'personalizado' && analiticos),
            funcionais: opcao === 'todos' || (opcao === 'personalizado' && funcionais),
            data: new Date().toISOString()
        }
        localStorage.setItem('pg-cookies', JSON.stringify(prefs))
        setVisivel(false)
    }

    if (!visivel) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[90] p-4 md:p-6">
            <div className="max-w-4xl mx-auto bg-stone-900 rounded-2xl shadow-2xl p-5 md:p-6">
                {!personalizar ? (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">🍪</span>
                                <span className="font-bold text-white text-sm">Utilizamos cookies</span>
                            </div>
                            <p className="text-stone-400 text-xs leading-relaxed">
                                Usamos cookies essenciais para o funcionamento da plataforma e, com o teu consentimento,
                                cookies analíticos e funcionais para melhorar a tua experiência.{' '}
                                <Link to="/definicoes" className="text-orange-400 hover:underline" onClick={() => setVisivel(false)}>
                                    Saber mais
                                </Link>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                            <button
                                onClick={() => setPersonalizar(true)}
                                className="px-4 py-2 text-xs font-semibold text-stone-400 border border-stone-700 rounded-xl hover:border-stone-500 hover:text-white transition-colors"
                            >
                                Personalizar
                            </button>
                            <button
                                onClick={() => guardar('essenciais')}
                                className="px-4 py-2 text-xs font-semibold text-stone-300 border border-stone-600 rounded-xl hover:bg-stone-800 transition-colors"
                            >
                                Recusar opcionais
                            </button>
                            <button
                                onClick={() => guardar('todos')}
                                className="px-4 py-2 text-xs font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                            >
                                Aceitar todos
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Personalizar cookies</h3>
                            <button onClick={() => setPersonalizar(false)} className="text-stone-400 hover:text-white text-sm">✕</button>
                        </div>
                        <div className="flex flex-col gap-3 mb-4">
                            {[
                                { label: 'Essenciais', desc: 'Necessários para o funcionamento. Não podem ser desativados.', checked: true, disabled: true, setter: null },
                                { label: 'Analíticos', desc: 'Ajudam-nos a perceber como usas a plataforma (sem dados pessoais).', checked: analiticos, disabled: false, setter: setAnaliticos },
                                { label: 'Funcionais', desc: 'Guardam preferências como o teu distrito favorito ou vista de mapa.', checked: funcionais, disabled: false, setter: setFuncionais },
                            ].map(item => (
                                <div key={item.label} className="flex items-start justify-between gap-4 py-2.5 border-b border-stone-800 last:border-0">
                                    <div>
                                        <div className="text-white text-sm font-medium">{item.label}</div>
                                        <div className="text-stone-400 text-xs mt-0.5">{item.desc}</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            disabled={item.disabled}
                                            onChange={e => item.setter && item.setter(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-stone-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600 peer-disabled:opacity-40"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => guardar('personalizado')}
                                className="px-5 py-2 text-sm font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                            >
                                Guardar preferências
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}