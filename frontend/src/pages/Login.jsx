import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import './Login.css'

export default function Login() {
  const navigate    = useNavigate()
  const { login }   = useAuth()

  const [form, setForm]     = useState({ correo: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.correo || !form.password) {
      setError('Por favor ingresa tu correo y contraseña.')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const { token, user } = res.data
      login(token, user)

      // Redirigir según rol
      if (user.rol === 'admin')     navigate('/admin/dashboard')
      else if (user.rol === 'productor') navigate('/productor/dashboard')
      else if (user.rol === 'tecnico')   navigate('/tecnico/dashboard')
      else navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al conectar con el servidor'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* Panel izquierdo — Identidad del sistema */}
      <div className="login-brand">
        <div className="login-brand__inner">
          <div className="login-brand__logo">
            <span className="logo-leaf">🌿</span>
            <div>
              <span className="logo-sigla">SIGFITO</span>
              <span className="logo-sub">Sistema Fitosanitario</span>
            </div>
          </div>

          <div className="login-brand__headline">
            <h1>Gestión integral de inspecciones fitosanitarias</h1>
            <p>
              Plataforma oficial del ICA para el control y trazabilidad de predios
              agrícolas destinados a la exportación de vegetales frescos.
            </p>
          </div>

          <ul className="login-brand__features">
            <li>
              <span className="feature-icon">📍</span>
              <div>
                <strong>Monitoreo en tiempo real</strong>
                <span>Estado sanitario de cada predio registrado</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📊</span>
              <div>
                <strong>Cálculo automático de incidencia</strong>
                <span>Indicadores fitosanitarios por lote y cultivo</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">📄</span>
              <div>
                <strong>Informes técnicos digitales</strong>
                <span>Generados automáticamente al finalizar inspección</span>
              </div>
            </li>
          </ul>

          <div className="login-brand__footer">
            Instituto Colombiano Agropecuario — ICA © 2026
          </div>
        </div>

        {/* Decoración fondo */}
        <div className="brand-bg-deco" aria-hidden="true">
          <div className="deco-circle deco-circle--1" />
          <div className="deco-circle deco-circle--2" />
          <div className="deco-grid" />
        </div>
      </div>

      {/* Panel derecho — Formulario */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form__header">
            <span className="login-form__eyebrow">— Acceso al sistema</span>
            <h2 className="login-form__title">Bienvenido</h2>
            <p className="login-form__subtitle">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="login-alert login-alert--error" role="alert">
                <span className="alert-icon">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="field">
              <label className="field__label" htmlFor="correo">
                Correo electrónico
              </label>
              <div className="field__input-wrap">
                <span className="field__icon">✉</span>
                <input
                  id="correo"
                  type="email"
                  name="correo"
                  className="field__input"
                  placeholder="usuario@ica.gov.co"
                  value={form.correo}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Contraseña
              </label>
              <div className="field__input-wrap">
                <span className="field__icon">🔒</span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="field__input field__input--pass"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`btn-primary ${loading ? 'btn-primary--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Verificando...
                </>
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-divider">
            <span>¿No tienes cuenta?</span>
          </div>

          <Link to="/register" className="btn-secondary">
            Solicitar acceso al sistema
          </Link>

          <p className="login-form__notice">
            🔒 El uso de esta plataforma está sujeto a las políticas de privacidad
            y seguridad institucional del ICA.
          </p>
        </div>
      </div>
    </div>
  )
}