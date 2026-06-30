import { Link } from 'react-router-dom'

export default function SobreNos() {
  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>

      <section className="py-20 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider"
            style={{ background: '#ecfccb', color: '#365314', border: '1px solid #d9f99d' }}>
            Sobre nós
          </div>
          <h1 className="text-5xl font-black mb-5" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            A nossa missão
          </h1>
          <p className="text-xl" style={{ color: '#4d7c0f' }}>
            Reunir animais de estimação com as suas famílias, em qualquer parte de Portugal.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col gap-10">

        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>O problema</h2>
          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            Todos os dias, animais de estimação desaparecem em Portugal. Sem uma plataforma centralizada, os donos recorrem a publicações dispersas em redes sociais, cartazes físicos e grupos de WhatsApp — métodos lentos e pouco eficazes para alcançar quem realmente pode ajudar.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>A solução</h2>
          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            O PetGuardian centraliza tudo numa única plataforma: um mapa de ocorrências em tempo real, identificação por inteligência artificial, notificações instantâneas e ferramentas de partilha para redes sociais. Tudo gratuito, sem anúncios, e desenhado especificamente para a realidade portuguesa.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>A equipa</h2>
          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            O PetGuardian foi desenvolvido por Diana Soares Martins, no âmbito do Projeto Final de Licenciatura em Gestão de Sistemas de Informação, na Atlântica, sob orientação do Prof. Dr. Paulo Pombinho.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>Os nossos valores</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-2">
            {[
              { icon: '🆓', title: 'Sempre gratuito', desc: 'Sem planos pagos, sem limites de utilização.' },
              { icon: '🚫', title: 'Sem anúncios', desc: 'A tua atenção não é vendida a ninguém.' },
              { icon: '🔒', title: 'Privacidade primeiro', desc: 'RGPD compliant, dados protegidos com RLS.' },
              { icon: '🤝', title: 'Comunidade em primeiro lugar', desc: 'Construído por e para quem ama animais.' },
            ].map(v => (
              <div key={v.title} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #d9f99d' }}>
                <span className="text-2xl mb-2 block">{v.icon}</span>
                <div className="font-bold text-sm mb-1" style={{ color: '#365314' }}>{v.title}</div>
                <div className="text-sm" style={{ color: '#6b7280' }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/registo" className="px-8 py-4 rounded-2xl font-bold text-white inline-block"
            style={{ background: '#ea580c' }}>
            Junta-te à comunidade
          </Link>
        </div>

      </div>
    </div>
  )
}
