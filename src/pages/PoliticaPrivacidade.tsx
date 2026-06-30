export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen" style={{ background: '#f7fee7' }}>
      <section className="py-16 px-6 text-center" style={{ background: 'white', borderBottom: '2px solid #d9f99d' }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black mb-3" style={{ color: '#365314', fontFamily: 'Georgia, serif' }}>
            Política de Privacidade
          </h1>
          <p className="text-base" style={{ color: '#4d7c0f' }}>Última actualização: Junho de 2026</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border p-8 flex flex-col gap-7" style={{ borderColor: '#d9f99d' }}>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>1. Dados que recolhemos</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Recolhemos o nome, email, telemóvel (opcional) e foto de perfil (opcional) fornecidos no registo. Para animais, recolhemos fotografias, descrições e localização GPS fornecida voluntariamente.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>2. Como usamos os dados</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Os dados são usados exclusivamente para o funcionamento da plataforma: identificar donos, mostrar animais no mapa, enviar notificações sobre avistamentos e permitir mensagens entre utilizadores. Nunca vendemos ou partilhamos dados com terceiros para fins publicitários.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>3. Armazenamento e segurança</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Os dados são armazenados de forma segura através do Supabase, com Row Level Security (RLS) activo em todas as tabelas. As passwords são encriptadas com bcrypt e nunca são guardadas em texto simples.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>4. Os teus direitos (RGPD)</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Tens o direito de acesso, rectificação, eliminação e portabilidade dos teus dados. Podes editar o teu perfil em qualquer momento ou solicitar a eliminação da conta nas Definições.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>5. Cookies</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Usamos cookies essenciais para manter a sessão activa. Não usamos cookies de publicidade ou rastreio de terceiros.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>6. Identificação por IA</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              As fotografias submetidas para análise podem ser processadas por serviços de IA (Google Gemini) apenas para extrair características visuais do animal. As imagens não são usadas para treinar modelos de terceiros.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-2" style={{ color: '#365314' }}>7. Contacto</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4d7c0f' }}>
              Para questões sobre privacidade ou exercício de direitos RGPD, contacta-nos através do email da plataforma.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
