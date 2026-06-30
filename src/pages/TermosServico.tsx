export default function TermosServico() {
  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>
      <section className="py-16 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Termos de Serviço
          </h1>
          <p className="text-base" style={{ color: '#4d7c0f' }}>Última actualização: Junho de 2026</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border p-8 flex flex-col gap-7" style={{ borderColor: '#d9f99d' }}>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>1. Aceitação dos termos</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Ao criar uma conta ou usar o PetGuardian, aceitas estes Termos de Serviço e a nossa Política de Privacidade.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>2. Idade mínima</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              É necessário ter pelo menos 18 anos para criar uma conta. Os menores podem reportar avistamentos sem conta.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>3. Uso adequado da plataforma</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              O PetGuardian destina-se exclusivamente à localização de animais de estimação desaparecidos ou encontrados. É proibido publicar conteúdo falso, ofensivo, fraudulento ou que viole direitos de terceiros.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>4. Conteúdo do utilizador</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Mantens os direitos sobre as fotografias e textos que publicas. Ao publicares, autorizas a sua exibição pública na plataforma para fins de localização do animal.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>5. Limitação de responsabilidade</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              O PetGuardian é uma ferramenta de comunicação e não garante a localização ou recuperação de qualquer animal. A IA fornece estimativas de correspondência sem garantia de precisão. Os utilizadores são responsáveis por confirmar a identidade de animais antes de qualquer entrega.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>6. Suspensão de conta</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Reservamo-nos o direito de suspender contas que violem estes termos, publiquem conteúdo falso ou usem a plataforma de forma abusiva.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>7. Alterações aos termos</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Estes termos podem ser actualizados periodicamente. Alterações significativas serão comunicadas na plataforma.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>8. Lei aplicável</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Estes termos são regidos pela lei portuguesa.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
