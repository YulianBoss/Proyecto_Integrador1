import { useState, useEffect, useCallback } from 'react'
import { productionAPI, prediosAPI, lotesAPI, cultivosAPI, especiesAPI } from '../../services/api'
import './productor.css'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoEdit   = () => <svg viewBox="0 0 24 24" {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IcoTrash  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
const IcoX      = () => <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoPlus   = () => <svg viewBox="0 0 24 24" {...S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IcoHist   = () => <svg viewBox="0 0 24 24" {...S}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
const IcoAlert  = () => <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoMap    = () => <svg viewBox="0 0 24 24" {...S}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
const IcoLeaf   = () => <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg>
const IcoSearch = () => <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>

const ESTADOS_LOTE = ['activo', 'inactivo', 'en_preparacion', 'cosechado']
const ESTADOS_INICIALES_LOTE = ['activo', 'en_preparacion', 'inactivo']

const normalize = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

function Badge({ estado }) {
  const m = { activo:'activo', inactivo:'inactivo', cosechado:'cosechado', en_preparacion:'preparacion' }
  const t = { activo:'Activo', inactivo:'Inactivo', cosechado:'Cosechado', en_preparacion:'En Preparacion' }
  return <span className={`p-badge p-badge--${m[estado]||'inactivo'}`}>{t[estado]||estado}</span>
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="p-modal-overlay" onClick={onClose}>
      <div className="p-modal" style={wide ? { maxWidth:640 } : {}} onClick={e => e.stopPropagation()}>
        <div className="p-modal__header">
          <h3>{title}</h3>
          <button className="p-modal__close" onClick={onClose}><IcoX /></button>
        </div>
        <div className="p-modal__body">{children}</div>
      </div>
    </div>
  )
}

export default function LotesPage() {
  const [lugares, setLugares]         = useState([])
  const [predios, setPredios]         = useState([])
  const [lugarSel, setLugarSel]       = useState('')
  const [lotes, setLotes]             = useState([])
  const [cultivos, setCultivos]       = useState({})
  const [loading, setLoading]         = useState(false)
  const [loadLugares, setLoadLugares] = useState(true)
  const [loadPredios, setLoadPredios] = useState(true)
  const [error, setError]             = useState('')
  const [toast, setToast]             = useState(null)
  const [procesando, setProcesando]   = useState(false)

  // Modales
  const [showFormNuevo, setShowFormNuevo] = useState(false)
  const [editando, setEditando]       = useState(null)
  const [historial, setHistorial]     = useState(null)
  const [historialData, setHistorialData] = useState([])
  const [confirmDel, setConfirmDel]   = useState(null)
  const [modalEstado, setModalEstado] = useState(null)

  // Formulario nuevo lote
  const [formNuevo, setFormNuevo] = useState({ codigo:'', area_ha:'', estado:'activo' })
  const [erroresNuevo, setErroresNuevo] = useState({})
  // Formulario editar
  const [formEditar, setFormEditar] = useState({ area_ha:'', predio_id:'', estado:'' })
  // Cambiar estado
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [obsEstado, setObsEstado]     = useState('')
  const [errDelModal, setErrDelModal] = useState('')

  // Modal cultivo
  const [showCultivo, setShowCultivo] = useState(null)
  const [formCultivo, setFormCultivo] = useState({ especie_id:'', variedad:'', fecha_siembra:'' })
  const [especies, setEspecies]       = useState([])
  const [busqEspecie, setBusqEspecie] = useState('')
  const [loadEspecies, setLoadEspecies] = useState(false)

  const lugarActual = lugares.find(l => String(l.id) === String(lugarSel))
  const lugarHabilitado = lugarActual?.estado === 'activo'
  const toast_ = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // Cargar lugares
  useEffect(() => {
    productionAPI.getAll()
      .then(r => { setLugares(r.data || []); if ((r.data||[]).length > 0) setLugarSel(String(r.data[0].id)) })
      .catch(() => setError('No se pudieron cargar los lugares.'))
      .finally(() => setLoadLugares(false))

    prediosAPI.getAll()
      .then(r => setPredios(r.data || []))
      .catch(() => setError('No se pudieron cargar los predios del ICA.'))
      .finally(() => setLoadPredios(false))
  }, [])

  // Cargar lotes
  const cargarLotes = useCallback(async () => {
    if (!lugarSel) return
    setLoading(true); setError('')
    try {
      const res = await lotesAPI.getByLugar(lugarSel)
      setLotes(res.data || [])
      const map = {}
      await Promise.all((res.data || []).map(async l => {
        try {
          const cr = await cultivosAPI.getByLote(l.id)
          map[l.id] = (cr.data || []).filter(c => c.estado === 'activo')
        } catch { map[l.id] = [] }
      }))
      setCultivos(map)
    } catch { setError('No se pudieron cargar los lotes.') }
    finally { setLoading(false) }
  }, [lugarSel])

  useEffect(() => { cargarLotes() }, [cargarLotes])

  // ── CRUD lotes ──────────────────────────────────────────────
  const crearLote = async () => {
    // E1: lugar no seleccionado
    if (!lugarSel) {
      toast_('Debes seleccionar un lugar de produccion valido antes de registrar un lote.', 'error')
      return
    }
    // E2/E3: validacion por campo
    const errs = {}
    if (!formNuevo.codigo?.trim()) {
      errs.codigo = 'El codigo del lote es obligatorio'
    }
    const areaNum = Number(formNuevo.area_ha)
    if (!formNuevo.area_ha || isNaN(areaNum) || areaNum <= 0) {
      errs.area_ha = 'Ingresa una extension numerica mayor a cero (ej: 1.5)'
    }
    if (Object.keys(errs).length > 0) { setErroresNuevo(errs); return }

    setProcesando(true)
    try {
      await lotesAPI.create({ codigo: formNuevo.codigo.trim(), area_ha: formNuevo.area_ha, estado: formNuevo.estado, lugar_produccion_id: parseInt(lugarSel) })
      toast_('Lote creado correctamente.')
      setShowFormNuevo(false)
      setFormNuevo({ codigo:'', area_ha:'', estado:'activo' })
      setErroresNuevo({})
      cargarLotes()
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (/c.digo|codigo|ya existe/i.test(msg)) {
        setErroresNuevo(p => ({ ...p, codigo: msg }))                         // E2
      } else if (/área|area|extensi|hectar/i.test(msg)) {
        setErroresNuevo(p => ({ ...p, area_ha: msg }))                        // E3
      } else {
        toast_(msg || 'No fue posible crear el lote. Intenta nuevamente.', 'error')
      }
    } finally { setProcesando(false) }
  }

  const guardarEdicion = async () => {
    if (!formEditar.area_ha || parseFloat(formEditar.area_ha) <= 0) { toast_('El area debe ser mayor a cero.', 'error'); return }
    if (!formEditar.predio_id) { toast_('Selecciona un predio asociado.', 'error'); return }
    if (!formEditar.estado) { toast_('Selecciona un estado.', 'error'); return }
    setProcesando(true)
    try {
      const payload = {
        area_ha: formEditar.area_ha,
        predio_id: Number(formEditar.predio_id),
        estado: formEditar.estado,
      }
      // Solo enviamos observacion si cambió el estado
      if (formEditar.estado !== editando.estado && formEditar.obsEditar) {
        payload.observacion = formEditar.obsEditar
      }
      await lotesAPI.update(editando.id, payload)
      toast_('Lote actualizado correctamente.')
      setEditando(null); cargarLotes()
    } catch (err) {
      toast_(err.response?.data?.message || 'No fue posible guardar. Intenta nuevamente.', 'error')
    } finally { setProcesando(false) }
  }

  const cambiarEstado = async () => {
    if (!nuevoEstado) { toast_('Selecciona un estado.', 'error'); return }
    setProcesando(true)
    try {
      await lotesAPI.cambiarEstado(modalEstado.id, { estado: nuevoEstado, observacion: obsEstado || undefined })
      toast_(`Estado cambiado a ${nuevoEstado}.`)
      setModalEstado(null); setNuevoEstado(''); setObsEstado(''); cargarLotes()
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al cambiar estado.', 'error')
    } finally { setProcesando(false) }
  }

  const eliminarLote = async () => {
    setProcesando(true)
    try {
      await lotesAPI.delete(confirmDel.id)
      toast_('Lote eliminado correctamente.')
      setConfirmDel(null); setErrDelModal(''); cargarLotes()
    } catch (err) {
      // E5/E6: no cerrar modal, mostrar error inline con contexto
      setErrDelModal(err.response?.data?.message || 'No fue posible eliminar el lote. Intenta nuevamente.')
    } finally { setProcesando(false) }
  }

  const verHistorial = async (lote) => {
    setHistorial(lote)
    try { const res = await lotesAPI.historial(lote.id); setHistorialData(res.data || []) }
    catch { setHistorialData([]) }
  }

  // ── CRUD cultivo ────────────────────────────────────────────
  const abrirModalCultivo = async (lote) => {
    setShowCultivo(lote)
    setFormCultivo({ especie_id:'', variedad:'', fecha_siembra:'' })
    setBusqEspecie('')
    setLoadEspecies(true)
    try { const res = await especiesAPI.getAll(); setEspecies(res.data || []) }
    catch { setEspecies([]) }
    finally { setLoadEspecies(false) }
  }

  const guardarCultivo = async () => {
    if (!formCultivo.especie_id)   { toast_('Selecciona una especie de cultivo.', 'error'); return }
    if (!formCultivo.fecha_siembra){ toast_('La fecha de siembra es obligatoria.', 'error'); return }
    if (new Date(formCultivo.fecha_siembra) > new Date()) { toast_('La fecha de siembra no puede ser futura.', 'error'); return }
    setProcesando(true)
    try {
      await cultivosAPI.create({ lote_id: showCultivo.id, ...formCultivo })
      toast_('Cultivo registrado correctamente.')
      setShowCultivo(null)
      setFormCultivo({ especie_id:'', variedad:'', fecha_siembra:'' })
      cargarLotes()
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al registrar cultivo.', 'error')
    } finally { setProcesando(false) }
  }

  // Filtro local de especies por busqueda
  const especiesFiltradas = especies.filter(e =>
    !busqEspecie ||
    e.nombre.toLowerCase().includes(busqEspecie.toLowerCase()) ||
    e.nombre_cientifico?.toLowerCase().includes(busqEspecie.toLowerCase())
  )

  const especieSel = especies.find(e => String(e.id) === String(formCultivo.especie_id))

  return (
    <div>
      {toast && (
        <div className={`p-toast p-toast--${toast.tipo}`}>
          {toast.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />} {toast.msg}
        </div>
      )}

      <div className="ph-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'0.75rem' }}>
        <div><h2>Gestion de Lotes</h2><p>Administre los lotes por lugar de produccion.</p></div>
      </div>

      {error && <div className="p-alert p-alert--error"><IcoAlert /> {error}</div>}

      {/* Selector de lugar */}
      <div className="p-section" style={{ marginBottom:'1.25rem' }}>
        <div className="p-section__body" style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
          <label className="p-label" style={{ margin:0, whiteSpace:'nowrap' }}>Lugar de produccion:</label>
          {loadLugares ? (
            <span className="p-td-muted"><span className="p-spinner p-spinner--sm" /> Cargando...</span>
          ) : lugares.length === 0 ? (
            <span className="p-td-muted">No tiene lugares registrados.</span>
          ) : (
            <select className="p-input" style={{ maxWidth:320 }} value={lugarSel} onChange={e => { setLugarSel(e.target.value); setShowFormNuevo(false) }}>
              {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre} — {l.municipio} ({l.estado})</option>)}
            </select>
          )}
          {lugarSel && lugarHabilitado && (
            <button className="p-btn p-btn--green p-btn--sm" onClick={() => { setShowFormNuevo(true); setEditando(null); setFormNuevo({ codigo:'', area_ha:'', estado:'activo' }); setErroresNuevo({}) }}>
              <IcoPlus /> Agregar lote
            </button>
          )}
        </div>
        {lugarSel && !lugarHabilitado && lugarActual && (
          <div className="p-alert p-alert--warn" style={{ width:'100%', marginBottom:0 }}>
            <IcoAlert /> Este lugar está en estado <strong>{lugarActual.estado}</strong>. Solo cuando quede activo podrá registrar lotes.
          </div>
        )}
      </div>

      {/* Formulario nuevo lote */}
      {showFormNuevo && (
        <div className="p-section" style={{ marginBottom:'1.25rem' }}>
          <div className="p-section__header"><h3>Nuevo lote</h3></div>
          <div className="p-section__body">
            <div className="p-form-grid">
              {/* E2: codigo duplicado */}
              <div className="p-form-group">
                <label className="p-label">Codigo del lote *</label>
                <input
                  className="p-input"
                  style={erroresNuevo.codigo ? { borderColor:'#dc2626' } : undefined}
                  value={formNuevo.codigo}
                  onChange={e => { setFormNuevo(p => ({...p, codigo:e.target.value})); setErroresNuevo(p => ({...p, codigo:''})) }}
                  placeholder="Ej: A-01"
                />
                {erroresNuevo.codigo && <span className="p-hint" style={{ color:'#dc2626' }}>{erroresNuevo.codigo}</span>}
              </div>
              {/* E3: extension invalida o supera limite del lugar */}
              <div className="p-form-group">
                <label className="p-label">Hectareas *</label>
                <input
                  className="p-input"
                  style={erroresNuevo.area_ha ? { borderColor:'#dc2626' } : undefined}
                  type="number" min="0.01" step="0.01"
                  value={formNuevo.area_ha}
                  onChange={e => { setFormNuevo(p => ({...p, area_ha:e.target.value})); setErroresNuevo(p => ({...p, area_ha:''})) }}
                  placeholder="0.00"
                />
                {erroresNuevo.area_ha
                  ? <span className="p-hint" style={{ color:'#dc2626' }}>{erroresNuevo.area_ha}</span>
                  : lugarActual?.area_total_ha != null && (
                    <span className="p-hint">La suma de todos los lotes no puede superar las {lugarActual.area_total_ha} ha del lugar de produccion.</span>
                  )
                }
              </div>
              <div className="p-form-group">
                <label className="p-label">Estado inicial</label>
                <select className="p-input" value={formNuevo.estado} onChange={e => setFormNuevo(p => ({...p, estado:e.target.value}))}>
                  {ESTADOS_INICIALES_LOTE.map(e => <option key={e} value={e}>{{ activo:'Activo', inactivo:'Inactivo', en_preparacion:'En preparacion' }[e] || e}</option>)}
                </select>
              </div>
              <div className="p-form-group p-form-group--full">
                <label className="p-label">Cultivo actual (opcional)</label>
                <span className="p-hint">Se registra despues desde Gestion de Cultivos.</span>
              </div>
            </div>
            <div className="p-form-actions">
              <button className="p-btn p-btn--green" onClick={crearLote} disabled={procesando}>
                {procesando ? <><span className="p-spinner p-spinner--sm" /> Guardando...</> : <><IcoCheck /> Guardar lote</>}
              </button>
              <button className="p-btn p-btn--outline" onClick={() => { setShowFormNuevo(false); setFormNuevo({ codigo:'', area_ha:'', estado:'activo' }); setErroresNuevo({}) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla lotes */}
      <div className="p-section">
        <div className="p-section__header">
          <div><h3>Lotes registrados</h3><p>{lotes.length} lote{lotes.length !== 1 ? 's' : ''}</p></div>
        </div>
        <div className="p-section__body" style={{ padding:0 }}>
          {loading ? (
            <div className="p-loading"><span className="p-spinner" /> Cargando lotes...</div>
          ) : !lugarSel ? (
            <div className="p-empty"><IcoMap /><p>Selecciona un lugar de produccion.</p></div>
          ) : lotes.length === 0 ? (
            <div className="p-empty"><IcoMap /><p>No hay lotes registrados en este lugar.</p></div>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Codigo</th><th>Hectareas</th><th>Cultivo activo</th>
                    <th>Estado</th><th>Fecha registro</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lotes.map(l => {
                    const cultivosActivos = cultivos[l.id] || []
                    const cultActivo = cultivosActivos[0]
                    return (
                      <tr key={l.id}>
                        <td><strong>{l.codigo}</strong></td>
                        <td className="p-td-muted">{l.area_ha} ha</td>
                        <td>
                          {cultActivo ? (
                            <span style={{ fontSize:'0.8rem', color:'#2e7d52' }}>
                              {cultActivo.variedad || 'Sin variedad'} · {new Date(cultActivo.fecha_siembra).toLocaleDateString('es-CO')}
                            </span>
                          ) : (
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => abrirModalCultivo(l)}>
                              <IcoLeaf /> Registrar cultivo
                            </button>
                          )}
                        </td>
                        <td><Badge estado={l.estado} /></td>
                        <td className="p-td-muted">{l.fecha_registro ? new Date(l.fecha_registro).toLocaleDateString('es-CO') : '—'}</td>
                        <td>
                          <div className="p-actions">
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => { setModalEstado(l); setNuevoEstado(l.estado); setObsEstado('') }}>Estado</button>
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => { setEditando(l); setFormEditar({ area_ha: l.area_ha, predio_id: String(l.predio_id || ''), estado: l.estado, obsEditar: '' }); setShowFormNuevo(false) }}><IcoEdit /></button>
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => verHistorial(l)}><IcoHist /></button>
                            <button className="p-btn p-btn--danger p-btn--sm" onClick={() => setConfirmDel(l)}><IcoTrash /></button>
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

      {/* Modal editar lote */}
      {editando && (() => {
        const prediosEdit = predios.filter((p) =>
          normalize(p.departamento) === normalize(lugarActual?.departamento) &&
          normalize(p.municipio) === normalize(lugarActual?.municipio)
        )
        const estadoCambio = formEditar.estado && formEditar.estado !== editando.estado
        return (
          <Modal title={`Editar lote — ${editando.codigo}`} onClose={() => setEditando(null)} wide>
            <div className="p-form-grid">
              <div className="p-form-group">
                <label className="p-label">Extension en hectareas *</label>
                <input
                  className="p-input"
                  type="number" min="0.01" step="0.01"
                  value={formEditar.area_ha}
                  onChange={e => setFormEditar(p => ({ ...p, area_ha: e.target.value }))}
                />
              </div>
              <div className="p-form-group">
                <label className="p-label">Predio asociado *</label>
                <select
                  className="p-input"
                  value={formEditar.predio_id}
                  onChange={e => setFormEditar(p => ({ ...p, predio_id: e.target.value }))}
                  disabled={prediosEdit.length === 0}
                >
                  <option value="">-- Selecciona predio --</option>
                  {prediosEdit.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre_identificacion} — {p.vereda_direccion}</option>
                  ))}
                </select>
                {prediosEdit.length === 0 && (
                  <span className="p-hint">No hay predios disponibles para esta ubicacion.</span>
                )}
              </div>
              <div className="p-form-group">
                <label className="p-label">Estado *</label>
                <select
                  className="p-input"
                  value={formEditar.estado}
                  onChange={e => setFormEditar(p => ({ ...p, estado: e.target.value }))}
                >
                  {ESTADOS_LOTE.map(e => (
                    <option key={e} value={e}>{{
                      activo: 'Activo',
                      inactivo: 'Inactivo',
                      en_preparacion: 'En preparacion',
                      cosechado: 'Cosechado'
                    }[e] || e}</option>
                  ))}
                </select>
              </div>
              {estadoCambio && (
                <div className="p-form-group p-form-group--full">
                  <label className="p-label">Observacion del cambio de estado (opcional)</label>
                  <textarea
                    className="p-input p-textarea"
                    rows={2}
                    value={formEditar.obsEditar || ''}
                    onChange={e => setFormEditar(p => ({ ...p, obsEditar: e.target.value }))}
                    placeholder="Motivo del cambio..."
                  />
                  <span className="p-hint">El cambio de estado quedara registrado en el historial.</span>
                </div>
              )}
            </div>
            <div className="p-modal__actions">
              <button className="p-btn p-btn--outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="p-btn p-btn--green" onClick={guardarEdicion} disabled={procesando}>
                {procesando ? <><span className="p-spinner p-spinner--sm" /> Guardando...</> : <><IcoCheck /> Guardar cambios</>}
              </button>
            </div>
          </Modal>
        )
      })()}

      {/* Modal cambiar estado */}
      {modalEstado && (
        <Modal title={`Estado del lote ${modalEstado.codigo}`} onClose={() => setModalEstado(null)}>
          <div className="p-form-grid" style={{ gridTemplateColumns:'1fr' }}>
            <div className="p-form-group">
              <label className="p-label">Nuevo estado</label>
              <select className="p-input" value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                {ESTADOS_LOTE.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="p-form-group">
              <label className="p-label">Observacion (opcional)</label>
              <textarea className="p-input p-textarea" rows={2} value={obsEstado} onChange={e => setObsEstado(e.target.value)} placeholder="Motivo del cambio..." />
            </div>
          </div>
          <div className="p-modal__actions">
            <button className="p-btn p-btn--outline" onClick={() => setModalEstado(null)}>Cancelar</button>
            <button className="p-btn p-btn--green" onClick={cambiarEstado} disabled={procesando}>
              {procesando ? <><span className="p-spinner p-spinner--sm" /> Guardando...</> : <><IcoCheck /> Cambiar estado</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal historial */}
      {historial && (
        <Modal title={`Historial — ${historial.codigo}`} onClose={() => setHistorial(null)} wide>
          {historialData.length === 0 ? (
            <p style={{ fontSize:'0.85rem', color:'#9ca3af', textAlign:'center', padding:'1.5rem 0' }}>Sin historial registrado.</p>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead><tr><th>Estado anterior</th><th>Estado nuevo</th><th>Fecha</th><th>Observacion</th></tr></thead>
                <tbody>
                  {historialData.map(h => (
                    <tr key={h.id}>
                      <td className="p-td-muted">{h.estado_anterior || '—'}</td>
                      <td><Badge estado={h.estado_nuevo} /></td>
                      <td className="p-td-muted">{h.fecha_cambio ? new Date(h.fecha_cambio).toLocaleDateString('es-CO') : '—'}</td>
                      <td className="p-td-muted">{h.observacion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* Modal registrar cultivo */}
      {showCultivo && (
        <Modal title={`Registrar cultivo — Lote ${showCultivo.codigo}`} onClose={() => setShowCultivo(null)}>

          {/* Especie con buscador + lista scrolleable */}
          <div className="p-form-group" style={{ marginBottom:'1rem' }}>
            <label className="p-label">Especie del cultivo *</label>

            {/* Input de busqueda */}
            <div className="p-search-box" style={{ marginBottom:'0.4rem' }}>
              <span className="p-search-icon"><IcoSearch /></span>
              <input
                placeholder="Escribe para filtrar especies..."
                value={busqEspecie}
                onChange={e => {
                  setBusqEspecie(e.target.value)
                  setFormCultivo(p => ({ ...p, especie_id: '' }))
                }}
              />
            </div>

            {/* Lista scrolleable de especies */}
            {loadEspecies ? (
              <div style={{ padding:'0.6rem', fontSize:'0.82rem', color:'#9ca3af' }}>
                <span className="p-spinner p-spinner--sm" /> Cargando especies...
              </div>
            ) : (
              <div style={{
                border: '1.5px solid #d1d5db',
                borderRadius: '7px',
                maxHeight: '180px',
                overflowY: 'auto',
                background: '#fff'
              }}>
                {especiesFiltradas.length === 0 ? (
                  <div style={{ padding:'0.75rem', color:'#9ca3af', fontSize:'0.82rem', textAlign:'center' }}>
                    Sin resultados para "{busqEspecie}"
                  </div>
                ) : especiesFiltradas.map(e => (
                  <div
                    key={e.id}
                    onClick={() => setFormCultivo(p => ({ ...p, especie_id: String(e.id) }))}
                    style={{
                      padding: '0.55rem 0.875rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f0f2f5',
                      background: String(formCultivo.especie_id) === String(e.id) ? '#e8f5ee' : '#fff',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={ev => { if (String(formCultivo.especie_id) !== String(e.id)) ev.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = String(formCultivo.especie_id) === String(e.id) ? '#e8f5ee' : '#fff' }}
                  >
                    <div style={{ fontSize:'0.855rem', fontWeight:600, color:'#1e293b' }}>{e.nombre}</div>
                    <div style={{ fontSize:'0.72rem', color:'#9ca3af', fontStyle:'italic' }}>{e.nombre_cientifico}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmacion de seleccion */}
            {especieSel ? (
              <div style={{ marginTop:'0.4rem', fontSize:'0.8rem', color:'#2e7d52', display:'flex', alignItems:'center', gap:'0.3rem' }}>
               <span style={{ width:'14px', height:'14px', display:'inline-flex', flexShrink:0 }}><IcoCheck /></span> Seleccionado: <strong>{especieSel.nombre}</strong>
              </div>
            ) : (
              <div style={{ marginTop:'0.4rem', fontSize:'0.75rem', color:'#9ca3af' }}>
                Haz clic en una especie para seleccionarla
              </div>
            )}
          </div>

          {/* Variedad */}
          <div className="p-form-group" style={{ marginBottom:'1rem' }}>
            <label className="p-label">Variedad (opcional)</label>
            <input
              className="p-input"
              value={formCultivo.variedad}
              onChange={e => setFormCultivo(p => ({ ...p, variedad: e.target.value }))}
              placeholder="Ej: Criolla, Hibrida, Amarilla..."
            />
          </div>

          {/* Fecha siembra */}
          <div className="p-form-group">
            <label className="p-label">Fecha de siembra *</label>
            <input
              className="p-input"
              type="date"
              value={formCultivo.fecha_siembra}
              onChange={e => setFormCultivo(p => ({ ...p, fecha_siembra: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
            />
            <span className="p-hint">No puede ser una fecha futura.</span>
          </div>

          <div className="p-modal__actions">
            <button className="p-btn p-btn--outline" onClick={() => setShowCultivo(null)}>Cancelar</button>
            <button className="p-btn p-btn--green" onClick={guardarCultivo} disabled={procesando}>
              {procesando
                ? <><span className="p-spinner p-spinner--sm" /> Guardando...</>
                : <><IcoCheck /> Registrar cultivo</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal confirmar eliminacion — E6: cultivos activos */}
      {confirmDel && (
        <Modal title="Eliminar lote" onClose={() => { setConfirmDel(null); setErrDelModal('') }}>
          {/* Error inline E6 */}
          {errDelModal ? (
            <>
              <div className="p-alert p-alert--error" style={{ marginBottom:'1rem', lineHeight:1.6 }}>
                <IcoAlert />
                <span style={{ marginLeft:'0.4rem' }}>{errDelModal}</span>
              </div>
              <div className="p-modal__actions">
                <button className="p-btn p-btn--outline" onClick={() => { setConfirmDel(null); setErrDelModal('') }}>Cerrar</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize:'0.875rem', color:'#6b7280', lineHeight:1.55, marginBottom:'1rem' }}>
                ¿Confirmas la eliminacion del lote <strong>{confirmDel.codigo}</strong>? Esta accion no puede deshacerse.
              </p>
              <div className="p-modal__actions">
                <button className="p-btn p-btn--outline" onClick={() => { setConfirmDel(null); setErrDelModal('') }}>Cancelar</button>
                <button className="p-btn p-btn--danger" onClick={eliminarLote} disabled={procesando}>
                  {procesando ? <><span className="p-spinner p-spinner--sm" /> Eliminando...</> : <><IcoTrash /> Confirmar eliminacion</>}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

    </div>
  )
}