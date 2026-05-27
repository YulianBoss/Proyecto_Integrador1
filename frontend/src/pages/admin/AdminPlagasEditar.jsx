import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plagasAPI } from '../../services/api'
import './AdminMockPages.css'

const RIESGOS = ['bajo', 'medio', 'alto']

export default function AdminPlagasEditar() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [filtros, setFiltros] = useState({ nombre: '', estado: '', cultivo_id: '' })
  const [plagas, setPlagas] = useState([])
  const [especies, setEspecies] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [form, setForm] = useState({
    nombre_comun: '',
    nombre_cientifico: '',
    descripcion: '',
    nivel_riesgo: 'medio',
    cultivo_ids: [],
  })

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
    if (code === 'NOMBRE_CIENTIFICO_BLOQUEADO') return 'E3: No se puede modificar el nombre científico por inspecciones asociadas.'
    if (code === 'DESACTIVACION_NO_PERMITIDA') return 'E4: Hay inspecciones en curso usando esta plaga. Espera a que finalicen.'
    if (code === 'ELIMINACION_NO_PERMITIDA') return 'E5: Tiene inspecciones históricas asociadas. Desactiva la plaga en lugar de eliminarla.'
    if (code === 'CAMPOS_OBLIGATORIOS') return 'E6: Completa los campos obligatorios resaltados.'

    return message || fallback
  }

  const validateEdit = () => {
    const errs = {
      edit_nombre_comun: !form.nombre_comun.trim(),
      edit_nombre_cientifico: !form.nombre_cientifico.trim(),
      edit_cultivo_ids: form.cultivo_ids.length === 0,
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  const especieNombre = (id) => {
    const row = especies.find((e) => Number(e.id) === Number(id))
    return row?.nombre || `Especie #${id}`
  }

  const loadDetalle = async (id) => {
    try {
      const res = await plagasAPI.getById(id)
      const d = res.data
      setDetalle(d)
      setForm({
        nombre_comun: d.nombre_comun || '',
        nombre_cientifico: d.nombre_cientifico || '',
        descripcion: d.descripcion || '',
        nivel_riesgo: d.nivel_riesgo || 'medio',
        cultivo_ids: Array.isArray(d.cultivo_ids) ? d.cultivo_ids : [],
      })
    } catch {
      setDetalle(null)
    }
  }

  const loadPlagas = async (keepSelection = true) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filtros.nombre.trim()) params.nombre = filtros.nombre.trim()
      if (filtros.estado) params.estado = filtros.estado
      if (filtros.cultivo_id) params.cultivo_id = filtros.cultivo_id

      const res = await plagasAPI.getAll(params)
      const lista = res.data || []
      setPlagas(lista)

      if (keepSelection && selectedId && lista.some((p) => p.id === selectedId)) {
        await loadDetalle(selectedId)
      } else if (lista.length > 0) {
        setSelectedId(lista[0].id)
        await loadDetalle(lista[0].id)
      } else {
        setSelectedId(null)
        setDetalle(null)
      }
    } catch {
      setError('No fue posible cargar el catálogo de plagas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const eRes = await plagasAPI.getEspecies()
        setEspecies(eRes.data || [])
      } catch {
        setEspecies([])
      }
      await loadPlagas(false)
    }
    init()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadPlagas(false), 250)
    return () => clearTimeout(t)
  }, [filtros])

  const guardarCambios = async () => {
    if (!detalle) return
    if (!validateEdit()) {
      showToast('E6: Completa los campos obligatorios y selecciona al menos un cultivo asociado.')
      return
    }

    setSaving(true)
    try {
      await plagasAPI.update(detalle.id, {
        nombre_comun: form.nombre_comun,
        nombre_cientifico: form.nombre_cientifico,
        descripcion: form.descripcion,
        nivel_riesgo: form.nivel_riesgo,
        cultivo_ids: form.cultivo_ids,
      })
      setFieldErrors({})
      showToast('Plaga actualizada correctamente')
      await loadPlagas(true)
    } catch (e) {
      showToast(mapBackendError(e, 'No se pudo guardar la plaga'))
      if (e?.response?.data?.code === 'NOMBRE_COMUN_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, edit_nombre_comun: true }))
      }
      if (e?.response?.data?.code === 'NOMBRE_CIENTIFICO_DUPLICADO' || e?.response?.data?.code === 'NOMBRE_CIENTIFICO_BLOQUEADO') {
        setFieldErrors((prev) => ({ ...prev, edit_nombre_cientifico: true }))
      }
      if (e?.response?.data?.code === 'SIN_CULTIVOS_ASOCIADOS' || e?.response?.data?.code === 'CULTIVO_INVALIDO') {
        setFieldErrors((prev) => ({ ...prev, edit_cultivo_ids: true }))
      }
    } finally {
      setSaving(false)
    }
  }

  const cambiarEstado = async () => {
    if (!detalle) return
    const nuevoEstado = detalle.estado === 'activo' ? 'inactivo' : 'activo'
    setSaving(true)
    try {
      await plagasAPI.changeEstado(detalle.id, { estado: nuevoEstado })
      showToast(`Plaga ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'} correctamente`)
      await loadPlagas(true)
    } catch (e) {
      showToast(mapBackendError(e, 'No se pudo actualizar el estado'))
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async () => {
    if (!detalle) return
    const ok = window.confirm(`¿Confirma eliminar la plaga ${detalle.nombre_comun}? Esta acción es irreversible.`)
    if (!ok) return

    setSaving(true)
    try {
      await plagasAPI.delete(detalle.id)
      showToast('Plaga eliminada correctamente')
      await loadPlagas(false)
    } catch (e) {
      showToast(mapBackendError(e, 'No se pudo eliminar la plaga'))
    } finally {
      setSaving(false)
    }
  }

  const especiesActivas = useMemo(() => especies, [especies])
  const cultivosAsociadosDetalle = useMemo(() => detalle?.cultivos_asociados || [], [detalle])
  const cultivosDisponibles = useMemo(() => (
    especiesActivas.filter((cultivo) => !form.cultivo_ids.includes(cultivo.id))
  ), [especiesActivas, form.cultivo_ids])

  return (
    <section className="mock-admin-page">
      {/* Mensajes Globales */}
      {toast && <div className="alert-toast-edit">{toast}</div>}
      {error && <div className="alert-error-edit">{error}</div>}

      {/* Cabecera Pro */}
      <header className="mock-header-flex-edit">
        <div>
          <h2>Editor de Catálogo</h2>
          <p>Modifica, suspende o da de baja registros fitosanitarios del sistema central.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary-pro">Volver</button>
      </header>

      {/* Barra de Filtros Avanzada */}
      <div className="toolbar-edit-pro">
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filtros.nombre}
          onChange={(e) => setFiltros((f) => ({ ...f, nombre: e.target.value }))}
          className="filter-input"
        />
        <select 
          value={filtros.estado} 
          onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
          className="filter-select"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select 
          value={filtros.cultivo_id} 
          onChange={(e) => setFiltros((f) => ({ ...f, cultivo_id: e.target.value }))}
          className="filter-select"
        >
          <option value="">Todos los cultivos</option>
          {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      {/* Panel de Dos Columnas (Split View) */}
      <div className="split-layout-pro">
        
        {/* Columna Izquierda: Listado */}
        <div className="split-list-panel">
          <table className="pro-clean-table">
            <thead>
              <tr>
                <th>Plaga Seleccionable</th>
                <th style={{ textAlign: 'right' }}>Riesgo / Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="table-status-text">Cargando catálogo...</td></tr>
              ) : plagas.length === 0 ? (
                <tr><td colSpan={2} className="table-status-text">No hay plagas para los filtros.</td></tr>
              ) : plagas.map((p) => {
                const isSelected = selectedId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`selectable-row ${isSelected ? 'active-selected' : ''}`}
                    onClick={() => { setSelectedId(p.id); loadDetalle(p.id) }}
                  >
                    <td>
                      <div className="row-title-block">
                        <strong>{p.nombre_comun}</strong>
                        <span className="row-subtext">
                          {p.nombre_cientifico} • <span className="crop-highlight">{p.cultivos_asociados_texto || especieNombre(p.especie_id)}</span>
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-badges-block">
                        <span className={`mini-badge-risk r-${p.nivel_riesgo}`}>{p.nivel_riesgo}</span>
                        <span className={`mini-badge-status s-${p.estado}`}>{p.estado}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Columna Derecha: Formulario Detallado */}
        <div className="split-form-panel">
          {!detalle ? (
            <div className="empty-form-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <p>Selecciona una plaga del listado izquierdo para abrir sus propiedades de edición.</p>
            </div>
          ) : (
            <div className="form-content-animated">
              <div className="panel-subtitle-wrapper">
                <h3>Edición de Ficha Fitosanitaria</h3>
                <span className="id-tag">ID: #{detalle.id}</span>
              </div>

              {/* Fichas de Resumen del Backend */}
              <div className="dashboard-micro-cards">
                <div className="micro-card">
                  <span className="card-lbl">Estado en DB</span>
                  <span className={`card-val status-${detalle.estado}`}>{detalle.estado.toUpperCase()}</span>
                </div>
                <div className="micro-card">
                  <span className="card-lbl">Nivel de Riesgo</span>
                  <span className={`card-val risk-${detalle.nivel_riesgo}`}>{detalle.nivel_riesgo.toUpperCase()}</span>
                </div>
                <div className="micro-card full-row-card">
                  <span className="card-lbl">Relación de cultivos actual</span>
                  <span className="card-val-text">
                    {cultivosAsociadosDetalle.length > 0
                      ? cultivosAsociadosDetalle.map((cultivo) => cultivo.nombre).join(', ')
                      : 'Sin cultivos vinculados actualmente.'}
                  </span>
                </div>
              </div>

              {/* Formulario Inputs */}
              <div className="form-fields-stack">
                <div className="field-group">
                  <label>Nombre General / Común *</label>
                  <input 
                    type="text"
                    className={`pro-input-field ${fieldErrors.edit_nombre_comun ? 'i-error' : ''}`} 
                    value={form.nombre_comun} 
                    onChange={(e) => setForm((f) => ({ ...f, nombre_comun: e.target.value }))} 
                  />
                </div>

                <div className="field-group">
                  <label>Nombre Científico Taxonómico *</label>
                  <input
                    type="text"
                    className={`pro-input-field ${fieldErrors.edit_nombre_cientifico ? 'i-error' : ''} ${!detalle.puede_editar_nombre_cientifico ? 'field-disabled' : ''}`}
                    disabled={!detalle.puede_editar_nombre_cientifico}
                    value={form.nombre_cientifico}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
                  />
                  {!detalle.puede_editar_nombre_cientifico && (
                    <div className="warning-callout">
                      ⚠️ Código E3: Bloqueado estructuralmente. Existen inspecciones históricas asociadas a este taxón.
                    </div>
                  )}
                </div>

                <div className="field-group">
                  <label>Nivel de Alerta / Riesgo</label>
                  <select 
                    className="pro-input-field" 
                    value={form.nivel_riesgo} 
                    onChange={(e) => setForm((f) => ({ ...f, nivel_riesgo: e.target.value }))}
                  >
                    {RIESGOS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>

                <div className="field-group">
                  <label>Actualizar Vínculo de Cultivos *</label>
                  <div className={`pro-checkbox-scrollbox ${fieldErrors.edit_cultivo_ids ? 'b-error' : ''}`}>
                    {especiesActivas.map((e) => {
                      const checked = form.cultivo_ids.includes(e.id)
                      return (
                        <label key={e.id} className={`scrollbox-item ${checked ? 'item-checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setForm((current) => ({
                              ...current,
                              cultivo_ids: event.target.checked
                                ? [...current.cultivo_ids, e.id]
                                : current.cultivo_ids.filter((id) => id !== e.id),
                            }))}
                          />
                          <span>{e.nombre}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen de cambios en vivo */}
                <div className="live-badges-summary">
                  <div className="summary-section">
                    <span className="summary-title">Agregados en edición:</span>
                    <p className="summary-body">
                      {form.cultivo_ids.length > 0
                        ? form.cultivo_ids.map((id) => especieNombre(id)).join(', ')
                        : 'Ninguno seleccionado.'}
                    </p>
                  </div>
                  <div className="summary-section">
                    <span className="summary-title">Restantes en catálogo:</span>
                    <p className="summary-body text-muted">
                      {cultivosDisponibles.length > 0
                        ? cultivosDisponibles.map((cultivo) => cultivo.nombre).join(', ')
                        : 'Todos los cultivos del catálogo han sido asociados.'}
                    </p>
                  </div>
                </div>

                <div className="field-group">
                  <label>Notas de Descripción / Síntomas</label>
                  <textarea
                    rows={3}
                    className="pro-input-field scrollable-textarea"
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              {/* Botonera Inferior Pro */}
              <div className="form-action-footer-edit">
                <button disabled={saving} onClick={guardarCambios} className="btn-save-pro">
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button disabled={saving} onClick={cambiarEstado} className="btn-toggle-pro">
                  {detalle.estado === 'activo' ? '🔴 Desactivar Plaga' : '🟢 Activar Plaga'}
                </button>
                <button disabled={saving} onClick={eliminar} className="btn-danger-pro">
                  Eliminar permanentemente
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Estilos encapsulados de Alta Fidelidad */}
      <style>{`
        .alert-toast-edit { background: #ecfeff; border: 1px solid #a5f3fc; color: #155e75; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; font-size: 0.85rem; }
        .alert-error-edit { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; font-size: 0.85rem; }
        
        .mock-header-flex-edit { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
        .mock-header-flex-edit h2 { margin: 0; font-size: 1.5rem; color: #0f172a; font-weight: 700; }
        .mock-header-flex-edit p { margin: 4px 0 0; font-size: 0.875rem; color: #64748b; }

        .toolbar-edit-pro { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .filter-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
        .filter-select { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; background: #fff; font-family: inherit; cursor: pointer; }
        
        .split-layout-pro { display: grid; grid-template-columns: 42% 1fr; gap: 20px; align-items: start; }
        
        /* Panel Izquierdo */
        .split-list-panel { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02); max-height: 700px; overflow-y: auto; }
        .pro-clean-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
        .pro-clean-table th { background: #f8fafc; padding: 12px 16px; color: #475569; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
        .selectable-row { border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; }
        .selectable-row:hover { background: #f8fafc; }
        .active-selected { background: #eff6ff !important; border-left: 4px solid #2563eb; }
        .row-title-block { display: flex; flex-direction: column; gap: 3px; padding: 12px 16px; }
        .row-title-block strong { color: #0f172a; font-size: 0.875rem; }
        .row-subtext { color: #64748b; font-size: 0.75rem; }
        .crop-highlight { color: #2563eb; font-weight: 500; }
        .row-badges-block { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; padding-right: 16px; }
        
        .mini-badge-risk { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
        .mini-badge-risk.r-alto { background: #fee2e2; color: #991b1b; }
        .mini-badge-risk.r-medio { background: #fef3c7; color: #92400e; }
        .mini-badge-risk.r-bajo { background: #dcfce7; color: #166534; }
        
        .mini-badge-status { font-size: 0.7rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: capitalize; }
        .mini-badge-status.s-activo { background: #e0f2fe; color: #0369a1; }
        .mini-badge-status.s-inactivo { background: #f1f5f9; color: #475569; }
        .table-status-text { padding: 32px; text-align: center; color: #64748b; font-style: italic; }

        /* Panel Derecho */
        .split-form-panel { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 24px; min-height: 450px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .empty-form-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; text-align: center; color: #94a3b8; gap: 12px; padding: 0 32px; }
        .empty-form-placeholder p { font-size: 0.9rem; color: #64748b; }
        
        .panel-subtitle-wrapper { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
        .panel-subtitle-wrapper h3 { margin: 0; font-size: 1.05rem; color: #0f172a; font-weight: 700; }
        .id-tag { background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
        
        .dashboard-micro-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .micro-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 4px; }
        .full-row-card { grid-column: span 2; }
        .card-lbl { font-size: 0.7rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .card-val { font-size: 0.85rem; font-weight: 700; }
        .card-val.status-activo { color: #0284c7; }
        .card-val.status-inactivo { color: #64748b; }
        .card-val.risk-alto { color: #dc2626; }
        .card-val.risk-medio { color: #d97706; }
        .card-val.risk-bajo { color: #16a34a; }
        .card-val-text { font-size: 0.85rem; color: #1e293b; font-weight: 500; }

        .form-fields-stack { display: flex; flex-direction: column; gap: 16px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label { font-size: 0.8rem; font-weight: 600; color: #334155; }
        .pro-input-field { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; color: #0f172a; font-family: inherit; }
        .pro-input-field:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .field-disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
        .warning-callout { background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; line-height: 1.4; }
        
        .i-error { border-color: #ef4444; background: #fef2f2; }
        .b-error { border: 1px solid #ef4444 !important; }

        .pro-checkbox-scrollbox { border: 1px solid #cbd5e1; border-radius: 8px; max-height: 150px; overflow-y: auto; background: #f8fafc; padding: 8px; display: grid; gap: 4px; }
        .scrollbox-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; font-size: 0.85rem; color: #334155; cursor: pointer; transition: background 0.1s; }
        .scrollbox-item:hover { background: #e2e8f0; }
        .item-checked { background: #e0f2fe; color: #0369a1; font-weight: 500; }
        .scrollbox-item input { width: 15px; height: 15px; cursor: pointer; }
        
        .live-badges-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px dashed #cbd5e1; }
        .summary-section { display: flex; flex-direction: column; gap: 2px; }
        .summary-title { font-size: 0.72rem; font-weight: 600; color: #475569; }
        .summary-body { margin: 0; font-size: 0.78rem; color: #0f172a; line-height: 1.3; font-weight: 500; }
        .text-muted { color: #64748b; }
        .scrollable-textarea { resize: vertical; }

        .form-action-footer-edit { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-save-pro { background: #2563eb; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; flex: 1; min-width: 120px; transition: background 0.2s; font-family: inherit; }
        .btn-save-pro:hover { background: #1d4ed8; }
        
        .btn-toggle-pro { background: #fff; border: 1px solid #cbd5e1; color: #334155; padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; font-family: inherit; }
        .btn-toggle-pro:hover { background: #f8fafc; border-color: #94a3b8; }
        
        .btn-danger-pro { background: #fff1f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 14px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .btn-danger-pro:hover { background: #fee2e2; }

        @media (max-width: 900px) {
          .split-layout-pro { grid-template-columns: 1fr; }
          .toolbar-edit-pro { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
