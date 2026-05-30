import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plagasAPI } from '../../services/api'

const RIESGOS = [
  {
    value: 'bajo',
    label: 'Bajo',
    sub: 'Riesgo bajo',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    selectedBorder: '#16a34a',
    dot: '#16a34a',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-2-8 2v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    value: 'medio',
    label: 'Medio',
    sub: 'Riesgo moderado',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    selectedBorder: '#d97706',
    dot: '#f59e0b',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    value: 'alto',
    label: 'Alto',
    sub: 'Riesgo alto',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
    selectedBorder: '#ea580c',
    dot: '#f97316',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    value: 'critico',
    label: 'Crítico',
    sub: 'Riesgo crítico',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    selectedBorder: '#dc2626',
    dot: '#ef4444',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
        <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
]

const emptyCreate = {
  nombre_comun: '',
  nombre_cientifico: '',
  descripcion: '',
  nivel_riesgo: 'medio',
  cultivo_ids: [],
}

/* ── helpers ── */
function calcProgreso(form) {
  let pts = 0
  if (form.nombre_comun.trim()) pts += 25
  if (form.nombre_cientifico.trim()) pts += 25
  if (form.cultivo_ids.length > 0) pts += 25
  if (form.descripcion.trim()) pts += 25
  return pts
}

function CircularProgress({ pct }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct < 50 ? '#f59e0b' : pct < 75 ? '#045e54' : '#16a34a'
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s' }}
      />
      <text x="45" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">{pct}%</text>
    </svg>
  )
}

/* ── icons ── */
const IconBug = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.5 1.5" /><path d="M14.5 3.5L16 2" />
    <path d="M9 9c0-1.1.9-2 2-2h2a2 2 0 012 2v6a5 5 0 01-10 0V9z" />
    <path d="M5 9H3" /><path d="M21 9h-2" /><path d="M5 15H3" /><path d="M21 15h-2" />
    <path d="M7 21c0-2 .5-3 3-3h4c2.5 0 3 1 3 3" />
  </svg>
)
const IconTag = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)
const IconFlask = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6l2 7H7L9 3z" /><path d="M7 10l-4 9a2 2 0 001.8 2.8h14.4A2 2 0 0021 19l-4-9" />
    <line x1="12" y1="3" x2="12" y2="10" />
  </svg>
)
const IconLeaf = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34.75 18.57 1 8 7 5c3-1.5 6-1 9 0z" />
    <path d="M17 8c-.5 5-3 8.5-6 12" />
  </svg>
)
const IconClipboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
)
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
)
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
const IconLamp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" /><path d="M10 22h4" />
    <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17H8v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
  </svg>
)

