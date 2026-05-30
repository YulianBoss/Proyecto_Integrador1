import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminMockPages.css'

// Datos base simulados con nombres científicos incluidos para mayor profesionalismo
const BASE_PLAGAS = [
  { id: 1, nombre: 'Broca del café', cientifico: 'Hypothenemus hampei', riesgo: 'alto', cultivo: 'Café', estado: 'activo' },
  { id: 2, nombre: 'Mosca blanca', cientifico: 'Bemisia tabaci', riesgo: 'medio', cultivo: 'Tomate', estado: 'activo' },
  { id: 3, nombre: 'Roya del cafeto', cientifico: 'Hemileia vastatrix', riesgo: 'alto', cultivo: 'Café', estado: 'inactivo' },
  { id: 4, nombre: 'Trips', cientifico: 'Frankliniella occidentalis', riesgo: 'bajo', cultivo: 'Banano', estado: 'activo' },
]

export default function AdminPlagasMock() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [riesgo, setRiesgo] = useState('')

  // Filtrado inteligente por nombre común, científico o cultivo
  const rows = useMemo(() => {
    return BASE_PLAGAS.filter(item => {
      const matchQ = q.trim() === '' || 
        item.nombre.toLowerCase().includes(q.toLowerCase()) ||
        item.cientifico.toLowerCase().includes(q.toLowerCase()) ||
        item.cultivo.toLowerCase().includes(q.toLowerCase())
        
      const matchRiesgo = riesgo === '' || item.riesgo === riesgo
      return matchQ && matchRiesgo
    })
  }, [q, riesgo])

  return (
    <section className="mock-admin-page">
      
      {/* Cabecera estilo Dashboard Moderno */}
      <header className="mock-header-flex">
        <div>
          <h2>Gestión de Catálogo de Plagas</h2>
          <p>Administración, consulta y monitoreo de riesgos fitosanitarios.</p>
        </div>
        <button className="btn-primary-pro" onClick={() => navigate('/admin/plagas/crear')}>
          <IconPlus /> Registrar Nueva Plaga
        </button>
      </header>

      {/* Barra de Herramientas y Filtros */}
      <div className="mock-toolbar-pro">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Buscar por nombre común, científico o cultivo..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pro-search-input"
          />
        </div>
        
        <select 
          value={riesgo} 
          onChange={e => setRiesgo(e.target.value)}
          className="pro-select-filter"
        >
          <option value="">Todos los niveles de riesgo</option>
          <option value="alto">Riesgo Alto</option>
          <option value="medio">Riesgo Medio</option>
          <option value="bajo">Riesgo Bajo</option>
        </select>
        
        <span className="results-counter-pro">
          {rows.length} {rows.length === 1 ? 'registro encontrado' : 'registros encontrados'}
        </span>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="mock-table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
        <table className="mock-table">
          <thead>
            <tr>
              <th>Plaga / Nombre Científico</th>
              <th>Cultivo Principal</th>
              <th>Nivel de Riesgo</th>
              <th>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <div className="plaga-info-cell">
                      <span className="plaga-name-main">{row.nombre}</span>
                      <span className="plaga-scientific-sub">{row.cientifico}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge-cultivo-pro">{row.cultivo}</span>
                  </td>
                  <td>
                    <span className={`badge-risk-pro risk-${row.riesgo}`}>
                      <span className="risk-dot"></span>
                      {row.riesgo === 'alto' ? 'Alto' : row.riesgo === 'medio' ? 'Medio' : 'Bajo'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status-pro status-${row.estado}`}>
                      {row.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-actions-cell-pro">
                    <button 
                      className="btn-action-edit-pro" 
                      title="Editar plaga" 
                      onClick={() => navigate('/admin/plagas/editar')}
                    >
                      <IconEdit />
                    </button>
                    <button 
                      className="btn-action-delete-pro" 
                      title="Eliminar plaga" 
                      onClick={() => alert(`Simulación: Eliminar plaga ID ${row.id}`)}
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="table-empty-state-pro">
                  No se encontraron plagas que coincidan con los criterios de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Estilos Pro Embebidos para garantizar consistencia visual inmediata */}
      <style>{`
        .mock-header-flex { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
        .mock-header-flex h2 { margin: 0; font-size: 1.5rem; color: #0f172a; font-weight: 700; }
        .mock-header-flex p { margin: 4px 0 0; font-size: 0.875rem; color: #64748b; }
        
        .mock-toolbar-pro { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .search-wrapper { flex: 1; min-width: 280px; }
        .pro-search-input { width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; font-family: inherit; }
        .pro-search-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        
        .pro-select-filter { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; background: #fff; cursor: pointer; font-family: inherit; }
        .pro-select-filter:focus { outline: none; border-color: #2563eb; }
        
        .results-counter-pro { font-size: 0.85rem; color: #64748b; font-weight: 500; margin-left: auto; }
        
        .plaga-info-cell { display: flex; flex-direction: column; gap: 2px; }
        .plaga-name-main { font-weight: 600; color: #1e293b; font-size: 0.9rem; }
        .plaga-scientific-sub { font-size: 0.75rem; color: #64748b; font-style: italic; }
        
        .badge-cultivo-pro { background: #f1f5f9; color: #334155; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; }
        
        .badge-risk-pro { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
        .risk-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .risk-alto  .risk-dot { background: #dc2626; }
        .risk-medio .risk-dot { background: #d97706; }
        .risk-bajo  .risk-dot { background: #16a34a; }
        .risk-alto { background: #fee2e2; color: #991b1b; }
        .risk-medio { background: #fef3c7; color: #92400e; }
        .risk-bajo { background: #dcfce7; color: #166534; }
        
        .badge-status-pro { padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; }
        .status-activo { background: #e0f2fe; color: #0369a1; }
        .status-inactivo { background: #f1f5f9; color: #64748b; }
        
        .table-actions-cell-pro { display: flex; gap: 8px; justify-content: center; align-items: center; height: 100%; }
        .btn-action-edit-pro, .btn-action-delete-pro { border: 1px solid #e2e8f0; background: #fff; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-action-edit-pro { color: #2563eb; }
        .btn-action-edit-pro:hover { background: #eff6ff; border-color: #bfdbfe; }
        .btn-action-delete-pro { color: #dc2626; }
        .btn-action-delete-pro:hover { background: #fef2f2; border-color: #fecaca; }
        
        .table-empty-state-pro { text-align: center; padding: 32px; color: #64748b; font-size: 0.9rem; }
        
        .btn-primary-pro { display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 8px; background: #2563eb; color: #fff; font-size: 0.875rem; font-weight: 600; padding: 10px 16px; cursor: pointer; transition: background 0.2s; font-family: inherit; }
        .btn-primary-pro:hover { background: #1d4ed8; }
      `}</style>
    </section>
  )
}

/* ── Micro SVG Icons Limpios para Componentes Administrativos ─────────────────────────────── */
const iconStyles = { fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', width: '16', height: '16' }

function IconPlus() { 
  return <svg viewBox="0 0 24 24" {...iconStyles} style={{ width: 18, height: 18 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> 
}

function IconEdit() { 
  return <svg viewBox="0 0 24 24" {...iconStyles}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> 
}

function IconTrash() { 
  return <svg viewBox="0 0 24 24" {...iconStyles}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> 
}