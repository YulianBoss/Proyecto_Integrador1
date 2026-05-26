import React from 'react';
import { Link } from 'react-router-dom';
import './LandingModern.css';

export default function LandingModern() {
  return (
    <div className="lm-root">
      <header className="lm-navbar">
        <div className="lm-container lm-nav">
          <div className="lm-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#2b7a4b"/><path d="M10 20c2-4 10-8 12-8s2 2 0 4-8 6-12 4z" fill="#7bd389"/></svg>
            <span>SIGFITO</span>
          </div>
          <nav>
            <a href="#features">Características</a>
            <a href="#benefits">Beneficios</a>
            <a href="#contact">Soporte</a>
            <Link to="/login?from=landing" className="lm-btn lm-btn-outline">Iniciar Sesión</Link>
            <Link to="/register?from=landing" className="lm-btn lm-btn-primary">Crear Cuenta Gratis</Link>
          </nav>
        </div>
      </header>

      <main className="lm-hero">
        <div className="lm-container lm-hero-grid">
          <div className="lm-hero-content">
            <div className="lm-badge">Software de Gestión Fitosanitaria para LATAM</div>
            <h1>Exporta con confianza.<br/>Automatiza tu cumplimiento fitosanitario.</h1>
            <p>Centraliza predios, lotes e inspecciones. Asegura la trazabilidad total y el cumplimiento ágil de las normas ICA.</p>
            <div className="lm-cta-row">
              <Link to="/register?from=landing" className="lm-btn lm-btn-primary">Agendar Demo / Comenzar Gratis</Link>
              <a href="#video" className="lm-link">Ver video de 2 min &rarr;</a>
            </div>
            <div className="lm-logos-row">
              <span>ICONO ICA</span>
              <span>GlobalG.A.P.</span>
              <span>Software de confianza para cumplimiento de normativas.</span>
            </div>
          </div>
          <div className="lm-hero-img">
            <img src="/public/hero-mockup.png" alt="Panel SIGFITO" />
          </div>
        </div>
      </main>

      <section id="features" className="lm-section lm-features">
        <div className="lm-container">
          <h2>Características</h2>
          <div className="lm-cards">
            <div className="lm-card">
              <div className="lm-card-icon">🌱</div>
              <div>
                <h3>Gestión de Cultivos</h3>
                <p>Mapeo inteligente de predios. Registra lugares, lotes y variedades con historial climático.</p>
              </div>
            </div>
            <div className="lm-card">
              <div className="lm-card-icon">🦟</div>
              <div>
                <h3>Gestión de Plagas</h3>
                <p>Catálogo fitosanitario, registro y control de plagas, especies y reportes.</p>
              </div>
            </div>
            <div className="lm-card">
              <div className="lm-card-icon">📋</div>
              <div>
                <h3>Control de Inspecciones</h3>
                <p>Asignación y seguimiento móvil, alertas y reportes automáticos.</p>
              </div>
            </div>
            <div className="lm-card">
              <div className="lm-card-icon">🔗</div>
              <div>
                <h3>Trazabilidad Extrema</h3>
                <p>Todo el proceso centralizado, desde la siembra al contenedor de exportación.</p>
              </div>
            </div>
          </div>
          <div className="lm-feature-extra">
            <div>💡 Ahorra 70% del tiempo en papeleo manual.</div>
            <div>♿ Accesibilidad: Toda la operación en cualquier dispositivo.</div>
          </div>
        </div>
      </section>

      <section id="benefits" className="lm-section lm-benefits">
        <div className="lm-container lm-benefits-row">
          <div className="lm-benefit-main">
            <h2>Lleva la gestión de tus cultivos al estándar internacional.</h2>
            <p>Únete a los exportadores que ya digitalizaron su control fitosanitario.</p>
            <Link to="/register?from=landing" className="lm-btn lm-btn-primary">Registrate Gratis Ahora</Link>
          </div>
          <div className="lm-benefit-side">
            <div className="lm-benefit-logo">SIGFITO</div>
            <div className="lm-benefit-desc">Gestión fitosanitaria inteligente para la exportación agrícola.</div>
          </div>
        </div>
      </section>

      <footer id="contact" className="lm-footer">
        <div className="lm-container lm-footer-grid">
          <div>
            <strong>SIGFITO</strong> &copy; 2026
            <div>Todos los derechos reservados.</div>
          </div>
          <div>
            <div>Contacto: soporte@sigfito.com</div>
            <div>Bogotá, Colombia</div>
          </div>
        </div>
      </footer>
    </div>
  );
}


  