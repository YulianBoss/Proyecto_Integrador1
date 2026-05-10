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
    if (code === 'NOMBRE_CIENTIFICO_DUPLICADO') return 'E1: Ya existe una plaga con ese nombre cientifico.'
    if (code === 'SIN_CULTIVOS_ASOCIADOS') return 'E2: Debes seleccionar al menos un cultivo asociado.'
    if (code === 'CULTIVO_INVALIDO') return 'Uno o mas cultivos seleccionados no existen o estan inactivos.'
    if (code === 'NOMBRE_CIENTIFICO_BLOQUEADO') return 'E3: No se puede modificar el nombre cientifico por inspecciones asociadas.'
    if (code === 'DESACTIVACION_NO_PERMITIDA') return 'E4: Hay inspecciones en curso usando esta plaga. Espera a que finalicen.'
    if (code === 'ELIMINACION_NO_PERMITIDA') return 'E5: Tiene inspecciones historicas asociadas. Desactiva la plaga en lugar de eliminarla.'
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
      setError('No fue posible cargar el catalogo de plagas')
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
    const ok = window.confirm(`Confirma eliminar la plaga ${detalle.nombre_comun}? Esta accion es irreversible.`)
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
      {toast && (
        <div style={{ marginBottom:'0.6rem', background:'#ecfeff', border:'1px solid #a5f3fc', color:'#155e75', fontSize:'0.8rem', borderRadius:8, padding:'0.5rem 0.65rem' }}>
          {toast}
        </div>
      )}

      <header style={{ display:'flex', justifyContent:'space-between', gap:'0.6rem', alignItems:'center' }}>
        <div>
          <h2>Editar o Eliminar Plagas</h2>
          <p>Selecciona una plaga para editarla, desactivarla o eliminarla junto con sus cultivos asociados.</p>
        </div>
        <button onClick={() => navigate('/admin/plagas')} style={btnSecondary}>Volver</button>
      </header>

      <div className="mock-toolbar" style={{ marginTop:'0.8rem', gridTemplateColumns:'1fr 150px 220px' }}>
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filtros.nombre}
          onChange={(e) => setFiltros((f) => ({ ...f, nombre: e.target.value }))}
        />
        <select value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={filtros.cultivo_id} onChange={(e) => setFiltros((f) => ({ ...f, cultivo_id: e.target.value }))}>
          <option value="">Todos los cultivos</option>
          {especies.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ marginTop:'0.7rem', background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:8, padding:'0.5rem 0.65rem', fontSize:'0.8rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop:'0.8rem', display:'grid', gridTemplateColumns:'minmax(300px, 44%) 1fr', gap:'0.75rem' }}>
        <div className="mock-table-wrap" style={{ marginTop:0, border:'1px solid #e2e8f0', borderRadius:10 }}>
          <table className="mock-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Riesgo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>Cargando...</td></tr>
              ) : plagas.length === 0 ? (
                <tr><td colSpan={3}>No hay plagas para los filtros seleccionados.</td></tr>
              ) : plagas.map((p) => (
                <tr
                  key={p.id}
                  style={{ background: selectedId === p.id ? '#eff6ff' : 'transparent', cursor:'pointer' }}
                  onClick={() => { setSelectedId(p.id); loadDetalle(p.id) }}
                >
                  <td>
                    <strong>{p.nombre_comun}</strong>
                    <div style={{ color:'#64748b', fontSize:'0.72rem' }}>
                      {p.nombre_cientifico} | cultivos: {p.cultivos_asociados_texto || especieNombre(p.especie_id)}
                    </div>
                  </td>
                  <td>{p.nivel_riesgo}</td>
                  <td>{p.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'0.75rem', minHeight:300 }}>
          {!detalle ? (
            <p style={{ margin:0, color:'#64748b', fontSize:'0.82rem' }}>Selecciona una plaga para editarla o eliminarla.</p>
          ) : (
            <>
              <h3 style={{ margin:'0 0 0.45rem', fontSize:'0.92rem', color:'#0f172a' }}>Detalle de plaga</h3>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(180px, 1fr))', gap:'0.55rem', marginBottom:'0.75rem' }}>
                <div style={infoCardStyle}>
                  <strong style={infoLabelStyle}>Estado actual</strong>
                  <span style={infoValueStyle}>{detalle.estado}</span>
                </div>
                <div style={infoCardStyle}>
                  <strong style={infoLabelStyle}>Nivel de riesgo</strong>
                  <span style={infoValueStyle}>{detalle.nivel_riesgo}</span>
                </div>
                <div style={{ ...infoCardStyle, gridColumn:'1 / -1' }}>
                  <strong style={infoLabelStyle}>Cultivos actualmente asociados</strong>
                  <span style={infoValueStyle}>
                    {cultivosAsociadosDetalle.length > 0
                      ? cultivosAsociadosDetalle.map((cultivo) => cultivo.nombre).join(', ')
                      : 'No hay cultivos asociados'}
                  </span>
                </div>
              </div>

              <div style={{ display:'grid', gap:'0.55rem' }}>
                <label style={labelStyle}>
                  Nombre *
                  <input style={inputStyle(fieldErrors.edit_nombre_comun)} value={form.nombre_comun} onChange={(e) => setForm((f) => ({ ...f, nombre_comun: e.target.value }))} />
                </label>

                <label style={labelStyle}>
                  Nombre cientifico *
                  <input
                    style={{ ...inputStyle(fieldErrors.edit_nombre_cientifico), background: detalle.puede_editar_nombre_cientifico ? '#fff' : '#f8fafc' }}
                    disabled={!detalle.puede_editar_nombre_cientifico}
                    value={form.nombre_cientifico}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
                  />
                </label>
                {!detalle.puede_editar_nombre_cientifico && (
                  <p style={{ margin:'-0.3rem 0 0', color:'#b45309', fontSize:'0.72rem' }}>
                    E3: Nombre cientifico bloqueado por inspecciones asociadas.
                  </p>
                )}

                <label style={labelStyle}>
                  Nivel de riesgo
                  <select style={inputStyle(false)} value={form.nivel_riesgo} onChange={(e) => setForm((f) => ({ ...f, nivel_riesgo: e.target.value }))}>
                    {RIESGOS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>

                <label style={labelStyle}>
                  Cultivos asociados *
                  <div style={multiSelectBoxStyle(fieldErrors.edit_cultivo_ids)}>
                    {especiesActivas.map((e) => {
                      const checked = form.cultivo_ids.includes(e.id)
                      return (
                        <label key={e.id} style={checkboxRowStyle}>
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
                </label>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(160px, 1fr))', gap:'0.55rem' }}>
                  <div style={infoCardStyle}>
                    <strong style={infoLabelStyle}>Asociados en esta edicion</strong>
                    <span style={infoValueStyle}>
                      {form.cultivo_ids.length > 0
                        ? form.cultivo_ids.map((id) => especieNombre(id)).join(', ')
                        : 'Debes seleccionar al menos uno'}
                    </span>
                  </div>
                  <div style={infoCardStyle}>
                    <strong style={infoLabelStyle}>Disponibles para asociar</strong>
                    <span style={infoValueStyle}>
                      {cultivosDisponibles.length > 0
                        ? cultivosDisponibles.map((cultivo) => cultivo.nombre).join(', ')
                        : 'No hay mas cultivos disponibles'}
                    </span>
                  </div>
                </div>

                <label style={labelStyle}>
                  Descripcion
                  <textarea
                    rows={3}
                    style={{ ...inputStyle(false), resize:'vertical' }}
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </label>

                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', paddingTop:'0.2rem', borderTop:'1px solid #e2e8f0' }}>
                  <button disabled={saving} onClick={guardarCambios} style={btnPrimary}>Guardar cambios</button>
                  <button disabled={saving} onClick={cambiarEstado} style={btnSecondary}>
                    {detalle.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button disabled={saving} onClick={eliminar} style={btnDanger}>Eliminar</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

const labelStyle = {
  fontSize:'0.75rem',
  color:'#334155',
}

const inputStyle = (hasError) => ({
  marginTop:'0.2rem',
  width:'100%',
  border: `1px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  borderRadius:8,
  padding:'0.45rem 0.55rem',
  font:'inherit',
  fontSize:'0.78rem',
  boxSizing:'border-box',
})

const multiSelectBoxStyle = (hasError) => ({
  marginTop:'0.2rem',
  border: `1px solid ${hasError ? '#ef4444' : '#cbd5e1'}`,
  borderRadius:8,
  padding:'0.5rem 0.55rem',
  maxHeight:180,
  overflow:'auto',
  display:'grid',
  gap:'0.35rem',
  background:'#fff',
})

const checkboxRowStyle = {
  display:'flex',
  alignItems:'center',
  gap:'0.45rem',
  fontSize:'0.78rem',
  color:'#0f172a',
}

const infoCardStyle = {
  border:'1px solid #dbe5ef',
  borderRadius:8,
  background:'#f8fafc',
  padding:'0.55rem 0.65rem',
  display:'grid',
  gap:'0.2rem',
}

const infoLabelStyle = {
  fontSize:'0.71rem',
  color:'#64748b',
  fontWeight:600,
}

const infoValueStyle = {
  fontSize:'0.8rem',
  color:'#0f172a',
}

const btnPrimary = {
  border:'none',
  borderRadius:8,
  background:'#2563eb',
  color:'#fff',
  fontSize:'0.76rem',
  fontWeight:600,
  padding:'0.44rem 0.68rem',
  cursor:'pointer',
}

const btnSecondary = {
  border:'1px solid #cbd5e1',
  borderRadius:8,
  background:'#fff',
  color:'#0f172a',
  fontSize:'0.76rem',
  fontWeight:600,
  padding:'0.44rem 0.68rem',
  cursor:'pointer',
}

const btnDanger = {
  border:'1px solid #fecaca',
  borderRadius:8,
  background:'#fff1f2',
  color:'#b91c1c',
  fontSize:'0.76rem',
  fontWeight:600,
  padding:'0.44rem 0.68rem',
  cursor:'pointer',
}
