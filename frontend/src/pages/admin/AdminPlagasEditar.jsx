import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plagasAPI } from '../../services/api'

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

  // Local state for crop filtering in the form
  const [cropSearch, setCropSearch] = useState('')

  const [fieldErrors, setFieldErrors] = useState({})

  // Pagination for left list
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

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
    if (code === 'NOMBRE_CIENTIFICO_BLOQUEADO') return 'E3: Bloqueado estructuralmente. Existen inspecciones históricas asociadas a este taxón.'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { loadPlagas(false); setCurrentPage(1); }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const msg = mapBackendError(e, 'No se pudo guardar la plaga')
      showToast(msg)
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

  const selectRow = (id) => {
    setSelectedId(id)
    loadDetalle(id)
    setFieldErrors({})
  }

  const handleToggleCrop = (cultivoId) => {
    setForm(prev => {
      const isSelected = prev.cultivo_ids.includes(cultivoId)
      const newIds = isSelected 
        ? prev.cultivo_ids.filter(id => id !== cultivoId)
        : [...prev.cultivo_ids, cultivoId]
      return { ...prev, cultivo_ids: newIds }
    })
  }

  const clearSelectedCrops = () => {
    setForm(prev => ({ ...prev, cultivo_ids: [] }))
  }

  const removeCrop = (cultivoId) => {
    setForm(prev => ({ ...prev, cultivo_ids: prev.cultivo_ids.filter(id => id !== cultivoId) }))
  }

  // Derived properties
  const filteredCrops = useMemo(() => {
    if (!cropSearch.trim()) return especies
    return especies.filter(e => e.nombre.toLowerCase().includes(cropSearch.toLowerCase()))
  }, [especies, cropSearch])

  const selectedCropsData = useMemo(() => {
    return form.cultivo_ids.map(id => especies.find(e => e.id === id)).filter(Boolean)
  }, [form.cultivo_ids, especies])

  // Pagination logic
  const totalPages = Math.ceil(plagas.length / itemsPerPage)
  const paginatedPlagas = plagas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const isE3Error = fieldErrors.edit_nombre_cientifico // Simplified check based on state

  return (
    <div className="new-admin-layout">
      <style>{`
        .new-admin-layout {
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 32px 40px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-title-area {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .header-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
        }
        .btn-cancel-top {
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        .btn-cancel-top:hover { background: #f1f5f9; }

        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .search-box {
          flex: 1;
          position: relative;
          max-width: 320px;
        }
        .search-box input {
          width: 100%;
          padding: 10px 36px 10px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #334155;
          background: white;
          box-sizing: border-box;
          outline: none;
        }
        .search-box input:focus {
          border-color: #045e54;
          box-shadow: 0 0 0 2px rgba(4, 94, 84, 0.1);
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .clear-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          cursor: pointer;
        }
        .toolbar select {
          padding: 10px 36px 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #334155;
          background: white;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
          cursor: pointer;
          min-width: 180px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 24px;
        }

        .list-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 700;
          color: #0f172a;
          font-size: 1rem;
        }
        .results-badge {
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 600;
        }
        .list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .list-item:hover { background-color: #f8fafc; }
        .list-item.selected {
          background-color: #f0fdf4;
          border-left: 3px solid #10b981;
          padding-left: 17px;
        }
        .item-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .item-icon {
          width: 40px;
          height: 40px;
          background: #f0fdf4;
          color: #045e54;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .item-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        .item-scientific {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }
        .item-badges {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .badge-risk {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .badge-risk.alto { background: #fef2f2; color: #dc2626; }
        .badge-risk.medio { background: #fffbeb; color: #d97706; }
        .badge-risk.bajo { background: #f0fdf4; color: #059669; }
        
        .badge-status {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .badge-status.activo { background: #ecfdf5; color: #059669; }
        .badge-status.inactivo { background: #f1f5f9; color: #64748b; }
        
        .item-arrow { color: #cbd5e1; margin-left: 16px; }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          font-size: 0.8rem;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          background: #fff;
        }
        .page-numbers {
          display: flex;
          gap: 4px;
        }
        .page-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .page-btn.active {
          background: #045e54;
          color: white;
          border-color: #045e54;
        }
        .page-btn:hover:not(.active) { background: #f1f5f9; }

        .form-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .form-header h3 {
          margin: 0;
          font-size: 1.15rem;
          color: #0f172a;
        }
        .form-id-badge {
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 600;
        }

        .info-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .info-card-title {
          font-size: 0.65rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .info-card-value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #0f172a;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .status-dot.activo { background: #10b981; }
        .status-dot.inactivo { background: #94a3b8; }
        .status-dot.alto { background: #ef4444; }
        .status-dot.medio { background: #f59e0b; }
        .status-dot.bajo { background: #10b981; }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .info-icon {
          color: #94a3b8;
          cursor: help;
        }
        .form-input {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #334155;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .form-input:focus {
          border-color: #045e54;
          box-shadow: 0 0 0 2px rgba(4, 94, 84, 0.1);
        }
        .form-input.error { border-color: #ef4444; }
        
        .alert-warning {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          margin-top: -8px;
        }
        .alert-warning p {
          margin: 0;
          font-size: 0.8rem;
          color: #92400e;
          font-weight: 500;
        }

        .crops-section {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          background: #f8fafc;
        }
        .crops-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          max-height: 140px;
          overflow-y: auto;
          margin-top: 12px;
          padding-right: 4px;
        }
        .crop-card {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .crop-card:hover { border-color: #94a3b8; }
        .crop-card.selected {
          background: #ecfdf5;
          border-color: #10b981;
        }
        .crop-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }
        .crop-card.selected .crop-checkbox {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        .crop-name {
          font-size: 0.8rem;
          color: #334155;
          font-weight: 500;
          flex: 1;
        }
        .crop-icon {
          color: #94a3b8;
        }
        .crop-card.selected .crop-icon {
          color: #045e54;
        }

        .selected-crops-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 8px 8px;
          margin-top: -1px;
        }
        .selected-count {
          font-size: 0.8rem;
          font-weight: 600;
          color: #045e54;
        }
        .chips-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
          margin: 0 16px;
        }
        .crop-chip {
          background: #ecfdf5;
          color: #059669;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .crop-chip-close {
          cursor: pointer;
          opacity: 0.7;
        }
        .crop-chip-close:hover { opacity: 1; }
        .btn-clear-all {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-clear-all:hover { color: #0f172a; }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        .btn-secondary {
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #334155;
          cursor: pointer;
        }
        .btn-secondary:hover { background: #f8fafc; }
        
        .btn-warning {
          padding: 10px 20px;
          border: none;
          background: #fffbeb;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #d97706;
          cursor: pointer;
        }
        .btn-warning:hover { background: #fef3c7; }
        
        .btn-danger {
          padding: 10px 20px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #dc2626;
          cursor: pointer;
        }
        .btn-danger:hover { background: #fee2e2; }

        .btn-save {
          padding: 10px 20px;
          border: none;
          background: #045e54;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-save:hover { background: #03423b; }
        .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .toast-msg {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #0f172a;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 0.875rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 50;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {toast && <div className="toast-msg">{toast}</div>}

      <div className="header-container">
        <div className="header-title-area">
          <h1 className="header-title">Editor de Catálogo Fitosanitario</h1>
          <p className="header-subtitle">Modifica, suspende o da de baja registros fitosanitarios del sistema central.</p>
        </div>
        <button className="btn-cancel-top" onClick={() => navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Volver
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Filtrar por nombre..."
            value={filtros.nombre}
            onChange={(e) => setFiltros((f) => ({ ...f, nombre: e.target.value }))}
          />
          {filtros.nombre && (
            <svg className="clear-icon" onClick={() => setFiltros(f => ({...f, nombre: ''}))} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          )}
        </div>
        <select 
          value={filtros.estado} 
          onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select 
          value={filtros.cultivo_id} 
          onChange={(e) => setFiltros((f) => ({ ...f, cultivo_id: e.target.value }))}
        >
          <option value="">Todos los cultivos</option>
          {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      <div className="main-grid">
        {/* Left Column: List */}
        <div className="list-container">
          <div className="list-header">
            <span>Plagas registradas</span>
            <span className="results-badge">{plagas.length} resultados</span>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando catálogo...</div>
          ) : paginatedPlagas.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No hay plagas para los filtros.</div>
          ) : (
            paginatedPlagas.map((p) => {
              const isSelected = selectedId === p.id;
              const cultivoName = p.cultivos_asociados_texto || (p.cultivos_asociados?.length ? p.cultivos_asociados.map(c=>c.nombre).join(', ') : 'Sin cultivos')
              return (
                <div 
                  key={p.id} 
                  className={`list-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectRow(p.id)}
                >
                  <div className="item-info">
                    <div className="item-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="item-name">{p.nombre_comun}</p>
                      <p className="item-scientific">{p.nombre_cientifico} • {cultivoName}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="item-badges">
                      <span className={`badge-risk ${p.nivel_riesgo}`}>{p.nivel_riesgo.toUpperCase()}</span>
                      <span className={`badge-status ${p.estado}`}>{p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</span>
                    </div>
                    <div className="item-arrow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {!loading && plagas.length > 0 && (
            <div className="pagination">
              <button 
                className="page-btn" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <div className="page-numbers">
                {Array.from({ length: Math.min(totalPages, 4) }).map((_, i) => (
                  <button 
                    key={i} 
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                {totalPages > 4 && <span style={{ margin: '0 4px', alignSelf: 'center' }}>...</span>}
                {totalPages > 4 && (
                  <button 
                    className={`page-btn ${currentPage === totalPages ? 'active' : ''}`}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                )}
              </div>
              <button 
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <span style={{ marginLeft: '12px' }}>Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, plagas.length)} de {plagas.length} plagas</span>
            </div>
          )}
        </div>

        {/* Right Column: Form */}
        <div className="form-panel">
          {!detalle ? (
             <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
               <svg style={{ marginBottom: '16px', color: '#cbd5e1' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
               <p>Selecciona una plaga del listado para editar sus propiedades.</p>
             </div>
          ) : (
            <>
              <div className="form-header">
                <h3>Edición de Ficha Fitosanitaria</h3>
                <span className="form-id-badge">ID: #{detalle.id}</span>
              </div>

              <div className="info-cards">
                <div className="info-card">
                  <span className="info-card-title">ESTADO EN BD</span>
                  <div className="info-card-value">
                    <div className={`status-dot ${detalle.estado}`}></div>
                    {detalle.estado.toUpperCase()}
                  </div>
                </div>
                <div className="info-card">
                  <span className="info-card-title">NIVEL DE RIESGO</span>
                  <div className="info-card-value">
                    <div className={`status-dot ${detalle.nivel_riesgo}`}></div>
                    {detalle.nivel_riesgo.toUpperCase()}
                  </div>
                </div>
                <div className="info-card">
                  <span className="info-card-title">RELACIÓN DE CULTIVOS ACTUAL</span>
                  <div className="info-card-value" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#045e54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detalle.cultivos_asociados?.map(c => c.nombre).join(', ') || 'Ninguno'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Nombre común / General *
                    <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </label>
                  <input 
                    type="text" 
                    className={`form-input ${fieldErrors.edit_nombre_comun ? 'error' : ''}`}
                    value={form.nombre_comun}
                    onChange={(e) => setForm(f => ({ ...f, nombre_comun: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Nombre científico taxonómico *
                    <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  </label>
                  <input 
                    type="text" 
                    className={`form-input ${fieldErrors.edit_nombre_cientifico ? 'error' : ''}`}
                    value={form.nombre_cientifico}
                    onChange={(e) => setForm(f => ({ ...f, nombre_cientifico: e.target.value }))}
                  />
                </div>
              </div>

              {isE3Error && (
                <div className="alert-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <p>Código E3: Bloqueado estructuralmente. Existen inspecciones históricas asociadas a este taxón.</p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Nivel de alerta / Riesgo *
                  <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </label>
                <div style={{ position: 'relative' }}>
                  <div className={`status-dot ${form.nivel_riesgo}`} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}></div>
                  <select 
                    className="form-input" 
                    style={{ width: '100%', paddingLeft: '34px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '16px' }}
                    value={form.nivel_riesgo}
                    onChange={(e) => setForm(f => ({ ...f, nivel_riesgo: e.target.value }))}
                  >
                    <option value="bajo">BAJO</option>
                    <option value="medio">MEDIO</option>
                    <option value="alto">ALTO</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label">
                  Actualizar vínculo de cultivos *
                  <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </label>
                <div className={`crops-section ${fieldErrors.edit_cultivo_ids ? 'error' : ''}`} style={fieldErrors.edit_cultivo_ids ? { borderColor: '#ef4444' } : {}}>
                  <div className="search-box" style={{ maxWidth: '100%' }}>
                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      type="text" 
                      placeholder="Buscar cultivo..." 
                      style={{ padding: '8px 16px 8px 36px', fontSize: '0.8rem' }}
                      value={cropSearch}
                      onChange={(e) => setCropSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="crops-grid">
                    {filteredCrops.map(crop => {
                      const isSelected = form.cultivo_ids.includes(crop.id)
                      return (
                        <div key={crop.id} className={`crop-card ${isSelected ? 'selected' : ''}`} onClick={() => handleToggleCrop(crop.id)}>
                          <svg className="crop-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
                          </svg>
                          <span className="crop-name">{crop.nombre}</span>
                          <div className="crop-checkbox">
                            {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="selected-crops-bar">
                  <span className="selected-count">Cultivos seleccionados ({form.cultivo_ids.length})</span>
                  <div className="chips-container">
                    {selectedCropsData.map(c => (
                      <div key={c.id} className="crop-chip">
                        {c.nombre}
                        <svg className="crop-chip-close" onClick={() => removeCrop(c.id)} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </div>
                    ))}
                  </div>
                  <button className="btn-clear-all" onClick={clearSelectedCrops}>
                    Limpiar todo
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { loadDetalle(selectedId); setFieldErrors({}) }}>
                  Cancelar
                </button>
                <button type="button" className="btn-warning" onClick={cambiarEstado} disabled={saving}>
                  {detalle.estado === 'activo' ? 'Inactivar' : 'Activar'}
                </button>
                <button type="button" className="btn-danger" onClick={eliminar} disabled={saving}>
                  Eliminar
                </button>
                <button type="button" className="btn-save" onClick={guardarCambios} disabled={saving}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Guardar cambios
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
