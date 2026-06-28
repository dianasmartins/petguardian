import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Definicoes() {
    const [novaPw, setNovaPw] = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [loadingPw, setLoadingPw] = useState(false)
    const [sucessoPw, setSucessoPw] = useState(false)
    const [erroPw, setErroPw] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [loadingDelete, setLoadingDelete] = useState(false)
    const navigate = useNavigate()

    const handleAlterarPw = async (e: React.FormEvent) => {
        e.preventDefault()
        setErroPw('')
        setSucessoPw(false)

        if (novaPw.length < 8) { setErroPw('A password deve ter pelo menos 8 caracteres.'); return }
        if (!/[A-Z]/.test(novaPw)) { setErroPw('A password deve ter pelo menos uma maiúscula.'); return }
        if (!/[0-9]/.test(novaPw)) { setErroPw('A password deve ter pelo menos um número.'); return }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(novaPw)) { setErroPw('A password deve ter pelo menos um símbolo.'); return }
        if (novaPw !== confirmPw) { setErroPw('As passwords não coincidem.'); return }

        setLoadingPw(true)
        const { error } = await supabase.auth.updateUser({ password: novaPw })
        if (error) {
            setErroPw('Erro ao alterar a password. Tenta novamente.')
        } else {
            setSucessoPw(true)
            setNovaPw('')
            setConfirmPw('')
            setTimeout(() => setSucessoPw(false), 3000)
        }
        setLoadingPw(false)
    }

    const handleEliminarConta = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return }
        setLoadingDelete(true)
        await supabase.auth.signOut()
        navigate('/')
        setLoadingDelete(false)
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-2xl mx-auto px-4 py-10">

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                        Definições da conta
                    </h1>
                    <p className="text-stone-500 mt-1">Segurança e preferências</p>
                </div>

                {/* Alterar password */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
                    <h2 className="font-bold text-stone-900 mb-1">🔒 Alterar password</h2>
                    <p className="text-stone-400 text-sm mb-5">A nova password deve ter pelo menos 8 caracteres, uma maiúscula, um número e um símbolo.</p>

                    <form onSubmit={handleAlterarPw} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Nova password</label>
                            <input
                                type="password"
                                value={novaPw}
                                onChange={e => setNovaPw(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-semibold text-stone-500">Confirmar nova password</label>
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-green-500 focus:outline-none text-sm"
                            />
                        </div>

                        {erroPw && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erroPw}</div>
                        )}
                        {sucessoPw && (
                            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">✓ Password alterada com sucesso!</div>
                        )}

                        <button
                            type="submit"
                            disabled={loadingPw}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                            {loadingPw ? 'A alterar...' : 'Alterar password'}
                        </button>
                    </form>
                </div>

                {/* Privacidade */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
                    <h2 className="font-bold text-stone-900 mb-1">🍪 Cookies e privacidade</h2>
                    <p className="text-stone-400 text-sm mb-4">Gere as tuas preferências de privacidade.</p>

                    <div className="flex flex-col gap-3">
                        {[
                            { label: 'Cookies essenciais', desc: 'Necessários para o funcionamento da plataforma', checked: true, disabled: true },
                            { label: 'Cookies analíticos', desc: 'Ajudam-nos a melhorar a plataforma (sem dados pessoais)', checked: true, disabled: false },
                            { label: 'Cookies funcionais', desc: 'Guardam as tuas preferências (distrito, vista de mapa)', checked: true, disabled: false },
                        ].map(item => (
                            <div key={item.label} className="flex items-start justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
                                <div>
                                    <div className="font-medium text-stone-900 text-sm">{item.label}</div>
                                    <div className="text-xs text-stone-400 mt-0.5">{item.desc}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input type="checkbox" defaultChecked={item.checked} disabled={item.disabled} className="sr-only peer" />
                                    <div className="w-10 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Exportar dados */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
                    <h2 className="font-bold text-stone-900 mb-1">📦 Os meus dados (RGPD)</h2>
                    <p className="text-stone-400 text-sm mb-4">Tens o direito de aceder e exportar todos os dados que a plataforma detém sobre ti.</p>
                    <button className="bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                        Exportar os meus dados (JSON)
                    </button>
                </div>

                {/* Eliminar conta */}
                <div className="bg-white rounded-2xl border-2 border-red-100 p-6">
                    <h2 className="font-bold text-red-700 mb-1">⚠️ Eliminar conta</h2>
                    <p className="text-stone-400 text-sm mb-4">
                        Esta ação é irreversível. Todos os teus dados serão eliminados após 30 dias.
                        Os animais com ocorrências ativas serão anonimizados.
                    </p>

                    {confirmDelete && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-4">
                            ⚠️ Tens a certeza? Clica novamente para confirmar a eliminação da conta.
                        </div>
                    )}

                    <button
                        onClick={handleEliminarConta}
                        disabled={loadingDelete}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${confirmDelete
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            }`}
                    >
                        {loadingDelete ? 'A processar...' : confirmDelete ? 'Confirmar eliminação' : 'Eliminar conta'}
                    </button>

                    {confirmDelete && (
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="ml-3 text-sm text-stone-400 hover:text-stone-600"
                        >
                            Cancelar
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}