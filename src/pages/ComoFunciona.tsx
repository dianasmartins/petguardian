import { Link } from 'react-router-dom'

export default function ComoFunciona() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 py-20 px-4 text-center">
        <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6 border border-green-200">
          Guia completo
        </span>
        <h1 className="text-5xl font-black text-stone-900 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Como funciona o <span className="text-green-600">PetGuardian</span>
        </h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto">
          Da perda ao reencontro — tudo o que precisas de saber para usar a plataforma
        </p>
      </section>

      {/* Para donos */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">🐾</div>
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Perdi o meu animal — o que faço?
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {[
              {
                num: '01', icon: '👤', title: 'Cria uma conta gratuita',
                desc: 'Regista-te com email ou com a tua conta Google/GitHub. É gratuito, sem anúncios e apenas para maiores de 18 anos.',
                link: '/registo', linkText: 'Criar conta →'
              },
              {
                num: '02', icon: '📝', title: 'Regista o teu animal',
                desc: 'Preenche um formulário de 3 passos: dados do animal (nome, espécie, raça, cor), localização GPS onde desapareceu (podes escrever a morada ou clicar no mapa), e até 5 fotografias. Podes também escrever uma mensagem de apelo.',
                link: '/registar-animal', linkText: 'Registar agora →'
              },
              {
                num: '03', icon: '🗺️', title: 'O animal aparece no mapa',
                desc: 'Em segundos, o teu animal está visível no mapa público para toda a comunidade ver. O marcador é vermelho (desaparecido), laranja (avistado) ou verde (encontrado).',
                link: '/mapa', linkText: 'Ver mapa →'
              },
              {
                num: '04', icon: '🔔', title: 'Recebe notificações em tempo real',
                desc: 'Quando alguém reportar um avistamento do teu animal, recebes uma notificação imediata — mesmo que tenhas o browser em segundo plano. O badge vermelho na navbar mostra quantos avistamentos novos tens.',
                link: null, linkText: null
              },
              {
                num: '05', icon: '📤', title: 'Partilha para aumentar o alcance',
                desc: 'Nas tuas ocorrências, podes partilhar diretamente para WhatsApp, Facebook e Instagram. Podes também gerar um cartaz A4 com QR Code para imprimir e afixar na zona do desaparecimento.',
                link: '/ocorrencias', linkText: 'As minhas ocorrências →'
              },
              {
                num: '06', icon: '✓', title: 'Marca como encontrado',
                desc: 'Quando encontrares o teu animal, vai ao perfil e clica em "Marcar como encontrado". Podes indicar como foi encontrado e a quantos km do local de desaparecimento. A ocorrência fica arquivada no histórico.',
                link: null, linkText: null
              },
            ].map(step => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center font-black text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                  {step.num}
                </div>
                <div className="flex-1 pb-8 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{step.icon}</span>
                    <h3 className="font-bold text-stone-900 text-lg">{step.title}</h3>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed mb-3">{step.desc}</p>
                  {step.link && (
                    <Link to={step.link} className="text-green-700 text-sm font-semibold hover:underline">{step.linkText}</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para voluntários */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">👁</div>
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              Encontrei um animal — como posso ajudar?
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {[
              {
                num: '01', icon: '🗺️', title: 'Consulta o mapa',
                desc: 'Abre o mapa e procura animais perdidos na tua área. Podes filtrar por estado (desaparecido/avistado), espécie e distrito.',
                link: '/mapa', linkText: 'Ver mapa →'
              },
              {
                num: '02', icon: '👁', title: 'Reporta um avistamento',
                desc: 'Clica no marcador do animal que viste no mapa, depois clica em "Reportar avistamento". Não precisas de ter conta! Marca o local no mapa, escreve uma descrição e adiciona até 3 fotografias.',
                link: null, linkText: null
              },
              {
                num: '03', icon: '🤖', title: 'Usa a IA para identificar',
                desc: 'Se encontraste um animal mas não sabes de quem é, vai a "Identificar por IA". Carrega uma foto e o sistema analisa automaticamente e compara com os animais desaparecidos registados. Se houver correspondência, podes contactar o dono diretamente.',
                link: '/identificar', linkText: 'Identificar por IA →'
              },
              {
                num: '04', icon: '💬', title: 'Fala com o dono',
                desc: 'No perfil de cada animal, podes enviar uma mensagem privada diretamente ao dono. As mensagens aparecem em tempo real na caixa de mensagens privadas.',
                link: '/mensagens', linkText: 'Mensagens →'
              },
            ].map(step => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                  {step.num}
                </div>
                <div className="flex-1 pb-8 border-b border-stone-100 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{step.icon}</span>
                    <h3 className="font-bold text-stone-900 text-lg">{step.title}</h3>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed mb-3">{step.desc}</p>
                  {step.link && (
                    <Link to={step.link} className="text-green-700 text-sm font-semibold hover:underline">{step.linkText}</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Funcionalidades da plataforma</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🗺️', title: 'Mapa em tempo real', desc: 'WebSockets — actualizações instantâneas sem recarregar. Marcadores distintos por forma e cor. Modo daltónico. Filtro por distrito e espécie. Alerta de proximidade (2km).' },
              { icon: '🤖', title: 'Identificação por IA', desc: 'Google Gemini Flash analisa fotos. Extracção de características no registo. Scoring estruturado com correspondências até 100%. Acções de follow-up contextuais.' },
              { icon: '💬', title: 'Mensagens privadas', desc: 'Chat em tempo real entre utilizadores. Ticks de lido/enviado. Badge de mensagens não lidas na navbar. Histórico de conversas por animal.' },
              { icon: '🔔', title: 'Notificações push', desc: 'Notificações do browser mesmo com a página fechada. Sino com dropdown de notificações. Badge vermelho na navbar. Service Worker integrado.' },
              { icon: '🖨️', title: 'Cartaz QR Code', desc: 'Cartaz A4 formatado para impressão. QR Code verde aponta para o perfil do animal. Foto, dados e contacto incluídos. Gerado em segundos.' },
              { icon: '📊', title: 'Estatísticas públicas', desc: 'Métricas em tempo real. Taxa de reencontro. Distribuição por espécie. Galeria de histórias de sucesso.' },
              { icon: '📤', title: 'Partilha automática', desc: 'WhatsApp com mensagem pré-redigida. Facebook. Instagram (imagem 1080x1080). Cópia de link. Directo das ocorrências e do perfil do animal.' },
              { icon: '🛡️', title: 'Segurança e privacidade', desc: 'Row Level Security em todas as tabelas. JWT. RGPD compliant. Banner de cookies. Apenas maiores de 18 anos. Sem anúncios.' },
              { icon: '📱', title: 'Totalmente responsivo', desc: '6 breakpoints (375px a 1440px). Mobile-first. Funciona em Chrome, Firefox e Safari. Sem instalação necessária.' },
            ].map(feat => (
              <div key={feat.title} className="bg-stone-50 rounded-2xl p-6 border border-stone-200 hover:border-green-300 hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{feat.icon}</div>
                <h3 className="font-bold text-stone-900 mb-2">{feat.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>Perguntas frequentes</h2>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { q: 'O PetGuardian é gratuito?', a: 'Sim, totalmente gratuito. Sem planos pagos, sem anúncios, sem limites de utilização.' },
              { q: 'Preciso de criar conta para reportar um avistamento?', a: 'Não. Qualquer pessoa pode reportar um avistamento sem ter conta registada.' },
              { q: 'Qual é a idade mínima para criar conta?', a: '18 anos. A plataforma trata dados de localização e fotografias, pelo que exige maioridade.' },
              { q: 'Como funciona a identificação por IA?', a: 'Quando registas um animal, a IA analisa a foto e guarda as características (espécie, raça, cor, tamanho). Quando alguém encontra um animal, a IA compara as características e dá um score de correspondência de 0 a 100%.' },
              { q: 'O mapa mostra animais de todo Portugal?', a: 'Sim. Podes filtrar por distrito para ver apenas animais perto de ti.' },
              { q: 'As notificações funcionam com o browser fechado?', a: 'Sim, se deres permissão para notificações push. O service worker fica activo em segundo plano.' },
              { q: 'Posso registar mais do que um animal?', a: 'Sim, sem limite. Cada animal tem o seu perfil, ocorrência e histórico de avistamentos independente.' },
            ].map((item, i) => (
              <details key={i} className="bg-white rounded-2xl border border-stone-200 group">
                <summary className="px-6 py-4 font-semibold text-stone-900 cursor-pointer list-none flex items-center justify-between hover:text-green-700 transition-colors">
                  {item.q}
                  <span className="text-stone-400 group-open:rotate-180 transition-transform">↓</span>
                </summary>
                <div className="px-6 pb-4 text-stone-500 text-sm leading-relaxed border-t border-stone-100 pt-3">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-emerald-700 text-center">
        <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>Pronto para começar?</h2>
        <p className="text-green-100 text-lg mb-10">Cria a tua conta gratuita e publica o primeiro alerta em menos de 2 minutos.</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/registo" className="bg-white text-green-700 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-50 transition-all shadow-lg">Criar conta gratuita</Link>
          <Link to="/mapa" className="bg-green-700 text-white border-2 border-green-400 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-green-800 transition-all">Ver mapa ao vivo</Link>
        </div>
      </section>
    </div>
  )
}
