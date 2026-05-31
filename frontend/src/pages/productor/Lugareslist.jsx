import { useState, useEffect, useCallback } from 'react'
import { prediosAPI, productionAPI } from '../../services/api'
import COLOMBIA_DEPARTAMENTOS from '../../data/colombiaMunicipios'
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
const IcoPin    = () => <svg viewBox="0 0 24 24" {...S}><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>

const FORM_LUGAR_VACIO = { nombre:'', numero_registro_ica:'', area_total_ha:'', predio_ids:[], predio_principal_id:'' }

const normalizePredioText = (value) => String(value || '').trim().toLowerCase()

const normalizeLocationValue = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()

const deduplicatePrediosByUbicacion = (items = []) => {
  const seen = new Set()
  const result = []

  items.forEach((predio) => {
    const key = [
      normalizePredioText(predio?.departamento),
      normalizePredioText(predio?.municipio),
      normalizePredioText(predio?.vereda_direccion),
      Number(predio?.area_ha || 0).toFixed(2),
    ].join('|')

    if (seen.has(key)) return
    seen.add(key)
    result.push(predio)
  })

  return result
}

const mapLugarToForm = (lugar) => ({
  nombre: lugar?.nombre || '',
  numero_registro_ica: lugar?.numero_registro_ica || '',
  area_total_ha: lugar?.area_total_ha || '',
  predio_ids: (lugar?.predios || []).map((predio) => predio.id),
  predio_principal_id: lugar?.predios?.find((predio) => predio.es_principal)?.id || lugar?.predios?.[0]?.id || '',
})

function Badge({ estado }) {
  const map = {
    activo: ['activo', 'Activo'],
    inactivo: ['inactivo', 'Inactivo'],
    pendiente_validacion: ['pendiente', 'Pendiente de validacion'],
    rechazado: ['inactivo', 'Rechazado'],
  }
  const [cls, label] = map[estado] || ['inactivo', estado]
  return <span className={`p-badge p-badge--${cls}`}>{label}</span>
}

function Modal({ title, onClose, children }) {
  return (
    <div className="p-modal-overlay" onClick={onClose}>
      <div className="p-modal" style={{ maxWidth: '760px' }} onClick={e => e.stopPropagation()}>
        <div className="p-modal__header">
          <h3>{title}</h3>
          <button className="p-modal__close" onClick={onClose}><IcoX /></button>
        </div>
        <div className="p-modal__body">{children}</div>
      </div>
    </div>
  )
}

