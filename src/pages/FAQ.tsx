export default function FAQ() {
  const faqs = [
    { q: 'O PetGuardian é gratuito?', a: 'Sim, totalmente gratuito. Sem planos pagos, sem anúncios, sem limites de utilização.' },
    { q: 'Preciso de criar conta para reportar um avistamento?', a: 'Não. Qualquer pessoa pode reportar um avistamento sem ter conta registada.' },
    { q: 'Qual é a idade mínima para criar conta?', a: '18 anos. A plataforma trata dados de localização e fotografias, pelo que exige maioridade.' },
    { q: 'Como funciona a identificação por IA?', a: 'Quando registas um animal, a IA analisa a foto e guarda as características (espécie, raça, cor, tamanho). Quando alguém encontra um animal, a IA compara as características e dá um score de correspondência de 0 a 100%.' },
    { q: 'O mapa de ocorrências mostra animais de todo Portugal?', a: 'Sim. Podes filtrar por distrito para ver apenas animais perto de ti.' },
    { q: 'As notificações funcionam com o browser fechado?', a: 'Sim, se deres permissão para notificações push. O service worker fica activo em segundo plano.' },
    { q: 'Posso registar mais do que um animal?', a: 'Sim, sem limite. Cada animal tem o seu perfil, ocorrência e histórico de avistamentos independente.' },
    { q: 'Como recupero a minha password?', a: 'Na página de login, clica em "Esqueci a password" e introduz o teu email. Vais receber um link para definir uma nova password.' },
    { q: 'O que acontece aos meus dados se eliminar a conta?', a: 'Os teus dados pessoais são removidos. Os registos de animais podem permanecer anonimizados para preservar o histórico da plataforma.' },
    { q: 'Posso usar o PetGuardian noutro país?', a: 'A plataforma foi desenhada para Portugal (distritos, morada, idioma), mas o mapa funciona globalmente via GPS.' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>
      <section className="py-20 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider"
            style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Ajuda
          </div>
          <h1 className="text-5xl font-black mb-5" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Perguntas Frequentes
          </h1>
          <p className="text-lg" style={{ color: '#4d7c0f' }}>
            Tudo o que precisas saber sobre o PetGuardian
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-4">
          {faqs.map((item, i) => (
            <details key={i} className="bg-white rounded-2xl border group" style={{ borderColor: '#d9f99d' }}>
              <summary className="px-6 py-4 font-semibold cursor-pointer list-none flex items-center justify-between transition-colors"
                style={{ color: '#365314' }}>
                {item.q}
                <span className="text-stone-400 group-open:rotate-180 transition-transform">↓</span>
              </summary>
              <div className="px-6 pb-5 text-sm leading-relaxed border-t pt-3" style={{ color: '#4d7c0f', borderColor: '#d9f99d' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