export default function AdminPlagasCrear() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [loadingEspecies, setLoadingEspecies] = useState(true)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [error, setError] = useState('')
  const [especies, setEspecies] = useState([])
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busquedaCultivo, setBusquedaCultivo] = useState('')

  const progreso = calcProgreso(createForm)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3200)
  }

  const mapBackendError = (err, fallback) => {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message
    if (code === 'NOMBRE_COMUN_DUPLICADO') return 'Ya existe una plaga con ese nombre general.'
    if (code === 'NOMBRE_CIENTIFICO_DUPLICADO') return 'Ya existe una plaga con ese nombre científico.'
    if (code === 'SIN_CULTIVOS_ASOCIADOS') return 'Debes seleccionar al menos un cultivo asociado.'
    if (code === 'CULTIVO_INVALIDO') return 'Uno o más cultivos seleccionados no existen o están inactivos.'
    if (code === 'CAMPOS_OBLIGATORIOS') return 'Completa los campos obligatorios resaltados.'
    return message || fallback
  }

  const validateCreate = () => {
    const errs = {
      create_nombre_comun: !createForm.nombre_comun.trim(),
      create_nombre_cientifico: !createForm.nombre_cientifico.trim(),
      create_cultivo_ids: createForm.cultivo_ids.length === 0,
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  useEffect(() => {
    const loadEspecies = async () => {
      setLoadingEspecies(true)
      setError('')
      try {
        const res = await plagasAPI.getEspecies()
        setEspecies(res.data || [])
      } catch {
        setEspecies([])
        setError('No fue posible cargar las especies de cultivo.')
      } finally {
        setLoadingEspecies(false)
      }
    }
    loadEspecies()
  }, [])

  const especiesFiltradas = useMemo(() => {
    return especies.filter((e) =>
      e.nombre.toLowerCase().includes(busquedaCultivo.toLowerCase())
    )
  }, [especies, busquedaCultivo])

  const crearPlaga = async () => {
    if (!validateCreate()) {
      showToast('Completa los campos obligatorios y selecciona al menos un cultivo.', 'error')
      return
    }
    setSaving(true)
    try {
      await plagasAPI.create({
        nombre_comun: createForm.nombre_comun,
        nombre_cientifico: createForm.nombre_cientifico,
        descripcion: createForm.descripcion,
        nivel_riesgo: createForm.nivel_riesgo,
        cultivo_ids: createForm.cultivo_ids,
      })
      showToast('Plaga creada correctamente', 'success')
      setCreateForm(emptyCreate)
      setFieldErrors({})
    } catch (e) {
      showToast(mapBackendError(e, 'No fue posible crear la plaga'), 'error')
      const code = e?.response?.data?.code
      if (code === 'NOMBRE_COMUN_DUPLICADO') setFieldErrors((p) => ({ ...p, create_nombre_comun: true }))
      if (code === 'NOMBRE_CIENTIFICO_DUPLICADO') setFieldErrors((p) => ({ ...p, create_nombre_cientifico: true }))
      if (code === 'SIN_CULTIVOS_ASOCIADOS' || code === 'CULTIVO_INVALIDO')
        setFieldErrors((p) => ({ ...p, create_cultivo_ids: true }))
    } finally {
      setSaving(false)
    }
  }

  const riesgoActual = RIESGOS.find((r) => r.value === createForm.nivel_riesgo) || RIESGOS[1]

  return (
    <div className="pc-wrapper">
      {/* Toast */}
      {toast.msg && (
        <div className={`pc-toast ${toast.type === 'error' ? 'pc-toast--error' : 'pc-toast--success'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="pc-page-header">
        <div className="pc-breadcrumb">
          <span>Inicio</span>
          <span className="pc-breadcrumb-sep">›</span>
          <span>Catálogo Fitosanitario</span>
          <span className="pc-breadcrumb-sep">›</span>
          <span className="pc-breadcrumb-active">Nueva Plaga</span>
        </div>
        <div className="pc-title-row">
          <div className="pc-title-icon">
            <IconBug />
          </div>
          <div>
            <h1 className="pc-title">Nueva Plaga</h1>
            <p className="pc-subtitle">Registra información biológica y asocia los cultivos afectados.</p>
          </div>
        </div>
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="pc-layout">
        {/* ── LEFT: Form ── */}
        <div className="pc-form-col">

          {/* Section 1: Datos básicos */}
          <section className="pc-section">
            <div className="pc-section-head">
              <span className="pc-section-num">1</span>
              <div>
                <h2 className="pc-section-title">Datos básicos <IconInfo /></h2>
                <p className="pc-section-desc">Información general de la plaga</p>
              </div>
            </div>

            <div className="pc-grid-2">
              <div className="pc-field">
                <label className="pc-label">Nombre común <span className="pc-req">*</span></label>
                <input
                  type="text"
                  className={`pc-input ${fieldErrors.create_nombre_comun ? 'pc-input--error' : ''}`}
                  placeholder="Ej. Broca del café"
                  value={createForm.nombre_comun}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nombre_comun: e.target.value }))}
                />
              </div>
              <div className="pc-field">
                <label className="pc-label">Nombre científico <IconInfo /> <span className="pc-req">*</span></label>
                <input
                  type="text"
                  className={`pc-input ${fieldErrors.create_nombre_cientifico ? 'pc-input--error' : ''}`}
                  placeholder="Ej. Hypothenemus hampei"
                  value={createForm.nombre_cientifico}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
                />
              </div>
            </div>

            {/* Risk radio cards */}
            <div className="pc-field" style={{ marginTop: '20px' }}>
              <label className="pc-label">Nivel de riesgo inicial <IconInfo /></label>
              <p className="pc-label-hint">Determina la prioridad de seguimiento de la plaga.</p>
              <div className="pc-risk-grid">
                {RIESGOS.map((r) => {
                  const sel = createForm.nivel_riesgo === r.value
                  return (
                    <label
                      key={r.value}
                      className={`pc-risk-card ${sel ? 'pc-risk-card--selected' : ''}`}
                      style={sel ? { borderColor: r.selectedBorder, background: r.bg } : {}}
                    >
                      <input
                        type="radio"
                        name="nivel_riesgo"
                        value={r.value}
                        checked={sel}
                        onChange={() => setCreateForm((f) => ({ ...f, nivel_riesgo: r.value }))}
                        className="pc-risk-radio"
                      />
                      <span className="pc-risk-icon" style={{ color: r.color }}>{r.icon}</span>
                      <span className="pc-risk-label" style={{ color: sel ? r.color : undefined }}>{r.label}</span>
                      <span className="pc-risk-sub">{r.sub}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Section 2: Descripción biológica */}
          <section className="pc-section">
            <div className="pc-section-head">
              <span className="pc-section-num">2</span>
              <div>
                <h2 className="pc-section-title">Descripción biológica <IconInfo /></h2>
                <p className="pc-section-desc">Añade características relevantes, síntomas, propagación y comportamiento.</p>
              </div>
            </div>

            <div className="pc-field">
              <textarea
                rows={5}
                className="pc-input pc-textarea"
                placeholder="Describe aquí las características biológicas de la plaga, síntomas visibles, ciclo de vida, hospedantes, métodos de propagación, etc."
                value={createForm.descripcion}
                onChange={(e) => setCreateForm((f) => ({ ...f, descripcion: e.target.value }))}
                maxLength={1000}
              />
              <div className="pc-char-count">{createForm.descripcion.length} / 1000 caracteres</div>
            </div>
          </section>

          {/* Section 3: Cultivos asociados */}
          <section className="pc-section">
            <div className="pc-section-head">
              <span className="pc-section-num">3</span>
              <div>
                <h2 className="pc-section-title">Cultivos asociados <IconInfo /></h2>
                <p className="pc-section-desc">Selecciona todos los cultivos que puedan verse afectados por esta plaga.</p>
              </div>
            </div>

            {/* Search */}
            <div className="pc-search-box">
              <IconSearch />
              <input
                type="text"
                className="pc-search-input"
                placeholder="Buscar cultivo..."
                value={busquedaCultivo}
                onChange={(e) => setBusquedaCultivo(e.target.value)}
              />
            </div>

            {/* Checkbox grid */}
            <div className={`pc-cultivos-grid ${fieldErrors.create_cultivo_ids ? 'pc-cultivos-grid--error' : ''}`}>
              {loadingEspecies ? (
                <span className="pc-loading">Cargando cultivos...</span>
              ) : especiesFiltradas.length === 0 ? (
                <span className="pc-no-results">No se encontraron cultivos que coincidan.</span>
              ) : (
                especiesFiltradas.map((e) => {
                  const checked = createForm.cultivo_ids.includes(e.id)
                  return (
                    <label
                      key={e.id}
                      className={`pc-cultivo-item ${checked ? 'pc-cultivo-item--checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) =>
                          setCreateForm((form) => ({
                            ...form,
                            cultivo_ids: ev.target.checked
                              ? [...form.cultivo_ids, e.id]
                              : form.cultivo_ids.filter((id) => id !== e.id),
                          }))
                        }
                      />
                      <span>{e.nombre}</span>
                    </label>
                  )
                })
              )}
            </div>

            {/* Selected tags */}
            {createForm.cultivo_ids.length > 0 && (
              <div className="pc-selected-row">
                <span className="pc-selected-count">
                  Cultivos seleccionados ({createForm.cultivo_ids.length})
                </span>
                <div className="pc-tags">
                  {createForm.cultivo_ids.map((id) => {
                    const esp = especies.find((e) => e.id === id)
                    return esp ? (
                      <span key={id} className="pc-tag">
                        {esp.nombre}
                        <button
                          className="pc-tag-remove"
                          onClick={() =>
                            setCreateForm((f) => ({
                              ...f,
                              cultivo_ids: f.cultivo_ids.filter((i) => i !== id),
                            }))
                          }
                        >×</button>
                      </span>
                    ) : null
                  })}
                </div>
                <button
                  className="pc-clear-all"
                  onClick={() => setCreateForm((f) => ({ ...f, cultivo_ids: [] }))}
                >
                  Limpiar todo
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            )}
          </section>

          {/* Bottom actions */}
          <div className="pc-bottom-actions">
            <button className="pc-btn-cancel" onClick={() => navigate(-1)}>Cancelar</button>
            <button
              className="pc-btn-save"
              disabled={saving || loadingEspecies}
              onClick={crearPlaga}
            >
              <IconSave />
              {saving ? 'Guardando...' : 'Guardar Plaga'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Summary panel ── */}
        <aside className="pc-sidebar">
          <h3 className="pc-sidebar-title">Resumen de la plaga</h3>

          {/* Estado */}
          <div className="pc-sidebar-block">
            <p className="pc-sidebar-block-title">Estado del registro</p>
            <div className="pc-progress-row">
              <CircularProgress pct={progreso} />
              <div>
                <p className="pc-progress-label">
                  {progreso < 50 ? 'En progreso' : progreso < 100 ? 'Casi completo' : 'Completo'}
                </p>
                <p className="pc-progress-hint">
                  {progreso < 100
                    ? 'Completa la información para guardar la plaga.'
                    : 'Listo para guardar.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pc-sidebar-divider" />

          {/* Información ingresada */}
          <div className="pc-sidebar-block">
            <p className="pc-sidebar-block-title">Información ingresada</p>

            <div className="pc-info-row">
              <span className="pc-info-icon"><IconTag /></span>
              <div>
                <p className="pc-info-key">Nombre común</p>
                <p className="pc-info-val">{createForm.nombre_comun || <em className="pc-empty">Sin ingresar</em>}</p>
              </div>
            </div>

            <div className="pc-info-row">
              <span className="pc-info-icon"><IconFlask /></span>
              <div>
                <p className="pc-info-key">Nombre científico</p>
                <p className="pc-info-val">{createForm.nombre_cientifico || <em className="pc-empty">Sin ingresar</em>}</p>
              </div>
            </div>

            <div className="pc-info-row">
              <span className="pc-info-icon">
                <span
                  className="pc-risk-dot"
                  style={{ background: riesgoActual.dot }}
                />
              </span>
              <div>
                <p className="pc-info-key">Riesgo inicial</p>
                <p className="pc-info-val" style={{ color: riesgoActual.color, fontWeight: 600 }}>
                  {riesgoActual.label}
                </p>
              </div>
            </div>

            <div className="pc-info-row">
              <span className="pc-info-icon"><IconLeaf /></span>
              <div>
                <p className="pc-info-key">Cultivos asociados</p>
                <p className="pc-info-val">
                  {createForm.cultivo_ids.length > 0
                    ? <>{createForm.cultivo_ids.length} <span style={{ fontWeight: 400, color: '#64748b' }}>seleccionados</span></>
                    : <em className="pc-empty">Sin seleccionar</em>}
                </p>
              </div>
            </div>

            <div className="pc-info-row">
              <span className="pc-info-icon"><IconClipboard /></span>
              <div>
                <p className="pc-info-key">Descripción biológica</p>
                <p className="pc-info-val">
                  {createForm.descripcion.trim()
                    ? createForm.descripcion.length > 60
                      ? createForm.descripcion.slice(0, 60) + '…'
                      : createForm.descripcion
                    : <em className="pc-empty">En progreso</em>}
                </p>
              </div>
            </div>
          </div>

          <div className="pc-sidebar-divider" />

          {/* Consejo */}
          <div className="pc-tip-box">
            <div className="pc-tip-header">
              <span className="pc-tip-icon"><IconLamp /></span>
              <span className="pc-tip-label">Consejo</span>
            </div>
            <p className="pc-tip-text">
              Mientras más completa sea la información, mejor será la gestión y seguimiento de la plaga.
            </p>
          </div>
        </aside>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .pc-wrapper {
          font-family: 'Inter', sans-serif;
          padding: 28px 32px;
          max-width: 1280px;
          margin: 0 auto;
          color: #0f172a;
          background: #f8fafc;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* Toast */
        .pc-toast {
          position: fixed; top: 20px; right: 24px; z-index: 9999;
          padding: 13px 20px; border-radius: 10px; font-size: 0.87rem;
          font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          animation: slideInRight 0.3s ease;
        }
        .pc-toast--success { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; }
        .pc-toast--error   { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
        @keyframes slideInRight {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        /* Page header */
        .pc-breadcrumb { font-size: 0.8rem; color: #64748b; margin-bottom: 18px; display: flex; align-items: center; gap: 6px; }
        .pc-breadcrumb-sep { color: #cbd5e1; }
        .pc-breadcrumb-active { color: #0f172a; font-weight: 600; }
        .pc-title-row { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
        .pc-title-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: #ecfdf5;
          display: flex; align-items: center; justify-content: center;
          color: #045e54; flex-shrink: 0;
        }
        .pc-title { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin: 0; }
        .pc-subtitle { font-size: 0.87rem; color: #64748b; margin: 4px 0 0; }
        .pc-header-actions { margin-left: auto; display: flex; gap: 10px; }

        /* Buttons */
        .pc-btn-back {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 9px;
          border: 1px solid #e2e8f0; background: #fff; color: #334155;
          font-size: 0.87rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }
        .pc-btn-back:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .pc-btn-save {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 20px; border-radius: 9px;
          border: none;
          background: #045e54;
          color: #fff; font-size: 0.87rem; font-weight: 700;
          cursor: pointer; transition: all 0.22s;
          box-shadow: 0 4px 12px rgba(4,94,84,0.15); font-family: inherit;
        }
        .pc-btn-save:hover:not(:disabled) {
          background: #03423b;
          transform: translateY(-1px); box-shadow: 0 8px 20px rgba(4,94,84,0.25);
        }
        .pc-btn-save:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
        .pc-btn-cancel {
          padding: 9px 20px; border-radius: 9px; border: 1px solid #e2e8f0;
          background: #fff; color: #64748b; font-size: 0.87rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .pc-btn-cancel:hover { background: #f1f5f9; }

        /* Layout */
        .pc-layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
        .pc-form-col { display: flex; flex-direction: column; gap: 20px; }

        /* Section card */
        .pc-section {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; padding: 24px 28px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .pc-section-head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 22px; }
        .pc-section-num {
          min-width: 28px; height: 28px; border-radius: 50%;
          background: #045e54;
          color: #fff; font-size: 0.8rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }
        .pc-section-title {
          font-size: 0.98rem; font-weight: 700; color: #0f172a; margin: 0;
          display: flex; align-items: center; gap: 5px;
        }
        .pc-section-title svg { color: #94a3b8; }
        .pc-section-desc { font-size: 0.8rem; color: #64748b; margin: 3px 0 0; }

        /* Form fields */
        .pc-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .pc-field { display: flex; flex-direction: column; gap: 6px; }
        .pc-label {
          font-size: 0.83rem; font-weight: 600; color: #334155;
          display: flex; align-items: center; gap: 4px;
        }
        .pc-label svg { color: #94a3b8; }
        .pc-label-hint { font-size: 0.78rem; color: #64748b; margin: -2px 0 10px; }
        .pc-req { color: #ef4444; margin-left: 2px; }
        .pc-input {
          padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 9px;
          font-size: 0.88rem; color: #0f172a; background: #fff;
          transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
          outline: none;
        }
        .pc-input:focus { border-color: #045e54; box-shadow: 0 0 0 3px rgba(4,94,84,0.1); }
        .pc-input--error { border-color: #ef4444; background: #fef2f2; }
        .pc-textarea { resize: vertical; min-height: 110px; }
        .pc-char-count { font-size: 0.75rem; color: #94a3b8; text-align: right; margin-top: 4px; }

        /* Risk cards */
        .pc-risk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .pc-risk-card {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 14px 10px; border: 1.5px solid #e2e8f0; border-radius: 11px;
          cursor: pointer; background: #fff; transition: all 0.2s;
          position: relative;
        }
        .pc-risk-card:hover { border-color: #94a3b8; background: #f8fafc; }
        .pc-risk-card--selected { font-weight: 600; }
        .pc-risk-radio {
          position: absolute; top: 8px; right: 8px;
          width: 14px; height: 14px; cursor: pointer;
        }
        .pc-risk-icon { display: flex; align-items: center; }
        .pc-risk-label { font-size: 0.85rem; font-weight: 700; }
        .pc-risk-sub   { font-size: 0.72rem; color: #64748b; }

        /* Search */
        .pc-search-box {
          display: flex; align-items: center; gap: 9px;
          border: 1.5px solid #e2e8f0; border-radius: 9px;
          padding: 9px 13px; background: #fff; margin-bottom: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pc-search-box:focus-within { border-color: #045e54; box-shadow: 0 0 0 3px rgba(4,94,84,0.1); }
        .pc-search-box svg { color: #94a3b8; flex-shrink: 0; }
        .pc-search-input { border: none; outline: none; font-size: 0.87rem; color: #0f172a; background: transparent; font-family: inherit; width: 100%; }
        .pc-search-input::placeholder { color: #94a3b8; }

        /* Cultivos grid */
        .pc-cultivos-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 8px; border: 1.5px solid #e2e8f0; padding: 14px;
          border-radius: 11px; max-height: 220px; overflow-y: auto;
          background: #f8fafc;
        }
        .pc-cultivos-grid--error { border-color: #ef4444; background: #fef9f9; }
        .pc-cultivo-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.82rem; color: #475569; cursor: pointer;
          padding: 6px 10px; border-radius: 7px;
          transition: background 0.15s; user-select: none;
          position: relative;
        }
        .pc-cultivo-item input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: #045e54; }
        .pc-cultivo-item:hover { background: #e2e8f0; }
        .pc-cultivo-item--checked { background: #ecfdf5; color: #045e54; font-weight: 600; }
        .pc-cultivo-check {
          display: inline-flex; align-items: center; justify-content: center;
          width: 15px; height: 15px; background: #045e54;
          border-radius: 3px; flex-shrink: 0;
        }
        .pc-loading { font-size: 0.82rem; color: #64748b; grid-column: 1/-1; padding: 10px; text-align: center; }
        .pc-no-results { font-size: 0.82rem; color: #94a3b8; grid-column: 1/-1; padding: 10px; text-align: center; }

        /* Selected tags row */
        .pc-selected-row {
          margin-top: 12px; display: flex; align-items: center;
          gap: 10px; flex-wrap: wrap;
        }
        .pc-selected-count { font-size: 0.8rem; font-weight: 700; color: #045e54; white-space: nowrap; }
        .pc-tags { display: flex; gap: 7px; flex-wrap: wrap; }
        .pc-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: #ecfdf5; border: 1px solid #a7f3d0;
          color: #045e54; font-size: 0.78rem; font-weight: 600;
          padding: 3px 9px; border-radius: 20px;
        }
        .pc-tag-remove {
          background: none; border: none; color: #10b981;
          cursor: pointer; font-size: 1rem; line-height: 1;
          padding: 0; margin-left: 2px; font-family: inherit;
          transition: color 0.15s;
        }
        .pc-tag-remove:hover { color: #dc2626; }
        .pc-clear-all {
          margin-left: auto; display: flex; align-items: center; gap: 5px;
          background: none; border: none; color: #94a3b8; font-size: 0.78rem;
          cursor: pointer; padding: 4px 8px; border-radius: 6px;
          transition: color 0.15s, background 0.15s; font-family: inherit;
        }
        .pc-clear-all:hover { color: #dc2626; background: #fef2f2; }

        /* Bottom actions */
        .pc-bottom-actions {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 20px 0 4px;
        }

        /* Sidebar */
        .pc-sidebar {
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 14px; padding: 22px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          position: sticky; top: 24px;
        }
        .pc-sidebar-title { font-size: 0.97rem; font-weight: 700; color: #0f172a; margin: 0 0 18px; }
        .pc-sidebar-block { margin-bottom: 18px; }
        .pc-sidebar-block-title { font-size: 0.78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
        .pc-sidebar-divider { height: 1px; background: #f1f5f9; margin: 4px 0 18px; }

        /* Progress */
        .pc-progress-row { display: flex; align-items: center; gap: 14px; }
        .pc-progress-label { font-size: 0.88rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .pc-progress-hint  { font-size: 0.76rem; color: #64748b; margin: 0; line-height: 1.4; }

        /* Info rows */
        .pc-info-row { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
        .pc-info-row:last-child { border-bottom: none; }
        .pc-info-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: #f1f5f9; display: flex; align-items: center;
          justify-content: center; color: #64748b; flex-shrink: 0;
        }
        .pc-info-key  { font-size: 0.74rem; color: #94a3b8; margin: 0 0 2px; }
        .pc-info-val  { font-size: 0.84rem; font-weight: 600; color: #0f172a; margin: 0; }
        .pc-empty     { font-style: italic; color: #94a3b8; font-weight: 400; }
        .pc-risk-dot  { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

        /* Tip box */
        .pc-tip-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; }
        .pc-tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
        .pc-tip-icon { color: #16a34a; display: flex; }
        .pc-tip-label { font-size: 0.83rem; font-weight: 700; color: #15803d; }
        .pc-tip-text  { font-size: 0.78rem; color: #166534; margin: 0; line-height: 1.5; }

        /* Responsive */
        @media (max-width: 900px) {
          .pc-layout { grid-template-columns: 1fr; }
          .pc-sidebar { position: static; }
          .pc-risk-grid { grid-template-columns: repeat(2, 1fr); }
          .pc-grid-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .pc-wrapper { padding: 16px; }
          .pc-risk-grid { grid-template-columns: repeat(2, 1fr); }
          .pc-header-actions { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}