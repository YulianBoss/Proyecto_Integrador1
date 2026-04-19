import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Register.css'

const ROLES = [
  { value: 'productor', label: 'Productor Agrícola', desc: 'Registro y gestión de predios e inspecciones' },
  { value: 'tecnico',   label: 'Asistente Técnico',  desc: 'Realización de inspecciones fitosanitarias' },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nombre_completo: '', correo: '', password: '', confirmar: '',
    rol: '', num_identificacion: '', telefono: ''
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRol = (val) => {
    setError('')
    setForm(prev => ({ ...prev, rol: val }))
  }

  const nextStep = () => {
    if (!form.rol) { setError('Selecciona un rol para continuar.'); return }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre_completo || !form.correo || !form.password) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.')
      return
    }
    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await authAPI.register({
        nombre_completo:  form.nombre_completo,
        correo:           form.correo,
        password:         form.password,
        rol:              form.rol,
        num_identificacion: form.num_identificacion || undefined,
        telefono:         form.telefono || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="reg-success-wrap">
      <div className="reg-success">
        <span className="success-emoji">✅</span>
        <h2>¡Solicitud enviada!</h2>
        <p>
          Tu solicitud de acceso fue registrada con éxito. El administrador del ICA
          revisará tu información y activará tu cuenta. Recibirás confirmación pronto.
        </p>
        <Link to="/login" className="btn-back">Volver al inicio de sesión</Link>
      </div>
    </div>
  )

  return (
    <div className="reg-root">
      <div className="reg-card">
        {/* Header */}
        <div className="reg-card__header">
          <Link to="/login" className="reg-back-link">← Volver</Link>
          <div className="reg-logo">
            <span>🌿</span>
            <span className="reg-logo__text">SIGFITO</span>
          </div>
          <h2 className="reg-card__title">Solicitud de acceso</h2>
          <p className="reg-card__sub">Instituto Colombiano Agropecuario — ICA</p>

          {/* Steps indicator */}
          <div className="reg-steps">
            <div className={`reg-step ${step >= 1 ? 'reg-step--active' : ''}`}>
              <div className="reg-step__dot">1</div>
              <span>Rol</span>
            </div>
            <div className="reg-step__line" />
            <div className={`reg-step ${step >= 2 ? 'reg-step--active' : ''}`}>
              <div className="reg-step__dot">2</div>
              <span>Datos</span>
            </div>
          </div>
        </div>

        {/* Paso 1 — Selección de rol */}
        {step === 1 && (
          <div className="reg-step-content" key="step1">
            <p className="reg-step__label">¿Cuál es tu rol en el sistema?</p>
            {error && <div className="login-alert login-alert--error"><span>⚠</span> {error}</div>}

            <div className="rol-cards">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`rol-card ${form.rol === r.value ? 'rol-card--selected' : ''}`}
                  onClick={() => handleRol(r.value)}
                >
                  <span className="rol-card__icon">
                    {r.value === 'productor' ? '🌱' : '🔬'}
                  </span>
                  <div>
                    <strong>{r.label}</strong>
                    <span>{r.desc}</span>
                  </div>
                  {form.rol === r.value && <span className="rol-card__check">✓</span>}
                </button>
              ))}
            </div>

            <div className="reg-notice">
              ℹ️ Solo puedes solicitar acceso como Productor o Asistente Técnico.
              Los administradores son designados internamente por el ICA.
            </div>

            <button type="button" className="btn-primary" onClick={nextStep}>
              Continuar →
            </button>
          </div>
        )}

        {/* Paso 2 — Datos personales */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="reg-step-content" key="step2">
            {error && <div className="login-alert login-alert--error"><span>⚠</span> {error}</div>}

            <div className="reg-fields">
              <div className="field">
                <label className="field__label">Nombre completo *</label>
                <input
                  className="field__input field__input--plain"
                  name="nombre_completo"
                  placeholder="Ej: Carlos Andrés Pérez"
                  value={form.nombre_completo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label">Correo electrónico *</label>
                <input
                  className="field__input field__input--plain"
                  type="email"
                  name="correo"
                  placeholder="correo@dominio.com"
                  value={form.correo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="reg-fields-row">
                <div className="field">
                  <label className="field__label">N° Identificación</label>
                  <input
                    className="field__input field__input--plain"
                    name="num_identificacion"
                    placeholder="Cédula o NIT"
                    value={form.num_identificacion}
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Teléfono</label>
                  <input
                    className="field__input field__input--plain"
                    name="telefono"
                    placeholder="3001234567"
                    value={form.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label">Contraseña * (mín. 6 caracteres)</label>
                <input
                  className="field__input field__input--plain"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label">Confirmar contraseña *</label>
                <input
                  className="field__input field__input--plain"
                  type="password"
                  name="confirmar"
                  placeholder="••••••••"
                  value={form.confirmar}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="reg-actions">
              <button type="button" className="btn-ghost" onClick={() => { setStep(1); setError('') }}>
                ← Atrás
              </button>
              <button type="submit" className={`btn-primary ${loading ? 'btn-primary--loading' : ''}`} disabled={loading}>
                {loading ? <><span className="spinner" /> Enviando...</> : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}