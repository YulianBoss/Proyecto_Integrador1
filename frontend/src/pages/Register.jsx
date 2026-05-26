import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import COLOMBIA_DEPARTAMENTOS from '../data/colombiaMunicipios'
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

function Icon({ className = '', viewBox = '0 0 24 24', children }) {
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true" fill="none">
      {children}
    </svg>
  )
}

function IconArrowLeft({ className = '' }) {
  return (
    <Icon className={className}>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function IconLeaf({ className = '' }) {
  return (
    <Icon className={className}>
      <path d="M18 5c-5.5.4-9.55 2.9-11.63 7.16C5.17 14.58 5 17.14 5 19c1.86 0 4.42-.17 6.84-1.37C16.1 15.55 18.6 11.5 19 6a1 1 0 0 0-1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16c1.5-2.2 3.7-4.4 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function IconSprout({ className = '' }) {
  return (
    <Icon className={className}>
      <path d="M12 21v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14c0-4.4 2.6-7 7-7 0 4.4-2.6 7-7 7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14c0-3.8-2.3-6-6-6 0 3.8 2.3 6 6 6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function IconSearch({ className = '' }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 15l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  )
}

function IconCheckCircle({ className = '' }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.2l2.4 2.4 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

function IconAlert({ className = '' }) {
  return (
    <Icon className={className}>
      <path d="M12 3l9 16H3L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </Icon>
  )
}

function IconInfo({ className = '' }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </Icon>
  )
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
function IcoPin() {
  return <svg viewBox="0 0 24 24" {...S} style={{ width:15, height:15, flexShrink:0 }}><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nombre_completo: '', correo: '', password: '', confirmar: '',
    rol: '', num_identificacion: '', telefono: '', tarjeta_profesional: '',
    departamento: '', municipio: '',
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
      departamento: val === 'tecnico' ? prev.departamento : '',
      municipio:    val === 'tecnico' ? prev.municipio    : '',
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
      if (!form.departamento) errors.departamento = 'Selecciona el departamento de ubicación.'
      if (!form.municipio)    errors.municipio    = 'Selecciona el municipio de ubicación.'
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
        departamento: form.rol === 'tecnico' ? form.departamento : undefined,
        municipio:    form.rol === 'tecnico' ? form.municipio    : undefined,
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
        <span className="success-icon-wrap">
          <IconCheckCircle className="success-icon" />
        </span>
        <h2>¡Solicitud enviada!</h2>
        <p>
          Tu solicitud de acceso fue registrada con éxito. El administrador del ICA
          revisará tu información y activará tu cuenta. Recibirás confirmación pronto.
        </p>
        <Link to="/login?from=landing" className="btn-back">Volver al inicio de sesión</Link>
      </div>
    </div>
  )

  // ── Helper: muestra error de campo ───────────────────────
  const FieldError = ({ name }) =>
    fieldErrors[name]
      ? (
        <span className="field__error">
          <IconAlert className="field__error-icon" />
          <span>{fieldErrors[name]}</span>
        </span>
      )
      : null

  return (
    <div className="reg-root">
      <div className="reg-card">
        {/* Header */}
        <div className="reg-card__header">
          <Link to="/login?from=landing" className="reg-back-link">
            <IconArrowLeft className="reg-back-link__icon" />
            <span>Volver</span>
          </Link>
          <div className="reg-logo">
            <span className="reg-logo__mark">
              <IconLeaf className="reg-logo__icon" />
            </span>
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
            {error && (
              <div className="login-alert login-alert--error">
                <IconAlert className="login-alert__icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="rol-cards">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`rol-card ${form.rol === r.value ? 'rol-card--selected' : ''}`}
                  onClick={() => handleRol(r.value)}
                >
                  <span className="rol-card__icon">
                    {r.value === 'productor'
                      ? <IconSprout className="rol-card__icon-svg" />
                      : <IconSearch className="rol-card__icon-svg" />}
                  </span>
                  <div>
                    <strong>{r.label}</strong>
                    <span>{r.desc}</span>
                  </div>
                  {form.rol === r.value && (
                    <span className="rol-card__check">
                      <IconCheckCircle className="rol-card__check-icon" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="reg-notice">
              <IconInfo className="reg-notice__icon" />
              <span>
                Solo puedes solicitar acceso como Productor o Asistente Técnico.
                Los administradores son designados internamente por el ICA.
              </span>
            </div>

            <button type="button" className="btn-primary" onClick={nextStep}>
              <span>Continuar</span>
            </button>
          </div>
        )}

        {/* ── Paso 2 — Datos personales ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="reg-step-content" key="step2">
            {error && (
              <div className="login-alert login-alert--error">
                <IconAlert className="login-alert__icon" />
                <span>{error}</span>
              </div>
            )}

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

              {form.rol === 'tecnico' && (
                <div className="ubicacion-tecnico-box">
                  <div className="ubicacion-tecnico-box__header">
                    <IcoPin />
                    <span>Ubicación del asistente técnico</span>
                  </div>
                  <div className="reg-fields-row">
                    <div className="field">
                      <label className="field__label">Departamento *</label>
                      <select
                        className={`field__input field__input--plain ${fieldErrors.departamento ? 'field__input--error' : ''}`}
                        value={form.departamento}
                        onChange={e => {
                          setForm(prev => ({ ...prev, departamento: e.target.value, municipio: '' }))
                          if (fieldErrors.departamento) setFieldErrors(prev => ({ ...prev, departamento: '' }))
                        }}
                      >
                        <option value="">-- Selecciona --</option>
                        {[...COLOMBIA_DEPARTAMENTOS]
                          .sort((a, b) => a.departamento.localeCompare(b.departamento))
                          .map(d => (
                            <option key={d.departamento} value={d.departamento}>{d.departamento}</option>
                          ))}
                      </select>
                      <FieldError name="departamento" />
                    </div>
                    <div className="field">
                      <label className="field__label">Municipio *</label>
                      <select
                        className={`field__input field__input--plain ${fieldErrors.municipio ? 'field__input--error' : ''}`}
                        value={form.municipio}
                        disabled={!form.departamento}
                        onChange={e => {
                          setForm(prev => ({ ...prev, municipio: e.target.value }))
                          if (fieldErrors.municipio) setFieldErrors(prev => ({ ...prev, municipio: '' }))
                        }}
                      >
                        <option value="">-- Selecciona --</option>
                        {(COLOMBIA_DEPARTAMENTOS.find(d => d.departamento === form.departamento)?.municipios || [])
                          .sort((a, b) => a.localeCompare(b))
                          .map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                      </select>
                      <FieldError name="municipio" />
                    </div>
                  </div>
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
                <IconArrowLeft className="btn-inline-icon" />
                <span>Atrás</span>
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