import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { productionAPI, inspeccionesAPI, lotesAPI, authAPI } from '../../services/api'
import './productor.css'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoSend  = () => <svg viewBox="0 0 24 24" {...S}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IcoCheck = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoAlert = () => <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IcoInfo  = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
const IcoClip  = () => <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
const IcoClock = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IcoClose = () => <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

function Badge({ estado }) {
  const m = { pendiente:'pendiente', en_proceso:'proceso', completada:'completada', inactivo:'inactivo' }
  const t = { pendiente:'Pendiente', en_proceso:'En Proceso', completada:'Completada', inactivo:'Inactivo' }
  return <span className={`p-badge p-badge--${m[estado] || 'inactivo'}`}>{t[estado] || estado}</span>
}

export default function SolicitarInspeccion() {
  const location = useLocation()
  const [tab, setTab] = useState(location.pathname.includes('historial') ? 'historial' : 'solicitar')
  const [lugares, setLugares]             = useState([])
  const [lugarSel, setLugarSel]           = useState('')
  const [lotesActivos, setLotesActivos]   = useState([])
  const [loteSel, setLoteSel]             = useState('')
  const [fecha, setFecha]                 = useState('')
  const [loadLugares, setLoadLugares]     = useState(true)
  const [loadLotes, setLoadLotes]         = useState(false)
  const [procesando, setProcesando]       = useState(false)
  const [toast, setToast]                 = useState(null)
  const [validacionLote, setValidacionLote] = useState(null)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [ultimoResultado, setUltimoResultado] = useState(null)
  const [inspecciones, setInspecciones]   = useState([])
  const [loadInsp, setLoadInsp]           = useState(false)
  const [filtroEstado, setFiltroEstado]   = useState('')
  const [tecnicosMap, setTecnicosMap]     = useState({})
  const [lotesMap, setLotesMap]           = useState({})

  const hoy = new Date().toISOString().split('T')[0]
  const lugarSeleccionado = lugares.find(l => String(l.id) === String(lugarSel))
  const loteSeleccionado  = lotesActivos.find(l => String(l.id) === String(loteSel))

  const toast_ = (msg, tipo = 'ok') => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    productionAPI.getAll().then(r => setLugares(r.data || [])).catch(() => {}).finally(() => setLoadLugares(false))
  }, [])

  useEffect(() => {
    setLoteSel(''); setValidacionLote(null); setLotesActivos([])
    if (!lugarSel) return
    setLoadLotes(true)
    lotesAPI.getByLugar(lugarSel)
      .then(r => setLotesActivos((r.data || []).filter(l => l.estado === 'activo')))
      .catch(() => {}).finally(() => setLoadLotes(false))
  }, [lugarSel])

  useEffect(() => {
    setValidacionLote(null)
    if (!loteSel) return
    inspeccionesAPI.misSolicitudes().then(r => {
      const activa = (r.data || []).find(i =>
        String(i.lote_id) === String(loteSel) && ['pendiente', 'en_proceso'].includes(i.estado)
      )
      if (activa) {
        setValidacionLote({ tipo: 'warn', mensaje: `Este lote ya tiene una inspeccion en estado "${activa.estado}". Espera a que finalice.` })
      } else {
        setValidacionLote({ tipo: 'ok', mensaje: `Lote ${loteSeleccionado?.codigo || ''} disponible para inspeccion.` })
      }
    }).catch(() => {})
  }, [loteSel]) // eslint-disable-line react-hooks/exhaustive-deps

  const puedeEnviar = validacionLote?.tipo === 'ok' && lugarSel && loteSel && fecha && fecha >= hoy

  const confirmarYEnviarSolicitud = async () => {
    if (!puedeEnviar) return
    setProcesando(true)
    try {
      const res = await inspeccionesAPI.solicitar({ lote_id: parseInt(loteSel), fecha_solicitada: fecha })
      toast_(res.data.message || 'Solicitud enviada correctamente.')
      setUltimoResultado({
        lugar:        lugarSeleccionado?.nombre || '-',
        lote_codigo:  loteSeleccionado?.codigo  || `Lote #${loteSel}`,
        municipio:    lugarSeleccionado?.municipio    || '-',
        departamento: lugarSeleccionado?.departamento || '-',
        pendiente_asignacion: Boolean(res.data?.pendiente_asignacion),
      })
      setFecha(''); setLugarSel(''); setLoteSel(''); setValidacionLote(null); setShowConfirm(false)
      setTab('historial')
    } catch (err) {
      toast_(err.response?.data?.message || 'Error al enviar solicitud.', 'error')
    } finally { setProcesando(false) }
  }

  const cargarHistorial = useCallback(async () => {
    setLoadInsp(true)
    try {
      const params = {}; if (filtroEstado) params.estado = filtroEstado
      const [inspRes, tecRes] = await Promise.all([inspeccionesAPI.misSolicitudes(params), authAPI.getTecnicos()])
      const lista = inspRes.data || []
      setInspecciones(lista)
      const tMap = {}; for (const t of (tecRes.data || [])) tMap[t.id] = t.nombre_completo
      setTecnicosMap(tMap)
      const ids = [...new Set(lista.map(i => i.lote_id).filter(Boolean))]
      if (ids.length > 0) {
        const results = await Promise.allSettled(ids.map(id => lotesAPI.getById(id)))
        const lMap = {}
        results.forEach(r => { if (r.status === 'fulfilled' && r.value?.data) lMap[r.value.data.id] = r.value.data.codigo })
        setLotesMap(lMap)
      }
    } catch { setInspecciones([]) }
    finally { setLoadInsp(false) }
  }, [filtroEstado])

  useEffect(() => { if (tab === 'historial') cargarHistorial() }, [tab, cargarHistorial])

  const lugarNombre = (id) => lugares.find(l => String(l.id) === String(id))?.nombre || `Lugar #${id}`
  const loteNombre  = (id) => lotesMap[id] ? `Lote ${lotesMap[id]}` : (id ? `Lote #${id}` : '-')

  return (
    <div>
      {toast && (
        <div className={`p-toast p-toast--${toast.tipo}`}>
          {toast.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />} {toast.msg}
        </div>
      )}

      <div className="ph-header"><h2>Inspecciones</h2><p>Solicite nuevas inspecciones y consulte su historial.</p></div>

      <div className="p-tabs">
        <button className={`p-tab ${tab === 'solicitar' ? 'p-tab--active' : ''}`} onClick={() => setTab('solicitar')}>
          <IcoClip /> Solicitar inspeccion
        </button>
        <button className={`p-tab ${tab === 'historial' ? 'p-tab--active' : ''}`} onClick={() => setTab('historial')}>
          <IcoClock /> Historial de solicitudes
        </button>
      </div>

      {tab === 'solicitar' && (
        <div className="p-section">
          <div className="p-section__header">
            <div><h3>Nueva solicitud de inspeccion</h3><p>Seleccione el lugar, el lote y la fecha deseada.</p></div>
          </div>
          <div className="p-section__body">
            {ultimoResultado && (
              <div className="p-alert p-alert--success" style={{ marginBottom: '1rem' }}>
                <IcoCheck />
                <span>
                  Solicitud registrada para el lote <strong>{ultimoResultado.lote_codigo}</strong> de{' '}
                  <strong>{ultimoResultado.lugar}</strong> ({ultimoResultado.municipio} - {ultimoResultado.departamento}).{' '}
                  {ultimoResultado.pendiente_asignacion ? 'Pendiente de asignacion de tecnico.' : 'Tecnico asignado automaticamente.'}
                </span>
              </div>
            )}
            <div className="p-form-grid">
              <div className="p-form-group">
                <label className="p-label">Lugar de produccion *</label>
                {loadLugares ? (
                  <span className="p-td-muted"><span className="p-spinner p-spinner--sm" /> Cargando...</span>
                ) : (
                  <select className="p-input" value={lugarSel} onChange={e => setLugarSel(e.target.value)}>
                    <option value="">Seleccione un lugar...</option>
                    {lugares.map(l => <option key={l.id} value={l.id}>{l.nombre} - {l.municipio}</option>)}
                  </select>
                )}
              </div>
              <div className="p-form-group">
                <label className="p-label">Fecha deseada *</label>
                <input className="p-input" type="date" value={fecha} min={hoy} onChange={e => setFecha(e.target.value)} />
                <span className="p-hint">La fecha no puede ser anterior a hoy.</span>
              </div>
              <div className="p-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="p-label">Lote a inspeccionar *</label>
                {loadLotes ? (
                  <span className="p-td-muted"><span className="p-spinner p-spinner--sm" /> Cargando lotes...</span>
                ) : !lugarSel ? (
                  <span className="p-td-muted" style={{ fontSize: '0.83rem' }}>Seleccione un lugar primero.</span>
                ) : lotesActivos.length === 0 ? (
                  <div className="p-alert p-alert--error" style={{ margin: 0 }}>
                    <IcoAlert /> Este lugar no tiene lotes activos.
                  </div>
                ) : (
                  <select className="p-input" value={loteSel} onChange={e => setLoteSel(e.target.value)}>
                    <option value="">Seleccione un lote...</option>
                    {lotesActivos.map(l => <option key={l.id} value={l.id}>{l.codigo} - {l.area_ha} ha</option>)}
                  </select>
                )}
              </div>
            </div>
            {loteSel && validacionLote && (
              <div className={`p-alert p-alert--${validacionLote.tipo === 'ok' ? 'success' : 'warn'}`} style={{ marginTop: '1rem' }}>
                {validacionLote.tipo === 'ok' ? <IcoCheck /> : <IcoAlert />} {validacionLote.mensaje}
              </div>
            )}
            <div className="p-alert p-alert--info" style={{ marginTop: '1rem' }}>
              <IcoInfo />
              <span>El sistema asignara automaticamente un tecnico de la misma zona con menor carga.</span>
            </div>
            <div className="p-form-actions">
              <button className="p-btn p-btn--green" onClick={() => setShowConfirm(true)} disabled={!puedeEnviar || procesando}>
                {procesando ? <><span className="p-spinner p-spinner--sm" /> Enviando...</> : <><IcoSend /> Enviar solicitud</>}
              </button>
              <button className="p-btn p-btn--outline" onClick={() => { setLugarSel(''); setLoteSel(''); setFecha(''); setValidacionLote(null); setUltimoResultado(null) }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'solicitar' && showConfirm && (
        <div className="p-modal-overlay" onClick={() => !procesando && setShowConfirm(false)}>
          <div className="p-modal" onClick={e => e.stopPropagation()}>
            <div className="p-modal__header">
              <h3>Confirmar solicitud de inspeccion</h3>
              <button className="p-modal__close" onClick={() => !procesando && setShowConfirm(false)} aria-label="Cerrar"><IcoClose /></button>
            </div>
            <div className="p-modal__body">
              <div className="p-alert p-alert--info" style={{ margin: 0 }}>
                <IcoInfo />
                <span>
                  <strong>Lugar:</strong> {lugarSeleccionado?.nombre || '-'} ({lugarSeleccionado?.municipio || '-'} - {lugarSeleccionado?.departamento || '-'})<br />
                  <strong>Lote:</strong> {loteSeleccionado?.codigo || '-'} - {loteSeleccionado?.area_ha || '-'} ha<br />
                  <strong>Fecha solicitada:</strong> {fecha || '-'}
                </span>
              </div>
              <div className="p-modal__actions">
                <button className="p-btn p-btn--outline" onClick={() => !procesando && setShowConfirm(false)} disabled={procesando}>Cancelar</button>
                <button className="p-btn p-btn--green" onClick={confirmarYEnviarSolicitud} disabled={procesando}>
                  {procesando ? <><span className="p-spinner p-spinner--sm" /> Confirmando...</> : <><IcoSend /> Confirmar y enviar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="p-empty"><IcoClock /><p>No hay inspecciones{filtroEstado ? ` con estado "${filtroEstado}"` : ''} registradas.</p></div>
            ) : (
              <div className="p-table-wrap">
                <table className="p-table">
                  <thead>
                    <tr>
                      <th>Lugar</th><th>Lote</th><th>Fecha solicitud</th><th>Fecha deseada</th>
                      <th>Tecnico asignado</th><th>Estado</th><th>Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspecciones.map(ins => (
                      <tr key={ins.id}>
                        <td><strong>{lugarNombre(ins.lugar_produccion_id)}</strong></td>
                        <td className="p-td-muted">{loteNombre(ins.lote_id)}</td>
                        <td className="p-td-muted">{ins.fecha_solicitud ? new Date(ins.fecha_solicitud).toLocaleDateString('es-CO') : '-'}</td>
                        <td className="p-td-muted">{ins.fecha_inicio ? new Date(ins.fecha_inicio).toLocaleDateString('es-CO') : '-'}</td>
                        <td className="p-td-muted">
                          {ins.asistente_id
                            ? (tecnicosMap[ins.asistente_id] || `Tecnico #${ins.asistente_id}`)
                            : <span style={{ color: '#f59e0b', fontWeight: 700 }}>Pendiente de asignacion</span>}
                        </td>
                        <td><Badge estado={ins.estado} /></td>
                        <td className="p-td-muted">
                          {ins.concepto_tecnico
                            ? <span style={{ fontSize: '0.75rem' }}>{ins.concepto_tecnico.replace(/_/g, ' ')}</span>
                            : <span style={{ color: '#d1d5db' }}>-</span>}
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
        .p-tab  { display:flex; align-items:center; gap:.5rem; padding:.65rem 1.25rem; font-size:.855rem; font-weight:600; color:#6b7280; background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-2px; cursor:pointer; font-family:inherit; transition:color .15s,border-color .15s; }
        .p-tab svg { width:15px; height:15px; }
        .p-tab:hover { color:#374151; }
        .p-tab--active { color:#2e7d52; border-bottom-color:#2e7d52; }
      `}</style>
    </div>
  )
}
