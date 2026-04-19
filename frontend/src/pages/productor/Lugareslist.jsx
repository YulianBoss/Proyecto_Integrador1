import { useState, useEffect, useCallback } from 'react'
import { productionAPI, lotesAPI } from '../../services/api'
import './productor.css'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoEdit   = () => <svg viewBox="0 0 24 24" {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
const IcoEye    = () => <svg viewBox="0 0 24 24" {...S}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoX      = () => <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoPlus   = () => <svg viewBox="0 0 24 24" {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoSearch = () => <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IcoHome   = () => <svg viewBox="0 0 24 24" {...S}><path d="M3 12L12 3l9 9v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg>
const IcoAlert  = () => <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoMap    = () => <svg viewBox="0 0 24 24" {...S}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>

const FORM_VACIO = { nombre:'', numero_registro_ica:'', departamento:'', municipio:'', vereda_direccion:'', area_total_ha:'', coordenadas_lat:'', coordenadas_lng:'' }

function Badge({ estado }) {
  const m = { activo:'activo', inactivo:'inactivo' }
  const t = { activo:'Activo', inactivo:'Inactivo' }
  return <span className={`p-badge p-badge--${m[estado]||'inactivo'}`}>{t[estado]||estado}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="p-modal-overlay" onClick={onClose}>
      <div className="p-modal" onClick={e => e.stopPropagation()}>
        <div className="p-modal__header">
          <h3>{title}</h3>
          <button className="p-modal__close" onClick={onClose}><IcoX /></button>
        </div>
        <div className="p-modal__body">{children}</div>
      </div>
    </div>
  )
}

function LugarForm({ inicial, onGuardar, onCancelar, cargando }) {
  const [form, setForm] = useState(inicial || FORM_VACIO)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-form-grid">
      <div className="p-form-group">
        <label className="p-label">Nombre del lugar *</label>
        <input className="p-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Finca San Isidro" />
      </div>
      <div className="p-form-group">
        <label className="p-label">N° Registro ICA *</label>
        <input className="p-input" value={form.numero_registro_ica} onChange={e => set('numero_registro_ica', e.target.value)} placeholder="Ej: ICA-2024-001" disabled={!!inicial} />
        {inicial && <span className="p-hint">El registro ICA no puede modificarse</span>}
      </div>
      <div className="p-form-group">
        <label className="p-label">Departamento *</label>
        <input className="p-input" value={form.departamento} onChange={e => set('departamento', e.target.value)} placeholder="Ej: Santander" />
      </div>
      <div className="p-form-group">
        <label className="p-label">Municipio *</label>
        <input className="p-input" value={form.municipio} onChange={e => set('municipio', e.target.value)} placeholder="Ej: Giron" />
      </div>
      <div className="p-form-group p-form-group--full">
        <label className="p-label">Vereda / Direccion *</label>
        <input className="p-input" value={form.vereda_direccion} onChange={e => set('vereda_direccion', e.target.value)} placeholder="Ej: Vereda La Palmita Km 3" />
      </div>
      <div className="p-form-group">
        <label className="p-label">Area total (ha) *</label>
        <input className="p-input" type="number" min="0.01" step="0.01" value={form.area_total_ha} onChange={e => set('area_total_ha', e.target.value)} placeholder="0.00" />
      </div>
      <div className="p-form-group">
        <label className="p-label">Latitud (opcional)</label>
        <input className="p-input" type="number" step="any" value={form.coordenadas_lat} onChange={e => set('coordenadas_lat', e.target.value)} placeholder="7.0731" />
      </div>
      <div className="p-form-group">
        <label className="p-label">Longitud (opcional)</label>
        <input className="p-input" type="number" step="any" value={form.coordenadas_lng} onChange={e => set('coordenadas_lng', e.target.value)} placeholder="-73.1697" />
      </div>
      <div className="p-form-group p-form-group--full">
        <div className="p-form-actions" style={{ marginTop: 0 }}>
          <button className="p-btn p-btn--green" onClick={() => onGuardar(form)} disabled={cargando}>
            {cargando ? <><span className="p-spinner p-spinner--sm" /> Guardando...</> : <><IcoCheck /> Guardar lugar</>}
          </button>
          <button className="p-btn p-btn--outline" onClick={onCancelar} disabled={cargando}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function DetalleModal({ lugar, lotes, onClose }) {
  return (
    <Modal title={lugar.nombre} onClose={onClose}>
      <div className="lugar-detalle">
        <div className="lugar-detalle__grid">
          {[
            ['Registro ICA', lugar.numero_registro_ica],
            ['Departamento', lugar.departamento],
            ['Municipio', lugar.municipio],
            ['Vereda / Direccion', lugar.vereda_direccion],
            ['Area total', `${lugar.area_total_ha} ha`],
            ['Estado', lugar.estado],
            ['Fecha registro', lugar.fecha_registro ? new Date(lugar.fecha_registro).toLocaleDateString('es-CO') : '—'],
            ['Ultima inspeccion', lugar.fecha_ultima_inspeccion ? new Date(lugar.fecha_ultima_inspeccion).toLocaleDateString('es-CO') : 'Sin inspecciones'],
            ['Proxima sugerida', lugar.fecha_proxima_inspeccion ? new Date(lugar.fecha_proxima_inspeccion).toLocaleDateString('es-CO') : '—'],
            ['Coordenadas', lugar.coordenadas_lat ? `${lugar.coordenadas_lat}, ${lugar.coordenadas_lng}` : 'No registradas'],
          ].map(([k, v]) => (
            <div key={k} className="lugar-meta-item">
              <div className="lugar-meta-label">{k}</div>
              <div className="lugar-meta-val">{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
            Lotes asociados ({lotes.length})
          </div>
          {lotes.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Sin lotes registrados.</p>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead><tr><th>Codigo</th><th>Area (ha)</th><th>Estado</th></tr></thead>
                <tbody>
                  {lotes.map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.codigo}</strong></td>
                      <td className="p-td-muted">{l.area_ha} ha</td>
                      <td><span className={`p-badge p-badge--${l.estado === 'activo' ? 'activo' : 'inactivo'}`}>{l.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function LugaresList() {
  const [lugares, setLugares]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [toast, setToast]           = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editando, setEditando]     = useState(null)
  const [detalle, setDetalle]       = useState(null)
  const [detalleLotes, setDetalleLotes] = useState([])
  const [confirmDel, setConfirmDel] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const toast_ = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await productionAPI.getAll()
      setLugares(res.data || [])
    } catch { setError('No se pudieron cargar los lugares.') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirDetalle = async (lugar) => {
    setDetalle(lugar)
    try {
      const res = await lotesAPI.getByLugar(lugar.id)
      setDetalleLotes(res.data || [])
    } catch { setDetalleLotes([]) }
  }

  const guardarNuevo = async (form) => {
    if (!form.nombre || !form.numero_registro_ica || !form.departamento || !form.municipio || !form.vereda_direccion || !form.area_total_ha) {
      toast_('Completa todos los campos obligatorios.', 'error'); return
    }
    if (parseFloat(form.area_total_ha) <= 0) {
      toast_('El area debe ser mayor a cero.', 'error'); return
    }
    setProcesando(true)
    try {
      await productionAPI.create(form)
      toast_('Lugar de produccion registrado correctamente.')
      setShowForm(false)
      cargar()
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al guardar.', 'error')
    } finally { setProcesando(false) }
  }

  const guardarEdicion = async (form) => {
    if (parseFloat(form.area_total_ha) <= 0) {
      toast_('El area debe ser mayor a cero.', 'error'); return
    }
    setProcesando(true)
    try {
      await productionAPI.update(editando.id, {
        nombre: form.nombre, departamento: form.departamento,
        municipio: form.municipio, vereda_direccion: form.vereda_direccion,
        area_total_ha: form.area_total_ha,
        coordenadas_lat: form.coordenadas_lat || undefined,
        coordenadas_lng: form.coordenadas_lng || undefined,
      })
      toast_('Lugar actualizado correctamente.')
      setEditando(null)
      cargar()
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al actualizar.', 'error')
    } finally { setProcesando(false) }
  }

  const eliminar = async () => {
    setProcesando(true)
    try {
      await productionAPI.delete(confirmDel.id)
      toast_('Lugar eliminado.')
      setConfirmDel(null)
      cargar()
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al eliminar.', 'error')
      setConfirmDel(null)
    } finally { setProcesando(false) }
  }

  const filtrados = lugares.filter(l =>
    !busqueda || l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    l.municipio?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      {toast && (
        <div className={`p-toast p-toast--${toast.tipo}`}>
          {toast.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />} {toast.msg}
        </div>
      )}

      <div className="ph-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h2>Lugares de Produccion</h2>
          <p>Registre y gestione sus fincas o predios agricolas.</p>
        </div>
        {!showForm && !editando && (
          <button className="p-btn p-btn--green" onClick={() => setShowForm(true)}>
            <IcoPlus /> Registrar nuevo
          </button>
        )}
      </div>

      {error && <div className="p-alert p-alert--error"><IcoAlert /> {error}</div>}

      {/* Formulario nuevo */}
      {showForm && (
        <div className="p-section" style={{ marginBottom: '1.5rem' }}>
          <div className="p-section__header"><h3>Registrar nuevo lugar</h3></div>
          <div className="p-section__body">
            <LugarForm onGuardar={guardarNuevo} onCancelar={() => setShowForm(false)} cargando={procesando} />
          </div>
        </div>
      )}

      {/* Formulario edicion */}
      {editando && (
        <div className="p-section" style={{ marginBottom: '1.5rem' }}>
          <div className="p-section__header"><h3>Editar — {editando.nombre}</h3></div>
          <div className="p-section__body">
            <LugarForm inicial={editando} onGuardar={guardarEdicion} onCancelar={() => setEditando(null)} cargando={procesando} />
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="p-section">
        <div className="p-section__header">
          <div>
            <h3>Mis lugares registrados</h3>
            <p>{filtrados.length} lugar{filtrados.length !== 1 ? 'es' : ''}</p>
          </div>
          <div className="p-search-box">
            <span className="p-search-icon"><IcoSearch /></span>
            <input placeholder="Buscar por nombre o municipio..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="p-section__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="p-loading"><span className="p-spinner" /> Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-empty">
              <IcoHome />
              <p>{busqueda ? 'No se encontraron resultados.' : 'No tiene lugares registrados aun.'}</p>
            </div>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Lugar</th>
                    <th>Municipio</th>
                    <th>Area (ha)</th>
                    <th>Registro ICA</th>
                    <th>Proxima inspeccion</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(l => {
                    const proxima = l.fecha_proxima_inspeccion ? new Date(l.fecha_proxima_inspeccion) : null
                    const dias = proxima ? Math.ceil((proxima - new Date()) / 86400000) : null
                    const proximaCls = dias !== null && dias <= 0 ? 'p-inci-alto' : dias !== null && dias <= 7 ? 'p-inci-medio' : ''
                    return (
                      <tr key={l.id}>
                        <td><strong>{l.nombre}</strong></td>
                        <td className="p-td-muted">{l.municipio}</td>
                        <td className="p-td-muted">{l.area_total_ha}</td>
                        <td className="p-td-muted">{l.numero_registro_ica}</td>
                        <td>
                          {proxima
                            ? <span className={proximaCls}>{proxima.toLocaleDateString('es-CO')}{dias !== null && dias <= 7 && dias >= 0 ? ` (${dias}d)` : ''}</span>
                            : <span className="p-td-muted">—</span>}
                        </td>
                        <td><Badge estado={l.estado} /></td>
                        <td>
                          <div className="p-actions">
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => abrirDetalle(l)} title="Ver detalle"><IcoEye /></button>
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => { setEditando(l); setShowForm(false) }} title="Editar"><IcoEdit /></button>
                            <button className="p-btn p-btn--danger p-btn--sm" onClick={() => setConfirmDel(l)} title="Eliminar"><IcoTrash /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && <DetalleModal lugar={detalle} lotes={detalleLotes} onClose={() => setDetalle(null)} />}

      {/* Modal confirmar eliminacion */}
      {confirmDel && (
        <Modal title="Confirmar eliminacion" onClose={() => setConfirmDel(null)}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.55 }}>
            ¿Esta seguro de que desea eliminar <strong>{confirmDel.nombre}</strong>?
            Si tiene lotes asociados se marcara como inactivo en lugar de eliminarse.
          </p>
          <div className="p-modal__actions">
            <button className="p-btn p-btn--outline" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button className="p-btn p-btn--danger" onClick={eliminar} disabled={procesando}>
              {procesando ? <><span className="p-spinner p-spinner--sm" /> Eliminando...</> : <><IcoTrash /> Confirmar</>}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .lugar-detalle__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .lugar-meta-item { background: #f8fafc; border-radius: 7px; padding: 0.65rem 0.875rem; }
        .lugar-meta-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
        .lugar-meta-val   { font-size: 0.875rem; font-weight: 600; color: #374151; margin-top: 2px; }
        @media (max-width: 480px) { .lugar-detalle__grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}