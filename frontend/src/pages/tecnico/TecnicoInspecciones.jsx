import { useState, useEffect, useCallback } from 'react'
import { tecnicoAPI } from '../../services/api'

const S = { fill:'none', stroke:'currentColor', strokeWidth:'1.8', strokeLinecap:'round', strokeLinejoin:'round' }
const IcoX      = () => <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck  = () => <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg>
const IcoPlay   = () => <svg viewBox="0 0 24 24" {...S}><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IcoClip   = () => <svg viewBox="0 0 24 24" {...S}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
const IcoEmpty  = () => <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>

const ESTADO_LABEL = {
  pendiente:   'Pendiente',
  en_proceso:  'En proceso',
  completada:  'Completada',
  cancelada:   'Cancelada',
}
const ESTADO_COLOR = {
  pendiente:  { bg: '#fff8e1', color: '#b45309', border: '#fcd34d' },
  en_proceso: { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  completada: { bg: '#e8f5ee', color: '#2e7d52', border: '#6ee7b7' },
  cancelada:  { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
}

function Badge({ estado }) {
  const s = ESTADO_COLOR[estado] || { bg:'#f3f4f6', color:'#374151', border:'#d1d5db' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {ESTADO_LABEL[estado] || estado}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:'14px', width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.125rem 1.5rem', borderBottom:'1px solid #e5e9f0' }}>
          <h3 style={{ margin:0, fontSize:'1rem', color:'#1e2a4a', fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4, display:'flex', borderRadius:6 }}>
            <IcoX />
          </button>
        </div>
        <div style={{ padding:'1.5rem' }}>{children}</div>
      </div>
    </div>
  )
}

export default function TecnicoInspecciones() {
  const [inspecciones, setInspecciones]   = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [toast, setToast]                 = useState(null)
  const [filtro, setFiltro]               = useState('todas') // todas | pendiente | en_proceso

  // Modal completar
  const [modalCompletar, setModalCompletar] = useState(null)
  const [formCompletar, setFormCompletar]   = useState({ observaciones_generales: '', recomendaciones: '', concepto_tecnico: '' })
  const [errCompletar, setErrCompletar]     = useState({})
  const [procesando, setProcesando]         = useState(false)

  const toast_ = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = filtro !== 'todas' ? { estado: filtro } : {}
      const res = await tecnicoAPI.misInspecciones(params)
      setInspecciones(res.data || [])
    } catch {
      setError('No se pudieron cargar las inspecciones. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const handleIniciar = async (insp) => {
    setProcesando(true)
    try {
      await tecnicoAPI.iniciar(insp.id)
      toast_('Inspección iniciada correctamente')
      cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al iniciar la inspección', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const abrirCompletar = (insp) => {
    setFormCompletar({ observaciones_generales: '', recomendaciones: '', concepto_tecnico: '' })
    setErrCompletar({})
    setModalCompletar(insp)
  }

  const handleCompletar = async () => {
    const errs = {}
    if (!formCompletar.concepto_tecnico.trim()) errs.concepto_tecnico = 'El concepto técnico es obligatorio'
    if (Object.keys(errs).length) { setErrCompletar(errs); return }

    setProcesando(true)
    try {
      await tecnicoAPI.completar(modalCompletar.id, formCompletar)
      toast_('Inspección completada exitosamente')
      setModalCompletar(null)
      cargar()
    } catch (e) {
      toast_(e?.response?.data?.message || 'Error al completar la inspección', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  return (
    <section style={{ maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:'1.5rem', right:'1.5rem', zIndex:500,
          background: toast.type === 'error' ? '#fef2f2' : '#e8f5ee',
          color:      toast.type === 'error' ? '#b91c1c' : '#2e7d52',
          border:     `1px solid ${toast.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
          borderRadius:12, padding:'0.75rem 1.25rem', fontSize:'0.85rem',
          boxShadow:'0 4px 20px rgba(0,0,0,0.12)', display:'flex', alignItems:'center', gap:'0.5rem',
        }}>
          {toast.type === 'error' ? <IcoX /> : <IcoCheck />} {toast.msg}
        </div>
      )}

      {/* Encabezado */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h2 style={{ margin:'0 0 0.25rem', fontSize:'1.35rem', color:'#1e2a4a', fontWeight:800 }}>
          Mis Inspecciones
        </h2>
        <p style={{ margin:0, fontSize:'0.85rem', color:'#6b7280' }}>
          Inspecciones fitosanitarias asignadas a ti — pendientes y en proceso
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        {[['todas', 'Todas'], ['pendiente', 'Pendientes'], ['en_proceso', 'En proceso']].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFiltro(val)}
            style={{
              padding:'0.4rem 1rem', borderRadius:20, border:'1.5px solid',
              cursor:'pointer', fontSize:'0.8rem', fontWeight:600, transition:'all 0.15s',
              background:   filtro === val ? '#3b4fa8' : '#fff',
              color:        filtro === val ? '#fff'    : '#3b4fa8',
              borderColor:  filtro === val ? '#3b4fa8' : '#c5cdf0',
            }}
          >
            {lbl}
          </button>
        ))}
        <button
          onClick={cargar}
          style={{ marginLeft:'auto', padding:'0.4rem 1rem', borderRadius:20, border:'1.5px solid #e5e9f0', background:'#fff', cursor:'pointer', fontSize:'0.8rem', color:'#6b7280', fontWeight:600 }}
        >
          Actualizar
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#9ca3af', fontSize:'0.9rem' }}>Cargando inspecciones…</div>
      ) : error ? (
        <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'1.25rem', color:'#b91c1c', fontSize:'0.875rem' }}>{error}</div>
      ) : inspecciones.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#9ca3af' }}>
          <IcoEmpty />
          <p style={{ marginTop:'0.75rem', fontSize:'0.9rem' }}>No tienes inspecciones {filtro !== 'todas' ? `en estado "${ESTADO_LABEL[filtro]}"` : 'asignadas'} en este momento.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {inspecciones.map(insp => (
            <article key={insp.id} style={{
              background:'#fff', borderRadius:12, border:'1.5px solid #e5e9f0',
              padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem',
              boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, color:'#1e2a4a', fontSize:'0.95rem' }}>
                      Inspección #{insp.id}
                    </span>
                    <Badge estado={insp.estado} />
                  </div>
                  <div style={{ marginTop:'0.4rem', fontSize:'0.8rem', color:'#6b7280', display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                    <span>📍 Lugar #{insp.lugar_produccion_id}</span>
                    <span>📅 Solicitada: {fmtFecha(insp.fecha_solicitud)}</span>
                    {insp.fecha_inicio  && <span>▶ Iniciada: {fmtFecha(insp.fecha_inicio)}</span>}
                    {insp.fecha_cierre  && <span>✅ Cerrada: {fmtFecha(insp.fecha_cierre)}</span>}
                  </div>
                </div>

                <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                  {insp.estado === 'pendiente' && (
                    <button
                      disabled={procesando}
                      onClick={() => handleIniciar(insp)}
                      style={{
                        display:'flex', alignItems:'center', gap:'0.4rem',
                        padding:'0.45rem 1rem', borderRadius:8, border:'none', cursor:'pointer',
                        background:'#3b4fa8', color:'#fff', fontSize:'0.8rem', fontWeight:600,
                        opacity: procesando ? 0.6 : 1,
                      }}
                    >
                      <IcoPlay /> Iniciar
                    </button>
                  )}
                  {insp.estado === 'en_proceso' && (
                    <button
                      disabled={procesando}
                      onClick={() => abrirCompletar(insp)}
                      style={{
                        display:'flex', alignItems:'center', gap:'0.4rem',
                        padding:'0.45rem 1rem', borderRadius:8, border:'none', cursor:'pointer',
                        background:'#2e7d52', color:'#fff', fontSize:'0.8rem', fontWeight:600,
                        opacity: procesando ? 0.6 : 1,
                      }}
                    >
                      <IcoClip /> Completar
                    </button>
                  )}
                </div>
              </div>

              {(insp.observaciones_generales || insp.recomendaciones || insp.concepto_tecnico) && (
                <div style={{ borderTop:'1px solid #f0f2f5', paddingTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                  {insp.observaciones_generales && (
                    <p style={{ margin:0, fontSize:'0.82rem', color:'#374151' }}>
                      <strong>Observaciones:</strong> {insp.observaciones_generales}
                    </p>
                  )}
                  {insp.recomendaciones && (
                    <p style={{ margin:0, fontSize:'0.82rem', color:'#374151' }}>
                      <strong>Recomendaciones:</strong> {insp.recomendaciones}
                    </p>
                  )}
                  {insp.concepto_tecnico && (
                    <p style={{ margin:0, fontSize:'0.82rem', color:'#2e7d52', fontWeight:600 }}>
                      <strong>Concepto técnico:</strong> {insp.concepto_tecnico}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Modal Completar */}
      {modalCompletar && (
        <Modal title={`Completar Inspección #${modalCompletar.id}`} onClose={() => setModalCompletar(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:'0.35rem' }}>
                Observaciones generales
              </label>
              <textarea
                rows={3}
                value={formCompletar.observaciones_generales}
                onChange={e => setFormCompletar(p => ({ ...p, observaciones_generales: e.target.value }))}
                placeholder="Describe las condiciones generales observadas en el lugar..."
                style={{ width:'100%', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.6rem 0.75rem', fontSize:'0.85rem', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:'0.35rem' }}>
                Recomendaciones
              </label>
              <textarea
                rows={3}
                value={formCompletar.recomendaciones}
                onChange={e => setFormCompletar(p => ({ ...p, recomendaciones: e.target.value }))}
                placeholder="Acciones recomendadas para el productor..."
                style={{ width:'100%', borderRadius:8, border:'1.5px solid #d1d5db', padding:'0.6rem 0.75rem', fontSize:'0.85rem', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'#374151', marginBottom:'0.35rem' }}>
                Concepto técnico <span style={{ color:'#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={formCompletar.concepto_tecnico}
                onChange={e => setFormCompletar(p => ({ ...p, concepto_tecnico: e.target.value }))}
                placeholder="Concepto técnico final de la inspección (obligatorio)..."
                style={{
                  width:'100%', borderRadius:8, padding:'0.6rem 0.75rem', fontSize:'0.85rem',
                  resize:'vertical', boxSizing:'border-box', fontFamily:'inherit',
                  border: `1.5px solid ${errCompletar.concepto_tecnico ? '#dc2626' : '#d1d5db'}`,
                }}
              />
              {errCompletar.concepto_tecnico && (
                <p style={{ margin:'0.25rem 0 0', fontSize:'0.75rem', color:'#dc2626' }}>{errCompletar.concepto_tecnico}</p>
              )}
            </div>

            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end', paddingTop:'0.5rem' }}>
              <button
                onClick={() => setModalCompletar(null)}
                style={{ padding:'0.5rem 1.25rem', borderRadius:8, border:'1.5px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:'0.85rem', fontWeight:600, color:'#374151' }}
              >
                Cancelar
              </button>
              <button
                disabled={procesando}
                onClick={handleCompletar}
                style={{
                  display:'flex', alignItems:'center', gap:'0.4rem',
                  padding:'0.5rem 1.25rem', borderRadius:8, border:'none', cursor:'pointer',
                  background:'#2e7d52', color:'#fff', fontSize:'0.85rem', fontWeight:600,
                  opacity: procesando ? 0.6 : 1,
                }}
              >
                <IcoCheck /> {procesando ? 'Guardando…' : 'Completar inspección'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
