import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  useEffect(() => {
    console.log('Landing mounted — ruta / renderizada')
  }, [])

  return (
    <div className="landing-root">
      <header className="lp-navbar">
        <div className="lp-container lp-nav">
          <div className="lp-logo">SIGFITO</div>
          <nav>
            <a href="#features">Características</a>
            <a href="#benefits">Beneficios</a>
            <a href="#contact">Contacto</a>
            <Link className="lp-btn lp-btn-outline" to="/login?from=landing" title="Inicia sesión en tu cuenta">Iniciar sesión</Link>
            <Link className="lp-btn lp-btn-primary" to="/register?from=landing" title="Crea una cuenta nueva">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      <main className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-content">
            <h1>Gestión fitosanitaria inteligente para la exportación agrícola</h1>
            <p className="lp-lead">Centraliza predios, lotes e inspecciones. Asegura trazabilidad, control sanitario y cumplimiento de normas ICA para exportación en fresco.</p>

            <div className="lp-cta">
              <Link to="/login?from=landing" className="lp-cta-btn" title="Ir a iniciar sesión">Iniciar sesión</Link>
              <Link to="/register?from=landing" className="lp-cta-btn lp-cta-btn-outline" title="Crear una nueva cuenta">Crear cuenta</Link>
            </div>
            <ul className="lp-quicklist">
              <li title="Gestiona predios, lotes y cultivos">Gestión de predios, lotes y cultivos</li>
              <li title="Solicita y sigue inspecciones fitosanitarias">Solicitud y seguimiento de inspecciones</li>
              <li title="Control sanitario y trazabilidad">Control sanitario y trazabilidad</li>
            </ul>
          </div>

          <div className="lp-hero-illustration" aria-hidden>
            <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="#7bd389" />
                  <stop offset="1" stopColor="#2b7a4b" />
                </linearGradient>
              </defs>
              <rect rx="20" width="100%" height="100%" fill="#f6fff6" />
              <g transform="translate(40,40)">
                <circle cx="120" cy="80" r="60" fill="url(#g1)" opacity="0.95" />
                <rect x="220" y="40" width="220" height="140" rx="12" fill="#fff" stroke="#e6f0ea" />
                <path d="M40 220 q80 -120 200 -40 q120 80 320 -20" stroke="#9bd8a4" strokeWidth="8" fill="none" strokeLinecap="round" />
                <text x="260" y="110" fontSize="18" fill="#2b7a4b">Panel de inspecciones</text>
              </g>
            </svg>
          </div>
        </div>
      </main>

      <section id="features" className="lp-section lp-features">
        <div className="lp-container">
          <h2>Características</h2>
          <div className="lp-cards">
            <article className="lp-card" title="Registra y administra tus predios y cultivos">
              <h3>Gestión de cultivos</h3>
              <p>Registro de predios, lugares, lotes y cultivos con historial y mapas.</p>
            </article>
            <article className="lp-card" title="Solicita inspecciones y sigue su estado">
              <h3>Control de inspecciones</h3>
              <p>Solicitudes, asignación y seguimiento en tiempo real.</p>
            </article>
            <article className="lp-card" title="Monitorea trazabilidad y historial sanitario">
              <h3>Trazabilidad</h3>
              <p>Trazabilidad completa desde la solicitud hasta la aprobación.</p>
            </article>
            <article className="lp-card" title="Catálogo y seguimiento de plagas y especies">
              <h3>Gestión de plagas</h3>
              <p>Catálogo de plagas y especies vegetales con status y controles.</p>
            </article>
            <article className="lp-card" title="Facilita el cumplimiento normativo para exportación">
              <h3>Exportación agrícola</h3>
              <p>Herramientas y reportes para el cumplimiento ICA y procesos de exportación.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="benefits" className="lp-section lp-benefits">
        <div className="lp-container lp-benefits-grid">
          <div>
            <h2>Beneficios</h2>
            <ul>
              <li><strong>Optimización de procesos:</strong> Reduce tiempos administrativos y mejora la coordinación.</li>
              <li><strong>Centralización:</strong> Toda la información en un solo lugar accesible por rol.</li>
              <li><strong>Cumplimiento ICA:</strong> Flujos orientados a requisitos normativos para exportación.</li>
              <li><strong>Seguimiento:</strong> Monitoreo en tiempo real y trazabilidad por lote.</li>
            </ul>
          </div>
          <div>
            <h3>¿Listo para comenzar?</h3>
            <p>Puedes crear una cuenta o iniciar sesión para acceder a tu panel personalizado.</p>
            <div className="lp-cta">
              <Link to="/register?from=landing" className="lp-cta-btn">Crear cuenta</Link>
              <Link to="/login?from=landing" className="lp-cta-btn lp-cta-btn-outline">Iniciar sesión</Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div>
            <strong>SIGFITO</strong>
            <p>Plataforma para gestión fitosanitaria y trazabilidad agrícola.</p>
          </div>
          <div>
            <p>Proyecto universitario — Todos los derechos reservados © {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