function LugarForm({ inicial, predios, onGuardar, onCancelar, cargando }) {
  const predioInicial = inicial?.predios?.find((p) => p.es_principal) || inicial?.predios?.[0] || null

  const [filterDepto, setFilterDepto]   = useState(predioInicial?.departamento || '')
  const [filterMunic, setFilterMunic]   = useState(predioInicial?.municipio    || '')
  const [selPredioId, setSelPredioId]   = useState(predioInicial?.id           || '')
  const [form, setForm] = useState({
    nombre:             inicial?.nombre             || '',
    numero_registro_ica: inicial?.numero_registro_ica || '',
    area_total_ha:      inicial?.area_total_ha      || '',
    departamento:       inicial?.departamento || predioInicial?.departamento || '',
    municipio:          inicial?.municipio || predioInicial?.municipio || '',
    vereda_direccion:   inicial?.vereda_direccion || predioInicial?.vereda_direccion || '',
    coordenadas_lat:    inicial?.coordenadas_lat ?? predioInicial?.coordenadas_lat ?? 0,
    coordenadas_lng:    inicial?.coordenadas_lng ?? predioInicial?.coordenadas_lng ?? 0,
  })
  const [errores, setErrores] = useState({})

  useEffect(() => {
    const p = inicial?.predios?.find((x) => x.es_principal) || inicial?.predios?.[0] || null
    setFilterDepto(p?.departamento || '')
    setFilterMunic(p?.municipio    || '')
    setSelPredioId(p?.id           || '')
    setForm({
      nombre:              inicial?.nombre             || '',
      numero_registro_ica: inicial?.numero_registro_ica || '',
      area_total_ha:       inicial?.area_total_ha      || '',
      departamento:        inicial?.departamento || p?.departamento || '',
      municipio:           inicial?.municipio || p?.municipio || '',
      vereda_direccion:    inicial?.vereda_direccion || p?.vereda_direccion || '',
      coordenadas_lat:     inicial?.coordenadas_lat ?? p?.coordenadas_lat ?? 0,
      coordenadas_lng:     inicial?.coordenadas_lng ?? p?.coordenadas_lng ?? 0,
    })
    setErrores({})
  }, [inicial])

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  // Colombia cascading options
  const deptoOptions = [...COLOMBIA_DEPARTAMENTOS].sort((a, b) => a.departamento.localeCompare(b.departamento))
  const municOptions = filterDepto
    ? (COLOMBIA_DEPARTAMENTOS.find((d) => d.departamento === filterDepto)?.municipios || []).sort((a, b) => a.localeCompare(b))
    : []

  const prediosFiltrados = deduplicatePrediosByUbicacion(predios.filter((p) => {
    if (filterDepto && normalizeLocationValue(p.departamento) !== normalizeLocationValue(filterDepto)) return false
    if (filterMunic && normalizeLocationValue(p.municipio) !== normalizeLocationValue(filterMunic)) return false
    return true
  }))

  const filtrosCompletos = Boolean(filterDepto && filterMunic)

  const selectedPredio = predios.find((p) => p.id === Number(selPredioId)) || null

  useEffect(() => {
    if (!predios.length || !filtrosCompletos) {
      setSelPredioId('')
      return
    }

    if (!selPredioId && prediosFiltrados.length > 0) {
      setSelPredioId(prediosFiltrados[0].id)
      return
    }

    if (selPredioId && !prediosFiltrados.some((predio) => predio.id === Number(selPredioId))) {
      setSelPredioId(prediosFiltrados[0]?.id || '')
    }
  }, [predios, prediosFiltrados, selPredioId, filtrosCompletos])

  const handleDepto = (val) => { setFilterDepto(val); setFilterMunic(''); setSelPredioId('') }
  const handleMunic = (val) => { setFilterMunic(val); setSelPredioId('') }

  const handleSubmit = () => {
    const nuevosErrores = {}
    if (!form.nombre?.trim()) nuevosErrores.nombre = 'Nombre obligatorio'
    if (!inicial && !form.numero_registro_ica?.trim()) nuevosErrores.numero_registro_ica = 'Registro ICA obligatorio'
    if (!form.area_total_ha || Number(form.area_total_ha) <= 0 || Number.isNaN(Number(form.area_total_ha))) nuevosErrores.area_total_ha = 'Extensión inválida'
    if (!selPredioId) nuevosErrores.predio = 'Selecciona un predio'
    if (inicial && !form.departamento?.trim()) nuevosErrores.departamento = 'Departamento obligatorio'
    if (inicial && !form.municipio?.trim()) nuevosErrores.municipio = 'Municipio obligatorio'
    if (inicial && !form.vereda_direccion?.trim()) nuevosErrores.vereda_direccion = 'Dirección obligatoria'

    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return

    onGuardar({
      ...form,
      predio_ids:          selPredioId ? [Number(selPredioId)] : [],
      predio_principal_id: selPredioId ? Number(selPredioId)   : '',
      departamento: form.departamento || selectedPredio?.departamento || '',
      municipio: form.municipio || selectedPredio?.municipio || '',
      vereda_direccion: form.vereda_direccion || selectedPredio?.vereda_direccion || '',
      coordenadas_lat: form.coordenadas_lat ?? selectedPredio?.coordenadas_lat ?? 0,
      coordenadas_lng: form.coordenadas_lng ?? selectedPredio?.coordenadas_lng ?? 0,
    }, setErrores)
  }

  return (
    <div className="p-form-grid">

      {/* ── Filtro por ubicación ── */}
      <div className="p-form-group p-form-group--full">
        <div className="lugar-filter-box">
          <div className="lugar-filter-box__title"><IcoSearch /> Buscar predio por ubicacion</div>
          <div className="lugar-filter-row">
            <div className="p-form-group" style={{ marginBottom: 0 }}>
              <label className="p-label">Departamento</label>
              <select className="p-input" value={filterDepto} onChange={e => handleDepto(e.target.value)}>
                <option value="">-- Todos los departamentos --</option>
                {deptoOptions.map((d) => (
                  <option key={d.departamento} value={d.departamento}>{d.departamento}</option>
                ))}
              </select>
            </div>
            <div className="p-form-group" style={{ marginBottom: 0 }}>
              <label className="p-label">Municipio / Ciudad</label>
              <select className="p-input" value={filterMunic} onChange={e => handleMunic(e.target.value)} disabled={!filterDepto}>
                <option value="">-- Todos los municipios --</option>
                {municOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="p-hint" style={{ marginTop: '0.75rem', display: 'block' }}>
            Primero selecciona departamento y municipio. Solo entonces se cargan los predios disponibles en esa ubicacion.
          </span>
        </div>
      </div>

      {/* ── Selección del predio ── */}
      <div className="p-form-group p-form-group--full">
        <label className="p-label">Seleccion del predio *</label>
        {predios.length === 0 ? (
          <div className="p-alert p-alert--warn" style={{ marginBottom: 0 }}>
            <IcoAlert /> No hay predios catalogados disponibles para esta cuenta en este momento.
          </div>
        ) : !filtrosCompletos ? (
          <div className="p-alert p-alert--warn" style={{ marginBottom: 0 }}>
            <IcoAlert /> Selecciona primero un departamento y un municipio para ver los predios disponibles.
          </div>
        ) : prediosFiltrados.length === 0 ? (
          <div className="p-alert p-alert--warn" style={{ marginBottom: 0 }}>
            <IcoAlert /> No hay predios catalogados para esa ubicacion.
          </div>
        ) : (
          <div>
            <div className="p-hint" style={{ marginBottom: '0.6rem' }}>
              {prediosFiltrados.length} predio{prediosFiltrados.length !== 1 ? 's' : ''} disponible{prediosFiltrados.length !== 1 ? 's' : ''} para asociar.
            </div>
            <div className="predios-radio-list">
            {prediosFiltrados.map((predio) => {
              const activo = Number(selPredioId) === predio.id
              return (
                <label key={predio.id} className={`predio-option ${activo ? 'predio-option--active' : ''}`} style={{ cursor: 'pointer' }}>
                  <div className="predio-option__main">
                    <input
                      type="radio"
                      name="predio_select_lugar"
                      value={predio.id}
                      checked={activo}
                      onChange={() => setSelPredioId(predio.id)}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong>{predio.nombre_identificacion}</strong>
                      <span>{predio.municipio}, {predio.departamento}</span>
                      <small>{predio.vereda_direccion} &mdash; <b>{predio.area_ha} ha</b> disponibles</small>
                    </div>
                  </div>
                </label>
              )
            })}
            </div>
          </div>
        )}
        {errores.predio ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.predio}</span> : null}
      </div>

      {/* ── Datos del lugar ── */}
      <div className="p-form-group">
        <label className="p-label">Nombre del lugar de produccion *</label>
        <input className="p-input" style={errores.nombre ? { borderColor: '#dc2626' } : undefined} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Lugar de Produccion San Isidro" />
        {errores.nombre ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.nombre}</span> : null}
      </div>
      <div className="p-form-group">
        <label className="p-label">Numero de registro ICA *</label>
        <input className="p-input" style={errores.numero_registro_ica ? { borderColor: '#dc2626' } : undefined} value={form.numero_registro_ica} onChange={e => set('numero_registro_ica', e.target.value)} placeholder="Ej: ICA-2026-001" disabled={!!inicial} />
        {inicial && <span className="p-hint">El numero de registro ICA no puede modificarse.</span>}
        {errores.numero_registro_ica ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.numero_registro_ica}</span> : null}
      </div>
      <div className="p-form-group">
        <label className="p-label">Hectareas destinadas para produccion *</label>
        <input
          className="p-input"
          style={errores.area_total_ha ? { borderColor: '#dc2626' } : undefined}
          type="number" min="0.01" step="0.01"
          value={form.area_total_ha}
          onChange={e => set('area_total_ha', e.target.value)}
          placeholder="0.00"
        />
        {selectedPredio
          ? <span className="p-hint">La suma de todos los lugares de este predio no puede superar las {selectedPredio.area_ha} ha totales del predio.</span>
          : <span className="p-hint">Selecciona un predio para ver el limite disponible.</span>}
        {errores.area_total_ha ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.area_total_ha}</span> : null}
      </div>

      {/* ── Ubicación automática ── */}
      <div className="p-form-group p-form-group--full">
        <label className="p-label">Ubicacion (derivada automaticamente del predio seleccionado)</label>
        {selectedPredio ? (
          <div className="ubicacion-derivada">
            <div><strong>Predio:</strong> {selectedPredio.nombre_identificacion}</div>
            <div><strong>Departamento:</strong> {selectedPredio.departamento}</div>
            <div><strong>Municipio:</strong> {selectedPredio.municipio}</div>
            <div><strong>Vereda / Referencia:</strong> {selectedPredio.vereda_direccion}</div>
          </div>
        ) : (
          <span className="p-hint">Selecciona un predio para ver la ubicacion automatica.</span>
        )}
      </div>

      {inicial && (
        <>
          <div className="p-form-group">
            <label className="p-label">Departamento (editable)</label>
            <select className="p-input" style={errores.departamento ? { borderColor: '#dc2626' } : undefined} value={form.departamento} onChange={e => set('departamento', e.target.value)}>
              <option value="">-- Selecciona departamento --</option>
              {deptoOptions.map((d) => (
                <option key={d.departamento} value={d.departamento}>{d.departamento}</option>
              ))}
            </select>
            {errores.departamento ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.departamento}</span> : null}
          </div>
          <div className="p-form-group">
            <label className="p-label">Municipio (editable)</label>
            <select className="p-input" style={errores.municipio ? { borderColor: '#dc2626' } : undefined} value={form.municipio} onChange={e => set('municipio', e.target.value)} disabled={!form.departamento}>
              <option value="">-- Selecciona municipio --</option>
              {(COLOMBIA_DEPARTAMENTOS.find((d) => d.departamento === form.departamento)?.municipios || []).sort((a, b) => a.localeCompare(b)).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errores.municipio ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.municipio}</span> : null}
          </div>
          <div className="p-form-group p-form-group--full">
            <label className="p-label">Direccion de referencia (editable)</label>
            <input className="p-input" style={errores.vereda_direccion ? { borderColor: '#dc2626' } : undefined} value={form.vereda_direccion} onChange={e => set('vereda_direccion', e.target.value)} />
            {errores.vereda_direccion ? <span className="p-hint" style={{ color: '#dc2626' }}>{errores.vereda_direccion}</span> : null}
          </div>
          <div className="p-form-group">
            <label className="p-label">Coordenada latitud (editable)</label>
            <input className="p-input" type="number" step="0.00000001" value={form.coordenadas_lat} onChange={e => set('coordenadas_lat', e.target.value)} />
          </div>
          <div className="p-form-group">
            <label className="p-label">Coordenada longitud (editable)</label>
            <input className="p-input" type="number" step="0.00000001" value={form.coordenadas_lng} onChange={e => set('coordenadas_lng', e.target.value)} />
          </div>
        </>
      )}

      <div className="p-form-group p-form-group--full">
        <div className="p-form-actions" style={{ marginTop: 0 }}>
          <button className="p-btn p-btn--green" onClick={handleSubmit} disabled={cargando || !filtrosCompletos || !selPredioId || predios.length === 0}>
            {cargando ? <><span className="p-spinner p-spinner--sm" /> Guardando...</> : <><IcoCheck /> Guardar lugar</>}
          </button>
          <button className="p-btn p-btn--outline" onClick={onCancelar} disabled={cargando}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function resolverNombrePredioPrincipal(lugar, prediosCatalogo = []) {
  if (lugar?.predio_principal) return lugar.predio_principal

  const porRelacion = lugar?.predios?.find((predio) => predio.es_principal) || lugar?.predios?.[0]
  if (porRelacion?.nombre_identificacion) return porRelacion.nombre_identificacion

  const porUbicacion = prediosCatalogo.find((predio) => (
    predio.departamento === lugar?.departamento
    && predio.municipio === lugar?.municipio
    && predio.vereda_direccion === lugar?.vereda_direccion
  ))

  return porUbicacion?.nombre_identificacion || '—'
}

