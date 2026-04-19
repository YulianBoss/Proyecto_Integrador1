import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Register.css'

const ROLES = [
  { value: 'productor', label: 'Productor Agrícola', desc: 'Registro y gestión de predios e inspecciones' },
  { value: 'tecnico',   label: 'Asistente Técnico',  desc: 'Realización de inspecciones fitosanitarias' },
]

// ── Validadores ──────────────────────────────────────────────
const VALIDATIONS = {
  nombre_completo: {
    test: (v) => /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:\s+[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)+$/.test(v.trim()),
    msg: 'El nombre completo debe tener al menos dos palabras y solo letras con espacios.',
  },
  correo: {
    test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    msg: 'Ingresa un correo con dominio válido (ej: usuario@dominio.com).',
  },
  num_identificacion: {
    test: (v) => /^\d{8,10}$/.test(v.trim()),
    msg: 'La identificación es obligatoria y debe tener entre 8 y 10 dígitos.',
  },
  telefono: {
    test: (v) => /^\d{10}$/.test(v.trim()),
    msg: 'El teléfono es obligatorio y debe tener exactamente 10 dígitos.',
  },
  tarjeta_profesional: {
    test: (v) => v === '' || /^\d+$/.test(v.trim()),
    msg: 'La tarjeta profesional debe contener solo números.',
  },
  password: {
    test: (v) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v),
    msg: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.',
  },
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nombre_completo: '', correo: '', password: '', confirmar: '',
    rol: '', num_identificacion: '', telefono: '', tarjeta_profesional: ''
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // ── Valida un campo individual al salir del foco ──────────
  const validateField = (name, value) => {
    if (!VALIDATIONS[name]) return
    const { test, msg } = VALIDATIONS[name]
    setFieldErrors(prev => ({
      ...prev,
      [name]: test(value) ? '' : msg,
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setError('')

    // Permitir solo dígitos en campos numéricos
    if (name === 'num_identificacion' || name === 'telefono' || name === 'tarjeta_profesional') {
      if (!/^\d*$/.test(value)) return   // bloquea caracteres no numéricos
    }

    // Refuerza longitud máxima en tiempo real para evitar entradas fuera de rango
    if (name === 'num_identificacion' && value.length > 10) return
    if (name === 'telefono' && value.length > 10) return

    setForm(prev => ({ ...prev, [name]: value }))

    // Limpia el error del campo mientras el usuario escribe
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (e) => {
    validateField(e.target.name, e.target.value)
  }

  const handleRol = (val) => {
    setError('')
    setForm(prev => ({
      ...prev,
      rol: val,
      tarjeta_profesional: val === 'tecnico' ? prev.tarjeta_profesional : '',
    }))
    if (val !== 'tecnico' && fieldErrors.tarjeta_profesional) {
      setFieldErrors(prev => ({ ...prev, tarjeta_profesional: '' }))
    }
  }

  const nextStep = () => {
    if (!form.rol) { setError('Selecciona un rol para continuar.'); return }
    setError('')
    setStep(2)
  }

  // ── Valida todos los campos antes de enviar ───────────────
  const validateAll = () => {
    const errors = {}

    Object.entries(VALIDATIONS).forEach(([field, { test, msg }]) => {
      if (!test(form[field])) errors[field] = msg
    })

    if (form.password !== form.confirmar) {
      errors.confirmar = 'Las contraseñas no coinciden.'
    }

    if (form.rol === 'tecnico') {
      const tarjeta = form.tarjeta_profesional.trim()
      if (!tarjeta) {
        errors.tarjeta_profesional = 'La tarjeta profesional es obligatoria para Asistente Técnico.'
      } else if (!VALIDATIONS.tarjeta_profesional.test(tarjeta)) {
        errors.tarjeta_profesional = VALIDATIONS.tarjeta_profesional.msg
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateAll()) {
      setError('Corrige los errores antes de continuar.')
      return
    }

    setLoading(true)
    try {
      await authAPI.register({
        nombre_completo:    form.nombre_completo.trim(),
        correo:             form.correo.trim(),
        password:           form.password,
        rol:                form.rol,
        num_identificacion: form.num_identificacion || undefined,
        telefono:           form.telefono           || undefined,
        tarjeta_profesional: form.rol === 'tecnico'
          ? form.tarjeta_profesional.trim()
          : undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  // ── Éxito ─────────────────────────────────────────────────
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

  // ── Helper: muestra error de campo ───────────────────────
  const FieldError = ({ name }) =>
    fieldErrors[name]
      ? <span className="field__error">⚠ {fieldErrors[name]}</span>
      : null

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

        {/* ── Paso 1 — Selección de rol ── */}
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

        {/* ── Paso 2 — Datos personales ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="reg-step-content" key="step2">
            {error && <div className="login-alert login-alert--error"><span>⚠</span> {error}</div>}

            <div className="reg-fields">

              <div className="field">
                <label className="field__label">Nombre completo *</label>
                <input
                  className={`field__input field__input--plain ${fieldErrors.nombre_completo ? 'field__input--error' : ''}`}
                  name="nombre_completo"
                  placeholder="Ej: Carlos Andrés Pérez"
                  value={form.nombre_completo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <FieldError name="nombre_completo" />
              </div>

              <div className="field">
                <label className="field__label">Correo electrónico *</label>
                <input
                  className={`field__input field__input--plain ${fieldErrors.correo ? 'field__input--error' : ''}`}
                  type="email"
                  name="correo"
                  placeholder="correo@dominio.com"
                  value={form.correo}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <FieldError name="correo" />
              </div>

              <div className="reg-fields-row">
                <div className="field">
                  <label className="field__label">N° Identificación *</label>
                  <input
                    className={`field__input field__input--plain ${fieldErrors.num_identificacion ? 'field__input--error' : ''}`}
                    name="num_identificacion"
                    placeholder="Cédula o NIT"
                    value={form.num_identificacion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputMode="numeric"
                    minLength={8}
                    maxLength={10}
                    required
                  />
                  <FieldError name="num_identificacion" />
                </div>
                <div className="field">
                  <label className="field__label">Teléfono *</label>
                  <input
                    className={`field__input field__input--plain ${fieldErrors.telefono ? 'field__input--error' : ''}`}
                    name="telefono"
                    placeholder="10 dígitos"
                    value={form.telefono}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputMode="numeric"
                    minLength={10}
                    maxLength={10}
                    required
                  />
                  <FieldError name="telefono" />
                </div>
              </div>

              {form.rol === 'tecnico' && (
                <div className="field">
                  <label className="field__label">Tarjeta profesional *</label>
                  <input
                    className={`field__input field__input--plain ${fieldErrors.tarjeta_profesional ? 'field__input--error' : ''}`}
                    name="tarjeta_profesional"
                    placeholder="Ej: 123456789"
                    value={form.tarjeta_profesional}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    inputMode="numeric"
                    required
                  />
                  <FieldError name="tarjeta_profesional" />
                </div>
              )}

              <div className="field">
                <label className="field__label">Contraseña * (mín. 8, mayúscula, minúscula y número)</label>
                <input
                  className={`field__input field__input--plain ${fieldErrors.password ? 'field__input--error' : ''}`}
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <FieldError name="password" />
              </div>

              <div className="field">
                <label className="field__label">Confirmar contraseña *</label>
                <input
                  className={`field__input field__input--plain ${fieldErrors.confirmar ? 'field__input--error' : ''}`}
                  type="password"
                  name="confirmar"
                  placeholder="••••••••"
                  value={form.confirmar}
                  onChange={handleChange}
                  onBlur={(e) => {
                    setFieldErrors(prev => ({
                      ...prev,
                      confirmar: e.target.value !== form.password
                        ? 'Las contraseñas no coinciden.'
                        : '',
                    }))
                  }}
                  required
                />
                <FieldError name="confirmar" />
              </div>
            </div>

            <div className="reg-actions">
              <button type="button" className="btn-ghost" onClick={() => { setStep(1); setError('') }}>
                ← Atrás
              </button>
              <button
                type="submit"
                className={`btn-primary ${loading ? 'btn-primary--loading' : ''}`}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Enviando...</> : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}