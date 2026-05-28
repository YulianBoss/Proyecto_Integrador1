import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import BrandLogo from '../components/BrandLogo'
import './Login.css'

export default function Login() {
  const navigate   = useNavigate()
  const { login }  = useAuth()
  const location   = useLocation()

  useEffect(() => {
    const hasToken    = !!localStorage.getItem('sigfito_token')
    const fromLanding = new URLSearchParams(location.search).get('from') === 'landing'
    const nextParam   = new URLSearchParams(location.search).get('next')
    if (!hasToken && !fromLanding && !nextParam) navigate('/')
  }, [location, navigate])

  const [form,     setForm]     = useState({ correo: '', password: '' })
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [touched,  setTouched]  = useState({ correo: false, password: false })

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleBlur = (e) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }))
  }

  const emailInvalid = touched.correo   && form.correo.length > 0   && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)
  const passInvalid  = touched.password && form.password.length === 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.correo || !form.password) {
      setTouched({ correo: true, password: true })
      setError('Por favor ingresa tu correo y contraseña.')
      return
    }
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      const { token, user } = res.data
      login(token, user)

      const nextParam = new URLSearchParams(location.search).get('next')
      if (nextParam)                   navigate(decodeURIComponent(nextParam))
      else if (user.rol === 'admin')      navigate('/admin/dashboard')
      else if (user.rol === 'productor')  navigate('/productor/dashboard')
      else if (user.rol === 'tecnico')    navigate('/tecnico/dashboard')
      else                             navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Error al conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">

        {/* Brand header */}
        <div className="login-header">
          <div className="brand-icon" aria-hidden="true">
            <BrandLogo width={20} height={20} />
          </div>
          <span className="brand-name">SIGFITO</span>
        </div>

        {/* Eyebrow */}
        <div className="login-eyebrow">
          <span className="login-eyebrow-dot" aria-hidden="true" />
          Acceso al sistema
        </div>

        {/* Title */}
        <h1 className="login-title">Bienvenido</h1>
        <p className="login-subtitle">Ingresa tus credenciales para continuar.</p>

        {/* Register prompt */}
        <div className="register-prompt">
          <span className="register-prompt-text">¿No tienes cuenta?</span>
          <Link to="/register?from=landing" className="register-prompt-link">
            Registrarse →
          </Link>
        </div>

        {/* Back to landing */}
        <Link to="/" className="btn-back" aria-label="Volver al inicio">
          <span className="btn-back-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
          Volver
        </Link>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Global error */}
          {error && (
            <div className="alert-error show" role="alert">
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="correo">Correo electrónico</label>
            <input
              id="correo"
              type="email"
              name="correo"
              className={`form-input${emailInvalid ? ' has-error' : ''}`}
              placeholder="tu@correo.com"
              value={form.correo}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              required
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? 'correo-error' : undefined}
            />
            <div id="correo-error" className={`field-error${emailInvalid ? ' show' : ''}`} role="alert">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Ingresa un correo electrónico válido
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <div className="field-wrap">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                name="password"
                className={`form-input with-icon${passInvalid ? ' has-error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="current-password"
                required
                aria-invalid={passInvalid}
                aria-describedby={passInvalid ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="btn-eye"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <div id="password-error" className={`field-error${passInvalid ? ' show' : ''}`} role="alert">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              La contraseña no puede estar vacía
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Verificando…
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-divider" aria-hidden="true" />
        <div className="login-footer">
          <Link to="/forgot-password" className="forgot-link">
            ¿Olvidaste tu contraseña?
          </Link>
          <span className="copyright">© 2026 SIGFITO. Todos los derechos reservados.</span>
        </div>

      </div>
    </div>
  )
}