function DetalleModal({ lugar, prediosCatalogo, onClose }) {
  const nombrePredioPrincipal = resolverNombrePredioPrincipal(lugar, prediosCatalogo)

  return (
    <Modal title={lugar.nombre} onClose={onClose}>
      <div className="lugar-detalle">
        <div className="lugar-detalle__grid">
          {[
            ['Registro ICA', lugar.numero_registro_ica],
            ['Estado', lugar.estado],
            ['Area total', `${lugar.area_total_ha} ha`],
            ['Predio principal', nombrePredioPrincipal],
            ['Departamento', lugar.departamento],
            ['Municipio', lugar.municipio],
            ['Direccion de referencia', lugar.vereda_direccion],
            ['Fecha registro', lugar.fecha_registro ? new Date(lugar.fecha_registro).toLocaleDateString('es-CO') : '—'],
            ['Ultima inspeccion', lugar.fecha_ultima_inspeccion ? new Date(lugar.fecha_ultima_inspeccion).toLocaleDateString('es-CO') : 'Sin inspecciones'],
            ['Proxima sugerida', lugar.fecha_proxima_inspeccion ? new Date(lugar.fecha_proxima_inspeccion).toLocaleDateString('es-CO') : '—'],
          ].map(([key, value]) => (
            <div key={key} className="lugar-meta-item">
              <div className="lugar-meta-label">{key}</div>
              <div className="lugar-meta-val">{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
            Predios asociados ({lugar.predios?.length || 0})
          </div>
          {!(lugar.predios?.length) ? (
            <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Sin predios asociados.</p>
          ) : (
            <div className="predios-detalle-grid">
              {lugar.predios.map((predio) => (
                <div key={predio.id} className="predio-card-detalle">
                  <div className="predio-card-detalle__head">
                    <strong>{predio.nombre_identificacion}</strong>
                    {predio.es_principal ? <span className="p-badge p-badge--proceso">Principal</span> : null}
                  </div>
                  <div>{predio.municipio}, {predio.departamento}</div>
                  <small>{predio.vereda_direccion}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
            Lotes asociados ({lugar.lotes?.length || 0})
          </div>
          {!(lugar.lotes?.length) ? (
            <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Sin lotes registrados.</p>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead><tr><th>Codigo</th><th>Area (ha)</th><th>Estado</th><th>Cultivo</th></tr></thead>
                <tbody>
                  {lugar.lotes.map((lote) => (
                    <tr key={lote.id}>
                      <td><strong>{lote.codigo}</strong></td>
                      <td className="p-td-muted">{lote.area_ha} ha</td>
                      <td><Badge estado={lote.estado} /></td>
                      <td className="p-td-muted">{lote.cultivo_variedad || 'Sin cultivo activo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem' }}>
            Historial de inspecciones ({lugar.inspecciones?.length || 0})
          </div>
          {!(lugar.inspecciones?.length) ? (
            <p style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Sin inspecciones registradas.</p>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead><tr><th>ID</th><th>Fecha solicitud</th><th>Estado</th><th>Informe</th></tr></thead>
                <tbody>
                  {lugar.inspecciones.map((insp) => (
                    <tr key={insp.id}>
                      <td><strong>#{insp.id}</strong></td>
                      <td className="p-td-muted">{insp.fecha_solicitud ? new Date(insp.fecha_solicitud).toLocaleDateString('es-CO') : '—'}</td>
                      <td><Badge estado={insp.estado} /></td>
                      <td className="p-td-muted">
                        {insp.enlace_informe
                          ? <a href={insp.enlace_informe} target="_blank" rel="noreferrer">Ver informe</a>
                          : `Inspeccion ${insp.id}`}
                      </td>
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
  const [lugares, setLugares] = useState([])
  const [predios, setPredios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const toast_ = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    const parseError = (err) => {
      const status = err?.response?.status
      const backendMsg = err?.response?.data?.message
      if (backendMsg) return backendMsg
      if (status === 401 || status === 403) return 'Tu sesion ya no es valida. Ingresa de nuevo para cargar lugares y predios.'
      return 'Error de conexion con el servicio.'
    }

    try {
      const [lugaresRes, prediosRes] = await Promise.allSettled([productionAPI.getAll(), prediosAPI.getAll()])

      if (lugaresRes.status === 'fulfilled') {
        setLugares(lugaresRes.value.data || [])
      } else {
        setLugares([])
        setError(parseError(lugaresRes.reason))
      }

      if (prediosRes.status === 'fulfilled') {
        setPredios(deduplicatePrediosByUbicacion(prediosRes.value.data || []))
      } else {
        setPredios([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirDetalle = async (lugar) => {
    try {
      const res = await productionAPI.getById(lugar.id)
      setDetalle(res.data)
    } catch {
      toast_('No se pudo cargar el detalle del lugar.', 'error')
    }
  }

  const guardarNuevoLugar = async (form, setErrores) => {
    if (!form.nombre || !form.numero_registro_ica || !form.area_total_ha || !form.predio_ids.length) {
      toast_('Completa los campos obligatorios del lugar y selecciona un predio.', 'error')
      return
    }

    if (parseFloat(form.area_total_ha) <= 0) {
      toast_('El area total debe ser mayor a cero.', 'error')
      return
    }

    const predio = predios.find((p) => p.id === form.predio_ids[0])
    if (predio && parseFloat(form.area_total_ha) > parseFloat(predio.area_ha)) {
      setErrores?.(prev => ({ ...prev, area_total_ha: `Las hectareas del lugar no pueden superar las ${predio.area_ha} ha del predio.` }))
      return
    }

    setProcesando(true)
    try {
      await productionAPI.create(form)
      toast_('Lugar de produccion registrado correctamente.')
      setShowForm(false)
      cargar()
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (/hect[aá]reas|disponible|capacidad/i.test(msg)) {
        setErrores?.(prev => ({ ...prev, area_total_ha: msg }))
      } else {
        toast_(msg || 'No fue posible guardar el lugar. Intenta nuevamente.', 'error')
      }
    } finally {
      setProcesando(false)
    }
  }

  const guardarEdicionLugar = async (form, setErrores) => {
    if (!form.nombre || !form.area_total_ha || !form.predio_ids.length) {
      toast_('El lugar debe conservar nombre, area y al menos un predio asociado.', 'error')
      return
    }

    if (parseFloat(form.area_total_ha) <= 0) {
      toast_('El area total debe ser mayor a cero.', 'error')
      return
    }

    const predio = predios.find((p) => p.id === form.predio_ids[0])
    if (predio && parseFloat(form.area_total_ha) > parseFloat(predio.area_ha)) {
      setErrores?.(prev => ({ ...prev, area_total_ha: `Las hectareas del lugar no pueden superar las ${predio.area_ha} ha del predio.` }))
      return
    }

    setProcesando(true)
    try {
      await productionAPI.update(editando.id, {
        nombre: form.nombre,
        area_total_ha: form.area_total_ha,
        predio_ids: form.predio_ids,
        predio_principal_id: form.predio_principal_id,
        departamento: form.departamento,
        municipio: form.municipio,
        vereda_direccion: form.vereda_direccion,
        coordenadas_lat: form.coordenadas_lat,
        coordenadas_lng: form.coordenadas_lng,
      })
      toast_('Lugar actualizado correctamente.')
      setEditando(null)
      cargar()
    } catch (err) {
      const msg = err.response?.data?.message || ''
      if (/hect[aá]reas|disponible|capacidad/i.test(msg)) {
        setErrores?.(prev => ({ ...prev, area_total_ha: msg }))
      } else {
        toast_(msg || 'No fue posible guardar los cambios. Intenta nuevamente.', 'error')
      }
    } finally {
      setProcesando(false)
    }
  }

  const eliminarLugar = async () => {
    setProcesando(true)
    try {
      await productionAPI.delete(confirmDel.id)
      toast_('Lugar procesado correctamente.')
      setConfirmDel(null)
      cargar()
    } catch (err) {
      toast_(err.response?.data?.message || 'No fue posible completar la operación. Intenta nuevamente.', 'error')
      setConfirmDel(null)
    } finally {
      setProcesando(false)
    }
  }

  const filtrados = lugares.filter((lugar) => {
    const value = busqueda.toLowerCase()
    return !busqueda
      || lugar.nombre?.toLowerCase().includes(value)
      || lugar.municipio?.toLowerCase().includes(value)
      || lugar.departamento?.toLowerCase().includes(value)
      || lugar.vereda_direccion?.toLowerCase().includes(value)
      || lugar.numero_registro_ica?.toLowerCase().includes(value)
      || lugar.estado?.toLowerCase().includes(value)
  })

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
          <p>Registre sus lugares a partir del catalogo interno de predios, filtrando por departamento y municipio.</p>
        </div>
        {!showForm && !editando && (
          <button className="p-btn p-btn--green" onClick={() => setShowForm(true)} disabled={predios.length === 0}>
            <IcoPlus /> Registrar nuevo lugar
          </button>
        )}
      </div>

      {predios.length === 0 && !loading && (
        <div className="p-alert p-alert--warn"><IcoAlert /> El catalogo interno de predios no esta disponible en este momento.</div>
      )}

      {error && <div className="p-alert p-alert--error"><IcoAlert /> {error}</div>}

      {showForm && (
        <div className="p-section" style={{ marginBottom: '1.5rem' }}>
          <div className="p-section__header"><h3>Registrar nuevo lugar</h3></div>
          <div className="p-section__body">
            <LugarForm predios={predios} onGuardar={guardarNuevoLugar} onCancelar={() => setShowForm(false)} cargando={procesando} />
          </div>
        </div>
      )}

      {editando && (
        <div className="p-section" style={{ marginBottom: '1.5rem' }}>
          <div className="p-section__header"><h3>Editar lugar — {editando.nombre}</h3></div>
          <div className="p-section__body">
            <LugarForm inicial={editando} predios={predios} onGuardar={guardarEdicionLugar} onCancelar={() => setEditando(null)} cargando={procesando} />
          </div>
        </div>
      )}

      <div className="p-section">
        <div className="p-section__header">
          <div>
            <h3>Mis lugares registrados</h3>
            <p>{filtrados.length} lugar{filtrados.length !== 1 ? 'es' : ''}</p>
          </div>
          <div className="p-search-box">
            <span className="p-search-icon"><IcoSearch /></span>
            <input placeholder="Buscar por nombre, ubicacion o ICA..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="p-section__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="p-loading"><span className="p-spinner" /> Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-empty"><IcoHome /><p>{busqueda ? 'No se encontraron resultados.' : 'No tiene lugares registrados aun.'}</p></div>
          ) : (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Lugar</th>
                    <th>Ubicacion derivada</th>
                    <th>Registro ICA</th>
                    <th>Predio principal</th>
                    <th>Proxima inspeccion</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((lugar) => {
                    const proxima = lugar.fecha_proxima_inspeccion ? new Date(lugar.fecha_proxima_inspeccion) : null
                    const dias = proxima ? Math.ceil((proxima - new Date()) / 86400000) : null
                    const proximaCls = dias !== null && dias <= 0 ? 'p-inci-alto' : dias !== null && dias <= 7 ? 'p-inci-medio' : ''
                    const nombrePredioPrincipal = resolverNombrePredioPrincipal(lugar, predios)
                    return (
                      <tr key={lugar.id}>
                        <td><strong>{lugar.nombre}</strong></td>
                        <td className="p-td-muted">{lugar.municipio}, {lugar.departamento}</td>
                        <td className="p-td-muted">{lugar.numero_registro_ica}</td>
                        <td className="p-td-muted">{nombrePredioPrincipal}</td>
                        <td>
                          {proxima
                            ? <span className={proximaCls}>{proxima.toLocaleDateString('es-CO')}{dias !== null && dias <= 7 && dias >= 0 ? ` (${dias}d)` : ''}</span>
                            : <span className="p-td-muted">—</span>}
                        </td>
                        <td><Badge estado={lugar.estado} /></td>
                        <td>
                          <div className="p-actions">
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={() => abrirDetalle(lugar)} title="Ver detalle"><IcoEye /></button>
                            <button className="p-btn p-btn--outline p-btn--sm" onClick={async () => {
                              try {
                                const res = await productionAPI.getById(lugar.id)
                                setEditando(res.data)
                                setShowForm(false)
                              } catch {
                                toast_('No se pudo cargar el lugar para edicion.', 'error')
                              }
                            }} title="Editar"><IcoEdit /></button>
                            <button className="p-btn p-btn--danger p-btn--sm" onClick={() => setConfirmDel(lugar)} title="Eliminar"><IcoTrash /></button>
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

      {detalle && <DetalleModal lugar={detalle} prediosCatalogo={predios} onClose={() => setDetalle(null)} />}

      {confirmDel && (
        <Modal title="Confirmar eliminacion" onClose={() => setConfirmDel(null)}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.55 }}>
            ¿Esta seguro de que desea eliminar <strong>{confirmDel.nombre}</strong>? Si tiene lotes o inspecciones asociados, el sistema lo dejara en estado inactivo para trazabilidad.
          </p>
          <div className="p-modal__actions">
            <button className="p-btn p-btn--outline" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button className="p-btn p-btn--danger" onClick={eliminarLugar} disabled={procesando}>
              {procesando ? <><span className="p-spinner p-spinner--sm" /> Eliminando...</> : <><IcoTrash /> Confirmar</>}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .lugar-detalle__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .lugar-meta-item { background: #f8fafc; border-radius: 7px; padding: 0.65rem 0.875rem; }
        .lugar-meta-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
        .lugar-meta-val { font-size: 0.875rem; font-weight: 600; color: #374151; margin-top: 2px; }
        .predios-detalle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.8rem; }
        .predio-card-detalle { border: 1px solid #e5e9f0; border-radius: 10px; padding: 0.85rem; background: #f8fafc; }
        .predio-card-detalle--list { background: #fff; }
        .predio-card-detalle__head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
        .predio-card-detalle small { display: block; margin-top: 0.2rem; color: #6b7280; }
        .predios-radio-list { display: grid; gap: 0.75rem; max-height: 280px; overflow-y: auto; padding: 0.25rem 0.1rem; }
        .predio-option { border: 1px solid #dbe2ea; border-radius: 10px; padding: 0.8rem; display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; }
        .lugar-filter-box { border: 1px solid #dbe2ea; border-radius: 10px; padding: 0.9rem 1rem; background: #f8fbff; }
        .lugar-filter-box__title { font-size: 0.8rem; font-weight: 700; color: #374151; display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.75rem; }
        .lugar-filter-box__title svg { width: 15px; height: 15px; }
        .lugar-filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        @media (max-width: 560px) { .lugar-filter-row { grid-template-columns: 1fr; } }
        .predio-option--active { border-color: #2e7d52; background: #f7fbf8; }
        .predio-option__main { display: flex; align-items: flex-start; gap: 0.75rem; }
        .predio-option__main input { margin-top: 0.25rem; }
        .predio-option__main strong { display: block; font-size: 0.86rem; color: #1f2937; }
        .predio-option__main span { display: block; font-size: 0.8rem; color: #475569; margin-top: 0.12rem; }
        .predio-option__main small { display: block; font-size: 0.74rem; color: #6b7280; margin-top: 0.16rem; }
        .ubicacion-derivada { border: 1px dashed #c9d6e4; border-radius: 10px; padding: 0.85rem 1rem; background: #f8fbff; display: grid; gap: 0.25rem; font-size: 0.82rem; color: #334155; }
        @media (max-width: 640px) {
          .lugar-detalle__grid { grid-template-columns: 1fr; }
          .predio-option { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  )
}