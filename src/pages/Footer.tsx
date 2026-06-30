import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ background: '#365314' }}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center md:justify-between gap-x-6 gap-y-1.5">
        {/* Logo */}
        <Link to="/" className="text-sm font-bold flex-shrink-0" style={{ color: '#d9f99d', fontFamily: 'Georgia, serif' }}>
          🐾 PetGuardian
        </Link>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {[
            ['/como-funciona', 'Como Funciona'],
            ['/sobre-nos', 'Sobre Nós'],
            ['/faq', 'FAQ'],
            ['/privacidade', 'Privacidade'],
            ['/termos', 'Termos'],
          ].map(([to, label]) => (
            <Link key={label} to={to} className="text-xs hover:underline" style={{ color: 'rgba(255,255,255,.55)' }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,.3)' }}>
          © 2026 PetGuardian
        </span>
      </div>
    </footer>
  )
}