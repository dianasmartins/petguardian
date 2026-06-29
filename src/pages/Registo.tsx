import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type TipoConta = 'singular' | 'organizacao'

export default function Registo() {
  const [tipoConta, setTipoConta] = useState<TipoConta>('singular')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telemovel, setTelemovel] = useState('')
  const [password, setPassword] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [orgNome, setOrgNome] = useState('')
  const [orgNif, setOrgNif] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [erroIdade, setErroIdade] = useState('')
  const navigate = useNavigate()

  const validarPassword = (pass: string): string => {
    if (pass.length < 8) return 'A password deve ter pelo menos 8 caracteres.'
    if (!/[A-Z]/.test(pass)) return 'A password deve ter pelo menos uma letra maiúscula.'
    if (!/[a-z]/.test(pass)) return 'A password deve ter pelo menos uma letra minúscula.'
    if (!/[0-9]/.test(pass)) return 'A password deve ter pelo menos um número.'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'A password deve ter pelo menos um símbolo (!@#$%...).'
    return ''
  }

  const calcularIdade = (dataNasc: string): number => {
    const hoje = new Date()
    const nasc = new Date(dataNasc)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  const validarIdade = (data: string) => {
    if (!data) { setErroIdade(''); return }
    const idade = calcularIdade(data)
    if (idade < 18) {
      setErroIdade('Tens de ter pelo menos 18 anos para criar uma conta.')
    } else {
      setErroIdade('')
    }
  }

  const forcaPassword = (pass: string): number => {
    let pontos = 0
    if (pass.length >= 8) pontos++
    if (/[A-Z]/.test(pass)) pontos++
    if (/[0-9]/.test(pass)) pontos++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) pontos++
    return pontos
  }

  const textoForca = (forca: number) => {
    if (forca <= 1) return { texto: 'Fraca', cor: 'text-red-500' }
    if (forca === 2) return { texto: 'Razoável', cor: 'text-amber-500' }
    if (forca === 3) return { texto: 'Boa', cor: 'text-yellow-600' }
    return { texto: 'Forte ✓', cor: 'text-lime-700' }
  }

  const corBarra = (i: number, forca: number) => {
    if (i > forca) return 'bg-stone-200'
    if (forca <= 1) return 'bg-red-400'
    if (forca === 2) return 'bg-amber-400'
    if (forca === 3) return 'bg-yellow-400'
    return 'bg-lime-500'
  }

  const handleRegisto = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (tipoConta === 'singular' && dataNascimento) {
      const idade = calcularIdade(dataNascimento)
      if (idade < 13) { setErro('Não é possível criar conta com menos de 13 anos.'); return }
    }

    const erroPass = validarPassword(password)
    if (erroPass) { setErro(erroPass); return }

    if (telemovel && !/^[+]?[\d\s\-()]{7,20}$/.test(telemovel)) {
      setErro('Número de telemóvel inválido.')
      return
    }

    if (tipoConta === 'organizacao' && !orgNome.trim()) {
      setErro('O nome da organização é obrigatório.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          nome, telemovel,
          tipo_conta: tipoConta,
          data_nascimento: dataNascimento || null,
          organizacao_nome: tipoConta === 'organizacao' ? orgNome : null,
          organizacao_nif: tipoConta === 'organizacao' ? orgNif : null,
          organizacao_aprovada: false,
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setErro('Já existe uma conta com este email.')
      } else {
        setErro('Erro ao criar conta: ' + error.message)
      }
    } else {
      setSucesso(true)
      setTimeout(() => navigate('/'), 2000)
    }
    setLoading(false)
  }

  if (sucesso) return (
    <div className="min-h-screen bg-lime-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">
          {tipoConta === 'organizacao' ? 'Pedido recebido!' : 'Conta criada!'}
        </h2>
        <p className="text-stone-500 text-sm">
          {tipoConta === 'organizacao'
            ? 'A tua conta de organização será analisada e aprovada em 24-48 horas.'
            : 'A redirecionar...'}
        </p>
      </div>
    </div>
  )

  const forca = forcaPassword(password)
  const { texto: textoF, cor: corF } = textoForca(forca)

  return (
    <div className="min-h-screen bg-lime-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐾</div>
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Criar conta gratuita</h1>
          <p className="text-stone-500 text-sm mt-1">Sem publicidade, sem custos</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['singular', 'organizacao'] as TipoConta[]).map(tipo => (
            <button key={tipo} type="button" onClick={() => setTipoConta(tipo)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                tipoConta === tipo ? 'border-lime-700 bg-lime-50 text-lime-900' : 'border-stone-200 text-stone-600'
              }`}>
              {tipo === 'singular' ? '👤 Pessoa singular' : '🏢 Organização'}
            </button>
          ))}
        </div>

        {tipoConta === 'organizacao' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-xs mb-4">
            ℹ️ Contas de organização são aprovadas manualmente em 24-48 horas.
          </div>
        )}

        <form onSubmit={handleRegisto} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-stone-500">
              {tipoConta === 'organizacao' ? 'Nome do responsável *' : 'Nome completo *'}
            </label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
              placeholder={tipoConta === 'organizacao' ? 'Nome do responsável' : 'O teu nome'}
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
          </div>

          {tipoConta === 'organizacao' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-500">Nome da organização *</label>
                <input type="text" value={orgNome} onChange={e => setOrgNome(e.target.value)}
                  placeholder="Ex: Associação Amigos dos Animais"
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-500">NIF / NIPC (opcional)</label>
                <input type="text" value={orgNif}
                  onChange={e => setOrgNif(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="123456789"
                  className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-stone-500">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="o.teu@email.com"
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-stone-500">Telemóvel (opcional)</label>
            <input type="tel" value={telemovel}
              onChange={e => setTelemovel(e.target.value.replace(/[^\d+\s\-()]/g, '').slice(0, 20))}
              placeholder="+351 912 345 678"
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
          </div>

          {tipoConta === 'singular' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-500">
                Data de nascimento * <span className="text-stone-400 font-normal">(mínimo 18 anos)</span>
              </label>
              <input type="date" value={dataNascimento}
                onChange={e => { setDataNascimento(e.target.value); validarIdade(e.target.value) }}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
              {erroIdade && (
                <div className={`text-xs px-3 py-2 rounded-lg mt-1 ${
                  erroIdade.includes('18 anos') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {erroIdade.includes('18 anos') ? '✗' : 'ℹ'} {erroIdade}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-stone-500">Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-lime-600 focus:outline-none text-sm" />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${corBarra(i, forca)}`} />
                  ))}
                </div>
                <div className={`text-xs font-semibold ${corF}`}>{textoF}</div>
                <div className="mt-2 flex flex-col gap-1">
                  {[
                    { ok: password.length >= 8, texto: 'Mínimo 8 caracteres' },
                    { ok: /[A-Z]/.test(password), texto: 'Uma letra maiúscula' },
                    { ok: /[a-z]/.test(password), texto: 'Uma letra minúscula' },
                    { ok: /[0-9]/.test(password), texto: 'Um número' },
                    { ok: /[!@#$%^&*(),.?":{}|<>]/.test(password), texto: 'Um símbolo (!@#$%...)' },
                  ].map(({ ok, texto }) => (
                    <div key={texto} className={`text-xs flex items-center gap-1 ${ok ? 'text-lime-700' : 'text-stone-400'}`}>
                      <span>{ok ? '✓' : '○'}</span><span>{texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{erro}</div>
          )}

          <div className="flex items-start gap-2 text-sm text-stone-500">
            <input type="checkbox" required className="mt-1" />
            <span>Aceito os <a href="#" className="text-lime-800 hover:underline">Termos de Serviço</a> e a <a href="#" className="text-lime-800 hover:underline">Política de Privacidade</a></span>
          </div>

          <button type="submit"
            disabled={loading || (tipoConta === 'singular' && erroIdade.includes('18 anos'))}
            className="w-full bg-lime-700 text-white py-3 rounded-xl font-semibold hover:bg-lime-800 transition-colors disabled:opacity-60 mt-2">
            {loading ? 'A criar conta...' : tipoConta === 'organizacao' ? 'Submeter pedido de registo' : 'Criar conta gratuita'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-6">
          Já tens conta? <Link to="/login" className="text-lime-800 font-semibold hover:underline">Entra aqui</Link>
        </p>
      </div>
    </div>
  )
}
