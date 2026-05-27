import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plagasAPI } from '../../services/api'
import './AdminMockPages.css'

const RIESGOS = ['bajo', 'medio', 'alto']

const emptyCreate = {
  nombre_comun: '',
  nombre_cientifico: '',
  descripcion: '',
  nivel_riesgo: 'medio',
  cultivo_ids: [],
}

export default function AdminPlagasCrear() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [loadingEspecies, setLoadingEspecies] = useState(true)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [especies, setEspecies] = useState([])
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [fieldErrors, setFieldErrors] = useState({})

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  const mapBackendError = (err, fallback) => {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message

    if (code === 'NOMBRE_COMUN_DUPLICADO') return 'Ya existe una plaga con ese nombre general.'
    if (code === 'NOMBRE_CIENTIFICO_DUPLICADO') return 'E1: Ya existe una plaga con ese nombre científico.'
    if (code === 'SIN_CULTIVOS_ASOCIADOS') return 'E2: Debes seleccionar al menos un cultivo asociado.'
    if (code === 'CULTIVO_INVALIDO') return 'Uno o más cultivos seleccionados no existen o están inactivos.'
    if (code === 'CAMPOS_OBLIGATORIOS') return 'E6: Completa los campos obligatorios resaltados.'

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
        setError('No fue posible cargar las especies')
      } finally {
        setLoadingEspecies(false)
      }
    }
    loadEspecies()
  }, [])

  const crearPlaga = async () => {
    if (!validateCreate()) {
      showToast('E6: Completa los campos obligatorios y selecciona al menos un cultivo.')
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
      showToast('Plaga creada correctamente')
      setCreateForm(emptyCreate)
      setFieldErrors({})
      // Opcional: navigate('/admin/plagas') después de guardar exitosamente
    } catch (e) {
      showToast(mapBackendError(e, 'No fue posible crear la plaga'))
      if (e?.response?.data?.code === 'NOMBRE_COMUN_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, create_nombre_comun: true }))
      }
      if (e?.response?.data?.code === 'NOMBRE_CIENTIFICO_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, create_nombre_cientifico: true }))
      }
      if (e?.response?.data?.code === 'SIN_CULTIVOS_ASOCIADOS' || e?.response?.data?.code === 'CULTIVO_INVALIDO') {
        setFieldErrors((prev) => ({ ...prev, create_cultivo_ids: true }))
      }
    } finally {
      setSaving(false)
    }
  }

  const especiesActivas = useMemo(() => especies, [especies])

  return (
    <section className="mock-admin-page">
      {/* Alertas */}
      {toast && <div className="alert-toast">{toast}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* Cabecera Pro */}
      <header className="mock-header-flex">
        <div>
          <h2>Registrar Nueva Plaga</h2>
          <p>Ingresa los detalles biológicos y asocia los cultivos afectados.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary-pro">
          Volver
        </button>
      </header>

      {/* Tarjeta del Formulario */}
      <article className="form-card-pro">
        <div className="form-grid-2col">
          
          <div className="form-group">
            <label>Nombre Común <span className="req">*</span></label>
            <input
              type="text"
              className={`form-input ${fieldErrors.create_nombre_comun ? 'input-error' : ''}`}
              placeholder="Ej. Broca del café"
              value={createForm.nombre_comun}
              onChange={(e) => setCreateForm((f) => ({ ...f, nombre_comun: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Nombre Científico <span className="req">*</span></label>
            <input
              type="text"
              className={`form-input ${fieldErrors.create_nombre_cientifico ? 'input-error' : ''}`}
              placeholder="Ej. Hypothenemus hampei"
              value={createForm.nombre_cientifico}
              onChange={(e) => setCreateForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Nivel de Riesgo Inicial</label>
            <select 
              className="form-input" 
              value={createForm.nivel_riesgo} 
              onChange={(e) => setCreateForm((f) => ({ ...f, nivel_riesgo: e.target.value }))}
            >
              <option value="bajo">🟢 Riesgo Bajo</option>
              <option value="medio">🟡 Riesgo Medio</option>
              <option value="alto">🔴 Riesgo Alto</option>
            </select>
          </div>

          <div className="form-group span-2">
            <label>Descripción Biológica</label>
            <textarea
              rows={3}
              className="form-input"
              placeholder="Añade características relevantes, síntomas visuales, etc."
              value={createForm.descripcion}
              onChange={(e) => setCreateForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </div>

          <div className="form-group span-2">
            <label>Cultivos Susceptibles / Asociados <span className="req">*</span></label>
            <div className={`checkbox-grid ${fieldErrors.create_cultivo_ids ? 'box-error' : ''}`}>
              {loadingEspecies ? (
                <span className="loading-text">Cargando cultivos...</span>
              ) : (
                especiesActivas.map((e) => {
                  const checked = createForm.cultivo_ids.includes(e.id)
                  return (
                    <label key={e.id} className={`checkbox-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setCreateForm((form) => ({
                          ...form,
                          cultivo_ids: event.target.checked
                            ? [...form.cultivo_ids, e.id]
                            : form.cultivo_ids.filter((id) => id !== e.id),
                        }))}
                      />
                      <span>{e.nombre}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

        </div>

        <div className="form-actions">
          <button 
            className="btn-primary-pro" 
            disabled={saving || loadingEspecies} 
            onClick={crearPlaga}
          >
            {saving ? 'Guardando...' : 'Guardar Nueva Plaga'}
          </button>
        </div>
      </article>

      {/* Estilos embebidos seguros para el componente */}
      <style>{`
        .alert-toast { background: #ecfeff; border: 1px solid #a5f3fc; color: #155e75; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
        .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
        .form-card-pro { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .form-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: #334155; }
        .req { color: #ef4444; }
        .span-2 { grid-column: span 2; }
        .form-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; color: #0f172a; transition: border-color 0.2s; font-family: inherit; }
        .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .input-error { border-color: #ef4444; background: #fef2f2; }
        .box-error { border: 1px solid #ef4444 !important; }
        .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; max-height: 200px; overflow-y: auto; background: #f8fafc; }
        .checkbox-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #475569; cursor: pointer; padding: 6px; border-radius: 6px; transition: background 0.2s; }
        .checkbox-item:hover { background: #e2e8f0; }
        .checkbox-item.checked { background: #dbeafe; color: #1e40af; font-weight: 500; }
        .checkbox-item input { width: 16px; height: 16px; cursor: pointer; }
        .form-actions { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; }
        .btn-secondary-pro { background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
        .btn-secondary-pro:hover { background: #f1f5f9; }
        @media (max-width: 768px) { .form-grid-2col { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
      `}</style>
    </section>
  )
}