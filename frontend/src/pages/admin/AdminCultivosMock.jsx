import { useEffect, useMemo, useState } from 'react'
import { especiesAPI } from '../../services/api'

const emptyCreate = {
  nombre: '',
  nombre_cientifico: '',
  descripcion: '',
  estado: 'activo'
}

export default function AdminCultivosMock() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [filtros, setFiltros] = useState({ q: '', estado: '' })
  const [especies, setEspecies] = useState([])
  
  // UI State
  const [isCreating, setIsCreating] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const [form, setForm] = useState({ nombre: '', nombre_cientifico: '', descripcion: '', estado: 'activo' })
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [fieldErrors, setFieldErrors] = useState({})

  // Pagination (Mocked frontend pagination for the UI)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const mapBackendError = (err, fallback) => {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message
    if (code === 'ESPECIE_DUPLICADA') return 'Ya existe una especie con ese nombre o nombre científico.'
    if (code === 'ESPECIE_CON_CULTIVOS') return 'No se puede eliminar: la especie tiene cultivos asociados.'
    if (code === 'CAMPOS_OBLIGATORIOS') return 'Completa los campos obligatorios para guardar la especie.'
    return message || fallback
  }

  const validateCreate = () => {
    const errs = {
      create_nombre: !createForm.nombre.trim(),
      create_nombre_cientifico: !createForm.nombre_cientifico.trim(),
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  const validateEdit = () => {
    const errs = {
      edit_nombre: !form.nombre.trim(),
      edit_nombre_cientifico: !form.nombre_cientifico.trim(),
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  const loadDetalle = async (id) => {
    const item = especies.find((row) => row.id === id)
    if (!item) {
      setDetalle(null)
      return
    }
    setDetalle(item)
    setForm({
      nombre: item.nombre || '',
      nombre_cientifico: item.nombre_cientifico || '',
      descripcion: item.descripcion || '',
      estado: item.estado || 'activo'
    })
  }

  const loadEspecies = async (keepSelection = true) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filtros.q.trim()) params.q = filtros.q.trim()
      if (filtros.estado) params.estado = filtros.estado
      const response = await especiesAPI.getAdmin(params)
      const rows = response.data || []
      setEspecies(rows)

      if (keepSelection && selectedId && rows.some((r) => r.id === selectedId)) {
        const selected = rows.find((r) => r.id === selectedId)
        setDetalle(selected)
        setForm({
          nombre: selected.nombre || '',
          nombre_cientifico: selected.nombre_cientifico || '',
          descripcion: selected.descripcion || '',
          estado: selected.estado || 'activo'
        })
      } else if (!isCreating && rows.length > 0) {
        // Option to select first row
      } else if (rows.length === 0) {
        setSelectedId(null)
        setDetalle(null)
      }
    } catch {
      setError('No fue posible cargar el catálogo de especies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEspecies(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadEspecies(false), 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const handleCreate = async () => {
    if (!validateCreate()) {
      showToast('Completa nombre y nombre científico para crear la especie.')
      return
    }

    setSaving(true)
    try {
      // Create new specie
      await especiesAPI.create(createForm)
      showToast('Especie creada correctamente')
      setCreateForm(emptyCreate)
      setFieldErrors({})
      await loadEspecies(false)
    } catch (err) {
      showToast(mapBackendError(err, 'No fue posible crear la especie'))
      if (err?.response?.data?.code === 'ESPECIE_DUPLICADA') {
        setFieldErrors((prev) => ({ ...prev, create_nombre: true, create_nombre_cientifico: true }))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!detalle) return
    if (!validateEdit()) {
      showToast('Completa nombre y nombre científico para guardar cambios.')
      return
    }

    setSaving(true)
    try {
      await especiesAPI.update(detalle.id, {
        nombre: form.nombre,
        nombre_cientifico: form.nombre_cientifico,
        descripcion: form.descripcion
      })
      
      if (form.estado !== detalle.estado) {
         await especiesAPI.changeEstado(detalle.id, { estado: form.estado })
      }
      
      setFieldErrors({})
      showToast('Especie actualizada correctamente')
      await loadEspecies(true)
    } catch (err) {
      showToast(mapBackendError(err, 'No se pudo actualizar la especie'))
      if (err?.response?.data?.code === 'ESPECIE_DUPLICADA') {
        setFieldErrors((prev) => ({ ...prev, edit_nombre: true, edit_nombre_cientifico: true }))
      }
    } finally {
      setSaving(false)
    }
  }

  const selectRow = (id) => {
    setSelectedId(id)
    setIsCreating(false)
    loadDetalle(id)
    setFieldErrors({})
  }

  const startCreate = () => {
    setIsCreating(true)
    setSelectedId(null)
    setDetalle(null)
    setCreateForm(emptyCreate)
    setFieldErrors({})
  }

  const clearForm = () => {
    if (isCreating) {
      setCreateForm(emptyCreate)
      setFieldErrors({})
    } else {
      loadDetalle(selectedId)
      setFieldErrors({})
    }
  }

  const totalActivas = useMemo(() => especies.filter((e) => e.estado === 'activo').length, [especies])
  
  // Pagination
  const totalPages = Math.ceil(especies.length / itemsPerPage)
  const paginatedEspecies = especies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
          align-items: center;
          gap: 16px;
        }
        .header-icon-box {
          width: 56px;
          height: 56px;
          background-color: #045e54;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(4, 94, 84, 0.2);
        }
        .header-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }
        .header-subtitle {
          margin: 4px 0 0 0;
          font-size: 0.875rem;
          color: #64748b;
        }
        .btn-new {
          background-color: #045e54;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-new:hover { background-color: #03423b; }
        
        .stats-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 180px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon.total { background: #eff6ff; color: #3b82f6; }
        .stat-icon.active { background: #f0fdf4; color: #10b981; }
        .stat-icon.inactive { background: #f1f5f9; color: #64748b; }
        .stat-info p { margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .stat-info h4 { margin: 2px 0 0 0; font-size: 1.25rem; color: #0f172a; font-weight: 700; }
        
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 24px;
        }
        
        .list-panel { background: transparent; }
        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .search-box {
          flex: 1;
          position: relative;
        }
        .search-box input {
          width: 100%;
          padding: 10px 16px 10px 40px;
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
        }
        
        .list-container {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .list-header {
          display: grid;
          grid-template-columns: 1fr 100px 40px;
          padding: 12px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 0.75rem;
          font-weight: 700;
          color: #0f172a;
        }
        .list-item {
          display: grid;
          grid-template-columns: 1fr 100px 40px;
          align-items: center;
          padding: 12px 20px;
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
          gap: 12px;
        }
        .item-icon {
          width: 32px;
          height: 32px;
          background: #ecfdf5;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .item-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: #1e293b;
          margin: 0 0 2px 0;
        }
        .item-scientific {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }
        .badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .badge.active { background: #ecfdf5; color: #059669; }
        .badge.inactive { background: #f1f5f9; color: #64748b; }
        .item-arrow {
          color: #cbd5e1;
          justify-self: end;
        }
        
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          font-size: 0.75rem;
          color: #64748b;
        }
        .page-numbers {
          display: flex;
          gap: 4px;
        }
        .page-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          cursor: pointer;
          font-size: 0.75rem;
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
          height: fit-content;
        }
        .form-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .form-header-icon {
          width: 28px;
          height: 28px;
          background: #f1f5f9;
          color: #64748b;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .form-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
        .char-count {
          text-align: right;
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 4px;
        }
        
        .status-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 8px;
        }
        .status-card {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          transition: all 0.2s;
        }
        .status-card.selected.activo {
          border-color: #045e54;
          background: #f0fdf4;
        }
        .status-card.selected.inactivo {
          border-color: #64748b;
          background: #f8fafc;
        }
        .radio-circle {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .status-card.selected .radio-circle { border-color: #045e54; }
        .status-card.selected.inactivo .radio-circle { border-color: #64748b; }
        .radio-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #045e54;
          opacity: 0;
        }
        .status-card.selected.inactivo .radio-dot { background: #64748b; }
        .status-card.selected .radio-dot { opacity: 1; }
        .status-text h4 {
          margin: 0 0 4px 0;
          font-size: 0.875rem;
          color: #1e293b;
        }
        .status-text p {
          margin: 0;
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.4;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #334155;
          cursor: pointer;
        }
        .btn-cancel:hover { background: #f8fafc; }
        
        .btn-clear {
          padding: 10px 20px;
          border: none;
          background: #ecfdf5;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #045e54;
          cursor: pointer;
        }
        .btn-clear:hover { background: #d1fae5; }
        
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
          <div className="header-icon-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
              <path d="M12 22V6"></path>
              <path d="M12 14c-2.76 0-5-2.24-5-5"></path>
            </svg>
          </div>
          <div>
            <h1 className="header-title">Catálogo de Cultivos (Especies)</h1>
            <p className="header-subtitle">Gestiona el catálogo maestro de especies para usar en los cultivos de cada lote.</p>
          </div>
        </div>

      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <p>Total</p>
            <h4>{especies.length}</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <p>Activas</p>
            <h4>{totalActivas}</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon inactive">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="stat-info">
            <p>Inactivas</p>
            <h4>{especies.length - totalActivas}</h4>
          </div>
        </div>
      </div>

      <div className="main-grid">
        {/* Left Column: List */}
        <div className="list-panel">
          <div className="toolbar">
            <div className="search-box">
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Buscar por nombre o nombre científico..." 
                value={filtros.q}
                onChange={(e) => { setFiltros(prev => ({ ...prev, q: e.target.value })); setCurrentPage(1); }}
              />
            </div>
            <select
              value={filtros.estado}
              onChange={(e) => { setFiltros(prev => ({ ...prev, estado: e.target.value })); setCurrentPage(1); }}
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activas</option>
              <option value="inactivo">Inactivas</option>
            </select>
          </div>

          <div className="list-container">
            <div className="list-header">
              <div>Nombre</div>
              <div>Estado</div>
              <div></div>
            </div>
            
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
            ) : paginatedEspecies.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No se encontraron especies.</div>
            ) : (
              paginatedEspecies.map(item => (
                <div 
                  key={item.id} 
                  className={`list-item ${selectedId === item.id && !isCreating ? 'selected' : ''}`}
                  onClick={() => selectRow(item.id)}
                >
                  <div className="item-info">
                    <div className="item-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="item-name">{item.nombre}</p>
                      <p className="item-scientific">{item.nombre_cientifico}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${item.estado === 'activo' ? 'active' : 'inactive'}`}>
                      {item.estado === 'activo' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="item-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              ))
            )}

            {!loading && paginatedEspecies.length > 0 && (
              <div className="pagination">
                <div className="page-numbers">
                  <button 
                    className="page-btn" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                    <button 
                      key={i} 
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 5 && <span style={{ margin: '0 4px', alignSelf: 'flex-end' }}>...</span>}
                  {totalPages > 5 && (
                    <button 
                      className={`page-btn ${currentPage === totalPages ? 'active' : ''}`}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  )}
                  <button 
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
                <div>Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, especies.length)} de {especies.length} especies</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="form-panel">
          <div className="form-header">
            <div className="form-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
              </svg>
            </div>
            <h3>{isCreating ? 'Registrar nueva especie' : 'Detalle de especie'}</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Nombre común *
                <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </label>
              <input 
                type="text" 
                className={`form-input ${fieldErrors[isCreating ? 'create_nombre' : 'edit_nombre'] ? 'error' : ''}`}
                placeholder="Ej. Acelga"
                value={isCreating ? createForm.nombre : form.nombre}
                onChange={(e) => isCreating 
                  ? setCreateForm(prev => ({ ...prev, nombre: e.target.value }))
                  : setForm(prev => ({ ...prev, nombre: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Nombre científico *
                <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </label>
              <input 
                type="text" 
                className={`form-input ${fieldErrors[isCreating ? 'create_nombre_cientifico' : 'edit_nombre_cientifico'] ? 'error' : ''}`}
                placeholder="Ej. Beta vulgaris var. cicla"
                value={isCreating ? createForm.nombre_cientifico : form.nombre_cientifico}
                onChange={(e) => isCreating 
                  ? setCreateForm(prev => ({ ...prev, nombre_cientifico: e.target.value }))
                  : setForm(prev => ({ ...prev, nombre_cientifico: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">
              Descripción
              <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </label>
            <textarea 
              className="form-input" 
              rows="4" 
              style={{ resize: 'vertical' }}
              placeholder="Descripción general de la especie, características principales, usos, etc."
              value={isCreating ? createForm.descripcion : form.descripcion}
              onChange={(e) => isCreating 
                ? setCreateForm(prev => ({ ...prev, descripcion: e.target.value }))
                : setForm(prev => ({ ...prev, descripcion: e.target.value }))
              }
            />
            <div className="char-count">{(isCreating ? createForm.descripcion : form.descripcion).length} / 500 caracteres</div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Estado de la especie
              <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </label>
            <div className="status-selector">
              <div 
                className={`status-card activo ${(isCreating ? createForm.estado : form.estado) === 'activo' ? 'selected' : ''}`}
                onClick={() => isCreating ? setCreateForm(prev => ({ ...prev, estado: 'activo' })) : setForm(prev => ({ ...prev, estado: 'activo' }))}
              >
                <div className="item-icon" style={{ background: (isCreating ? createForm.estado : form.estado) === 'activo' ? 'transparent' : '#f1f5f9', color: (isCreating ? createForm.estado : form.estado) === 'activo' ? '#045e54' : '#94a3b8' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
                  </svg>
                </div>
                <div className="status-text">
                  <h4>Activa</h4>
                  <p>La especie está disponible para su uso en el sistema.</p>
                </div>
                <div className="radio-circle"><div className="radio-dot"></div></div>
              </div>
              
              <div 
                className={`status-card inactivo ${(isCreating ? createForm.estado : form.estado) === 'inactivo' ? 'selected' : ''}`}
                onClick={() => isCreating ? setCreateForm(prev => ({ ...prev, estado: 'inactivo' })) : setForm(prev => ({ ...prev, estado: 'inactivo' }))}
              >
                <div className="item-icon" style={{ background: '#f1f5f9', color: '#64748b' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c4.97-4.97 4.97-11.03 0-16-4.97 4.97-4.97 11.03 0 16z"></path>
                    <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5"></line>
                  </svg>
                </div>
                <div className="status-text">
                  <h4 style={{ color: '#64748b' }}>Inactiva</h4>
                  <p>La especie no estará disponible en el sistema.</p>
                </div>
                <div className="radio-circle"><div className="radio-dot"></div></div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {!isCreating && (
              <button type="button" className="btn-cancel" onClick={startCreate}>
                Cancelar
              </button>
            )}
            <button type="button" className="btn-clear" onClick={clearForm}>
              Limpiar
            </button>
            <button 
              type="button" 
              className="btn-save" 
              disabled={saving}
              onClick={isCreating ? handleCreate : handleEdit}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Guardar especie
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
