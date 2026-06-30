import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ background: '#365314' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          {/* Logo */}
          <div className="max-w-xs">
            <Link to="/" className="text-2xl font-bold" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>🐾 PetGuardian</Link>
          </div>
          {/* Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-3">
            {[
              ['/como-funciona', 'Como Funciona'],
              ['/sobre-nos', 'Sobre Nós'],
              ['/faq', 'Perguntas Frequentes'],
              ['/privacidade', 'Política de Privacidade'],
              ['/termos', 'Termos de Serviço'],
            ].map(([to, label]) => (
              <Link key={label} to={to} className="text-sm hover:underline block" style={{ color: 'rgba(255,255,255,.5)' }}>{label}</Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,.2)' }}>© 2026 PetGuardian · Diana Soares Martins · Atlântica</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,.2)' }}>Projeto Final de Licenciatura · GSC</span>
        </div>
      </div>
    </footer>
  )
}
