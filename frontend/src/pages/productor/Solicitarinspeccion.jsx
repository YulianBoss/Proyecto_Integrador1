import { useState, useEffect, useCallback } from 'react'
import { productionAPI, inspeccionesAPI, lotesAPI } from '../../services/api'
import './productor.css'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoSend   = () => <svg viewBox="0 0 24 24" {...S}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoCheck  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoAlert  = () => <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoInfo   = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
const IcoClip   = () => <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
const IcoClock  = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

function Badge({ estado }) {
  const m = { pendiente:'pendiente', en_proceso:'proceso', completada:'completada', inactivo:'inactivo' }
  const t = { pendiente:'Pendiente', en_proceso:'En Proceso', completada:'Completada', inactivo:'Inactivo' }
  return <span className={`p-badge p-badge--${m[estado]||'inactivo'}`}>{t[estado]||estado}</span>
}

export default function SolicitarInspeccion() {
  const [tab, setTab] = useState('solicitar')

  const [lugares, setLugares]   = useState([])
  const [lugarSel, setLugarSel] = useState('')
  const [lotes, setLotes]       = useState([])
  const [lotesActivos, setLotesActivos] = useState([])
  const [fecha, setFecha]       = useState('')
  const [loadLugares, setLoadLugares] = useState(true)
  const [loadLotes, setLoadLotes] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [toast, setToast]       = useState(null)
  const [validacion, setValidacion] = useState(null) // {tipo, mensaje}

  const [inspecciones, setInspecciones] = useState([])
  const [loadInsp, setLoadInsp] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  const toast_ = (msg, tipo = 'ok') => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000) }

  // Cargar lugares
  useEffect(() => {
    productionAPI.getAll()
      .then(r => { setLugares(r.data || []) })
      .catch(() => {})
      .finally(() => setLoadLugares(false))
  }, [])

  // Cargar lotes al cambiar lugar — y validar si hay inspeccion activa
  useEffect(() => {
    if (!lugarSel) { setLotes([]); setLotesActivos([]); setValidacion(null); return }
    setLoadLotes(true); setValidacion(null)
    Promise.all([
      lotesAPI.getByLugar(lugarSel),
      inspeccionesAPI.misSolicitudes()
    ]).then(([lRes, iRes]) => {
      const todosLotes = lRes.data || []
      setLotes(todosLotes)
      const activos = todosLotes.filter(l => l.estado === 'activo')
      setLotesActivos(activos)

      // Validar inspeccion activa para este lugar
      const inspecciones = iRes.data || []
      const activa = inspecciones.find(i =>
        String(i.lugar_produccion_id) === String(lugarSel) &&
        ['pendiente', 'en_proceso'].includes(i.estado)
      )
      if (activos.length === 0) {
        setValidacion({ tipo: 'error', mensaje: 'Este lugar no tiene lotes activos. Debe activar al menos un lote antes de solicitar inspeccion.' })
      } else if (activa) {
        setValidacion({ tipo: 'warn', mensaje: `Ya existe una inspeccion en estado "${activa.estado}" para este lugar. No puede solicitar otra hasta que finalice.` })
      } else {
        setValidacion({ tipo: 'ok', mensaje: `${activos.length} lote${activos.length > 1 ? 's' : ''} activo${activos.length > 1 ? 's' : ''} disponible${activos.length > 1 ? 's' : ''} para inspeccion.` })
      }
    }).catch(() => {})
    .finally(() => setLoadLotes(false))
  }, [lugarSel])

  const puedeEnviar = validacion?.tipo === 'ok' && lugarSel && fecha && fecha >= hoy

  const enviarSolicitud = async () => {
    if (!lugarSel) { toast_('Selecciona un lugar de produccion.', 'error'); return }
    if (!fecha)    { toast_('Selecciona la fecha deseada.', 'error'); return }
    if (fecha < hoy) { toast_('La fecha no puede ser anterior a hoy.', 'error'); return }
    if (validacion?.tipo !== 'ok') { toast_(validacion?.mensaje || 'No se puede solicitar.', 'error'); return }

    setProcesando(true)
    try {
      const res = await inspeccionesAPI.solicitar({ lugar_produccion_id: parseInt(lugarSel), fecha_solicitada: fecha })
      toast_(res.data.message || 'Solicitud enviada correctamente.')
      setFecha('')
      setLugarSel('')
      setValidacion(null)
      setTab('historial')
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al enviar solicitud.', 'error')
    } finally { setProcesando(false) }
  }

  // Cargar historial
  const cargarHistorial = useCallback(async () => {
    setLoadInsp(true)
    try {
      const params = {}
      if (filtroEstado) params.estado = filtroEstado
      const res = await inspeccionesAPI.misSolicitudes(params)
      setInspecciones(res.data || [])
    } catch { setInspecciones([]) }
    finally { setLoadInsp(false) }
  }, [filtroEstado])

  useEffect(() => { if (tab === 'historial') cargarHistorial() }, [tab, cargarHistorial])

  const lugarNombre = (id) => lugares.find(l => String(l.id) === String(id))?.nombre || `Lugar #${id}`

  return (
    <div>
      {toast && (
        <div className={`p-toast p-toast--${toast.tipo}`}>
          {toast.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />} {toast.msg}
        </div>
      )}

      <div className="ph-header"><h2>Inspecciones</h2><p>Solicite nuevas inspecciones y consulte su historial.</p></div>

      {/* Tabs */}
      <div className="p-tabs">
        <button className={`p-tab ${tab === 'solicitar' ? 'p-tab--active' : ''}`} onClick={() => setTab('solicitar')}>
          <IcoClip /> Solicitar inspeccion
        </button>
        <button className={`p-tab ${tab === 'historial' ? 'p-tab--active' : ''}`} onClick={() => setTab('historial')}>
          <IcoClock /> Historial de solicitudes
        </button>
      </div>

      {/* ── TAB SOLICITAR ── */}
      {tab === 'solicitar' && (
        <div className="p-section">
          <div className="p-section__header">
            <div><h3>Nueva solicitud de inspeccion</h3><p>Seleccione el lugar y la fecha deseada.</p></div>
          </div>
          <div className="p-section__body">
            <div className="p-form-grid">
              <div className="p-form-group">
                <label className="p-label">Lugar de produccion *</label>
                {loadLugares ? (
                  <span className="p-td-muted"><span className="p-spinner p-spinner--sm" /> Cargando...</span>
                ) : (
                  <select className="p-input" value={lugarSel} onChange={e => setLugarSel(e.target.value)}>
                    <option value="">Seleccione un lugar...</option>
                    {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre} — {l.municipio}</option>)}
                  </select>
                )}
              </div>

              <div className="p-form-group">
                <label className="p-label">Fecha deseada *</label>
                <input className="p-input" type="date" value={fecha} min={hoy} onChange={e => setFecha(e.target.value)} />
                <span className="p-hint">La fecha no puede ser anterior a hoy.</span>
              </div>
            </div>

            {/* Validacion en tiempo real */}
            {loadLotes && (
              <div className="p-alert p-alert--info" style={{ marginTop: '1rem' }}>
                <IcoInfo /> Verificando disponibilidad...
              </div>
            )}
            {!loadLotes && validacion && (
              <div className={`p-alert p-alert--${validacion.tipo === 'ok' ? 'success' : validacion.tipo === 'warn' ? 'warn' : 'error'}`} style={{ marginTop: '1rem' }}>
                {validacion.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />}
                {validacion.mensaje}
              </div>
            )}

            {/* Resumen de lotes activos */}
            {lugarSel && !loadLotes && lotesActivos.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#374151', marginBottom: '0.6rem' }}>
                  Lotes activos que seran inspeccionados:
                </div>
                <div className="p-table-wrap">
                  <table className="p-table">
                    <thead><tr><th>Codigo</th><th>Area (ha)</th><th>Estado</th></tr></thead>
                    <tbody>
                      {lotesActivos.map(l => (
                        <tr key={l.id}>
                          <td><strong>{l.codigo}</strong></td>
                          <td className="p-td-muted">{l.area_ha} ha</td>
                          <td><span className="p-badge p-badge--activo">Activo</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info proceso */}
            <div className="p-alert p-alert--info" style={{ marginTop: '1.25rem' }}>
              <IcoInfo />
              <span>
                Una vez enviada la solicitud, el sistema asignara automaticamente un asistente tecnico segun disponibilidad.
                Si no hay tecnicos disponibles, el administrador realizara la asignacion manualmente.
              </span>
            </div>

            <div className="p-form-actions">
              <button
                className="p-btn p-btn--green"
                onClick={enviarSolicitud}
                disabled={!puedeEnviar || procesando}
              >
                {procesando ? <><span className="p-spinner p-spinner--sm" /> Enviando...</> : <><IcoSend /> Enviar solicitud</>}
              </button>
              <button className="p-btn p-btn--outline" onClick={() => { setLugarSel(''); setFecha(''); setValidacion(null) }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB HISTORIAL ── */}
      {tab === 'historial' && (
        <div className="p-section">
          <div className="p-section__header">
            <div><h3>Historial de inspecciones</h3></div>
            <div className="p-filter-bar" style={{ margin: 0 }}>
              <select className="p-input" style={{ width: 'auto', padding: '0.5rem 0.75rem' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="completada">Completada</option>
              </select>
            </div>
          </div>
          <div className="p-section__body" style={{ padding: 0 }}>
            {loadInsp ? (
              <div className="p-loading"><span className="p-spinner" /> Cargando historial...</div>
            ) : inspecciones.length === 0 ? (
              <div className="p-empty">
                <IcoClock />
                <p>No hay inspecciones{filtroEstado ? ` con estado "${filtroEstado}"` : ''} registradas.</p>
              </div>
            ) : (
              <div className="p-table-wrap">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th>Lugar</th>
                      <th>Fecha solicitud</th>
                      <th>Fecha deseada</th>
                      <th>Tecnico asignado</th>
                      <th>Estado</th>
                      <th>Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspecciones.map(ins => (
                      <tr key={ins.id}>
                        <td><strong>{lugarNombre(ins.lugar_produccion_id)}</strong></td>
                        <td className="p-td-muted">
                          {ins.fecha_solicitud ? new Date(ins.fecha_solicitud).toLocaleDateString('es-CO') : '—'}
                        </td>
                        <td className="p-td-muted">
                          {ins.fecha_inicio ? new Date(ins.fecha_inicio).toLocaleDateString('es-CO') : '—'}
                        </td>
                        <td className="p-td-muted">
                          {ins.asistente_id ? `Tecnico #${ins.asistente_id}` : <span style={{ color:'#f59e0b' }}>Sin asignar</span>}
                        </td>
                        <td><Badge estado={ins.estado} /></td>
                        <td className="p-td-muted">
                          {ins.concepto_tecnico
                            ? <span style={{ fontSize:'0.75rem' }}>{ins.concepto_tecnico.replace(/_/g,' ')}</span>
                            : <span style={{ color:'#d1d5db' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .p-tabs { display:flex; gap:.25rem; border-bottom:2px solid #e5e9f0; margin-bottom:1.25rem; }
        .p-tab  {
          display:flex; align-items:center; gap:.5rem;
          padding:.65rem 1.25rem; font-size:.855rem; font-weight:600;
          color:#6b7280; background:none; border:none;
          border-bottom:2px solid transparent; margin-bottom:-2px;
          cursor:pointer; font-family:inherit; transition:color .15s,border-color .15s;
        }
        .p-tab svg { width:15px; height:15px; }
        .p-tab:hover { color:#374151; }
        .p-tab--active { color:#2e7d52; border-bottom-color:#2e7d52; }
      `}</style>
    </div>
  )
}