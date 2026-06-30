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
            A minha história
          </h1>
          <p className="text-xl" style={{ color: '#4d7c0f' }}>
            Porque criei o PetGuardian
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl border p-8 md:p-10 flex flex-col gap-6" style={{ borderColor: '#d9f99d' }}>

          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            Sou a Diana, estudante de Gestão de Sistemas de Informação na Atlântica, e criei o PetGuardian como projecto final de licenciatura.
          </p>

          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            A ideia surgiu de um problema simples: em Portugal, milhares de animais desaparecem todos os anos e os donos acabam a depender de publicações dispersas em redes sociais ou cartazes que poucos veem a tempo. Não havia uma ferramenta centralizada para ajudar.
          </p>

          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            Por isso construí uma plataforma que junta tudo num só lugar: um mapa de ocorrências em tempo real, inteligência artificial para identificar animais encontrados, e uma comunidade pronta a ajudar — sempre gratuita, sem anúncios.
          </p>

          <p className="text-base leading-relaxed" style={{ color: '#4d7c0f' }}>
            Cada funcionalidade foi pensada para tornar mais fácil reunir um animal com a sua família, o mais rápido possível.
          </p>

          <p className="text-base leading-relaxed font-semibold" style={{ color: '#365314' }}>
            Espero que o PetGuardian ajude a trazer mais animais para casa.
          </p>

          <div className="pt-2">
            <p className="text-sm italic" style={{ color: '#6b7280' }}>— Diana Soares Martins</p>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link to="/registo" className="px-8 py-4 rounded-2xl font-bold text-white inline-block"
            style={{ background: '#ea580c' }}>
            Junta-te à comunidade
          </Link>
        </div>
      </div>
    </div>
  )
}
