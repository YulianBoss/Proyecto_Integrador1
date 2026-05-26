import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import './Login.css'

export default function Login() {
  const navigate    = useNavigate()
  const { login }   = useAuth()
  const location = useLocation()

  useEffect(() => {
    const hasToken = !!localStorage.getItem('sigfito_token')
    const fromLanding = new URLSearchParams(location.search).get('from') === 'landing'
    const nextParam = new URLSearchParams(location.search).get('next')
    // Si no viene desde el landing y no hay token, redirigir al landing.
    if (!hasToken && !fromLanding && !nextParam) navigate('/')
  }, [location, navigate])

  const [form, setForm]     = useState({ correo: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [touched, setTouched] = useState({ correo: false, password: false })

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const emailInvalid = touched.correo && form.correo.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)
  const passInvalid = touched.password && form.password.length === 0

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

      // Redirigir según parámetro next o rol
      const nextParam = new URLSearchParams(location.search).get('next')
      if (nextParam) {
        const next = decodeURIComponent(nextParam)
        navigate(next)
      } else if (user.rol === 'admin')     navigate('/admin/dashboard')
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
    <div className="login-screen">
      <div className="login-card">
        <div className="login-left">
          <div>
            <div className="brand-wrap">
              <div className="brand-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div className="brand-name">SIGFITO</div>
                <div className="brand-sub">Sistema Fitosanitario</div>
              </div>
            </div>

            <h1 className="left-headline">Gestion de inspecciones para exportacion en fresco</h1>
            <p className="left-desc">
              Plataforma operativa del ICA para el control fitosanitario de lugares
              de produccion de vegetales.
            </p>

            <ul className="feat-list">
              <li className="feat-item">
                <div className="feat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M1 6l11 5 11-5M1 6v12l11 5 11-5V6"/></svg>
                </div>
                <div>
                  <div className="feat-title">Monitoreo en tiempo real</div>
                  <div className="feat-desc">Seguimiento del estado sanitario por predio y lote</div>
                </div>
              </li>
              <li className="feat-item">
                <div className="feat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                </div>
                <div>
                  <div className="feat-title">Cumplimiento normativo ICA</div>
                  <div className="feat-desc">Alineado con estandares internacionales de exportacion</div>
                </div>
              </li>
              <li className="feat-item">
                <div className="feat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <div className="feat-title">Reportes tecnicos automaticos</div>
                  <div className="feat-desc">Informes generados al finalizar cada inspeccion</div>
                </div>
              </li>
            </ul>
          </div>

          <div className="authority">
            <div className="co-flag" aria-hidden="true">
              <div className="y" />
              <div className="b" />
              <div className="r" />
            </div>
            <div className="authority-text">
              Instituto Colombiano Agropecuario - ICA
              <br />
              Republica de Colombia
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="eyebrow"><span className="eyebrow-line" />Acceso al sistema</div>
          <h2 className="form-title">Bienvenido</h2>
          <p className="form-subtitle">Ingrese sus credenciales para continuar</p>
          <div className="register-inline">
            <span className="register-inline-text">¿No tienes cuenta?</span>
            <Link to="/register?from=landing" className="register-inline-link">
              Registrarse
            </Link>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/" className="register-inline-link">Volver al Landing</Link>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {error && (
              <div className="alert-error show" role="alert">
                <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="correo">
                Correo electrónico
              </label>
              <div className="field-wrap">
                <div className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input
                  id="correo"
                  type="email"
                  name="correo"
                  className="form-input"
                  placeholder="usuario@ica.gov.co"
                  value={form.correo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  required
                />
              </div>
              <div className={`field-error ${emailInvalid ? 'show' : ''}`}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Ingrese un correo electrónico válido
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Contraseña
              </label>
              <div className="field-wrap">
                <div className="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn-eye"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? (
                    <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              <div className={`field-error ${passInvalid ? 'show' : ''}`}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                La contraseña no puede estar vacía
              </div>
            </div>

            <div className="notice">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <p>
                Acceso restringido. El uso de esta plataforma esta sujeto a las
                politicas de privacidad y seguridad institucional.
              </p>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Iniciar Sesion'}
            </button>
          </form>

          <div className="form-footer">
            &copy; 2026 Sistema Integrado de Gestion Fitosanitaria - Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  )
}