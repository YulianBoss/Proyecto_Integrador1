import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  useEffect(() => {
    console.log('Landing mounted — ruta / renderizada')
  }, [])

  return (
    <div className="landing-root">
      {/* 1. NAVBAR */}
      <header className="lp-navbar">
        <div className="lp-container lp-nav">
          <div className="lp-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#0B4632"/>
              <path d="M12 6C9.5 9 8.5 11.5 12 15C15.5 11.5 14.5 9 12 6Z" fill="#10B981"/>
            </svg>
            <span>SIGFITO</span>
          </div>
          <nav>
            <a href="#features">Características</a>
            <a href="#benefits">Beneficios</a>
            <a href="#contact">Contacto</a>
          </nav>
          <div className="lp-nav-actions">
            <Link className="lp-link-login" to="/login?from=landing" title="Inicia sesión en tu cuenta">Iniciar sesión</Link>
            <Link className="lp-btn lp-btn-primary" to="/register?from=landing" title="Crea una cuenta nueva">Crear Cuenta</Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-content">
            <span className="lp-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{marginRight: '6px', verticalAlign: 'middle'}}><polyline points="20 6 9 17 4 12"/></svg>
              Cumplimiento ICA Simplificado
            </span>
            <h1>Gestión fitosanitaria para exportadores colombianos</h1>
            <p className="lp-lead">
              Centraliza predios, lotes e inspecciones. Cumple con las normas del ICA de forma ágil y segura.
            </p>

            <div className="lp-cta-group">
              <Link to="/register?from=landing" className="lp-btn lp-btn-cta" title="Crear cuenta gratis">
                Comenzar Ahora
              </Link>
              <a href="#video" className="lp-btn-video">
                Ver demostración
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </a>
            </div>
          </div>

          {/* INTERFAZ VECTORIAL AUTO-SUFICIENTE (No requiere imágenes externas) */}
          <div className="lp-hero-mockup-container">
            <div className="lp-mockup-wrapper">
              <div className="lp-mockup-app">
                <div className="lp-app-header">
                  <div className="lp-app-dots"><span></span><span></span><span></span></div>
                  <span>sigfito.app/predios</span>
                </div>
                <div className="lp-app-body">
                  <div className="lp-app-sidebar">
                    <div className="lp-side-item active"></div>
                    <div className="lp-side-item"></div>
                    <div className="lp-side-item"></div>
                  </div>
                  <div className="lp-app-content">
                    <div className="lp-mini-map">
                      <span className="lp-map-badge">Lote 04 - Aguacate Hass</span>
                      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M10 20 L40 10 L80 30 L70 80 L20 70 Z" fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="1.5"/>
                        <circle cx="40" cy="40" r="3" fill="#EF4444"/>
                        <circle cx="55" cy="50" r="3" fill="#EF4444"/>
                      </svg>
                    </div>
                    <div className="lp-mini-chart">
                      <div className="lp-chart-title">Umbral de Plagas</div>
                      <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0 35 Q20 10, 40 25 T80 5 T100 20" fill="none" stroke="#10B981" strokeWidth="2"/>
                        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.1)" strokeDasharray="2,2"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contenedor optimizado para tu imagen real. Reemplaza el src por tu asset local cuando lo tengas */}
              <div className="lp-mockup-field-frame">
                <img 
                  src="https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=400" 
                  alt="Monitoreo en campo colombiano" 
                  className="lp-mockup-field-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="lp-field-img-fallback">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Vista Inspección Campo</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* 3. TRUST BAR */}
      <section className="lp-trust-bar">
        <div className="lp-container lp-trust-flex">
          <span className="lp-trust-title">Diseñado para cumplir normas ICA de Colombia</span>
          <div className="lp-trust-logos">
            <span className="lp-logo-placeholder">ICA COLOMBIA</span>
          </div>
        </div>
      </section>

      {/* 4. CARACTERÍSTICAS */}
      <section id="features" className="lp-section lp-features">
        <div className="lp-container">
          <h2 className="lp-section-title">Lo que necesitas</h2>
          <div className="lp-cards-grid">
            
            <article className="lp-card">
              <div className="lp-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
              </div>
              <h3>Gestión de Predios</h3>
              <p>Registra tus predios, lotes y variedades con ubicación exacta y datos del terreno.</p>
              <div className="lp-card-preview-map">
                <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M10 5 L40 8 L80 2 L90 35 L30 38 Z" fill="rgba(11, 70, 50, 0.04)" stroke="rgba(11, 70, 50, 0.15)" strokeWidth="1"/>
                </svg>
              </div>
            </article>

            <article className="lp-card">
              <div className="lp-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <h3>Inspecciones Rápidas</h3>
              <p>Crea y gestiona inspecciones desde el campo. Acceso móvil incluso sin internet.</p>
            </article>

            <article className="lp-card">
              <div className="lp-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3>Control de Plagas</h3>
              <p>Monitorea plagas y aplica controles. Catalogo de especies fitosanitarias.</p>
              <div className="lp-card-preview-chart"></div>
            </article>

            <article className="lp-card">
              <div className="lp-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <h3>Historial Completo</h3>
              <p>Trazabilidad desde la siembra hasta la exportación. Registro de cada paso.</p>
            </article>

            <article className="lp-card lp-card-wide">
              <div className="lp-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3>Reportes y Formatos ICA</h3>
              <p>Genera reportes automáticos listos para presentar al ICA. Cumple normativas sin complicaciones.</p>
            </article>

          </div>
        </div>
      </section>

      {/* 5. BENEFICIOS */}
      <section id="benefits" className="lp-section lp-benefits">
        <div className="lp-container lp-benefits-grid">
          <div className="lp-benefits-info">
            <h2 className="lp-section-title">¿Por qué usar Sigfito?</h2>
            
            <div className="lp-metric-item">
              <div className="lp-metric-num">70% Menos</div>
              <p>tiempo en papeleo y trámites ICA.</p>
            </div>

            <div className="lp-metric-item">
              <div className="lp-metric-num">Desde Cualquier Lugar</div>
              <p>Acceso móvil para tu equipo en el campo y oficina.</p>
            </div>
          </div>

          <div className="lp-cta-box-card">
            <h3>Empieza hoy mismo</h3>
            <p>Únete a exportadores que ya usan Sigfito para cumplir normas ICA fácilmente.</p>
            <Link to="/register?from=landing" className="lp-btn lp-btn-accent-box">
              Crear Cuenta Gratis
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FOOTER PREMIUM MULTICOLUMNA */}
      <footer id="contact" className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top-grid">
            <div className="lp-footer-brand">
              <div className="lp-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#10B981"/>
                </svg>
                <span>SIGFITO</span>
              </div>
              <p>Gestión fitosanitaria para la exportación agrícola colombiana.</p>
              <div className="lp-footer-socials">
                <a href="#linkedin" className="lp-link-social">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="lp-footer-links-col">
              <h4>PRODUCTO</h4>
              <a href="#features">Características</a>
              <a href="#benefits">Beneficios</a>
            </div>

            <div className="lp-footer-links-col">
              <h4>COMPAÑÍA</h4>
              <a href="#about">Sobre Nosotros</a>
              <a href="#contact">Contacto</a>
            </div>

            <div className="lp-footer-links-col">
              <h4>AYUDA</h4>
              <a href="#help">Preguntas Frecuentes</a>
              <a href="#docs">Documentación</a>
            </div>

            <div className="lp-footer-links-col lp-footer-contact-info">
              <h4>CONTACTO</h4>
              <p>soporte@sigfito.com</p>
              <p>+57 (300) 123-4567</p>
              <p>Bogotá, Colombia</p>
            </div>
          </div>

          <hr className="lp-footer-divider" />

          <div className="lp-footer-bottom">
            <p>© {new Date().getFullYear()} SIGFITO Technologies. Proyecto Universitario — Todos los derechos reservados.</p>
            <div className="lp-footer-legal-links">
              <a href="#terms">Términos de Servicio</a>
              <a href="#privacy">Políticas de Privacidad</a>
              <a href="#ica">Cumplimiento ICA</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
