import { useEffect, useMemo, useState } from 'react'
import { plagasAPI } from '../../services/api'
import './AdminMockPages.css'

const RIESGOS = ['bajo', 'medio', 'alto']

const emptyCreate = {
  nombre_comun: '',
  nombre_cientifico: '',
  descripcion: '',
  nivel_riesgo: 'medio',
  especie_id: '',
}

export default function AdminPlagas() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [filtros, setFiltros] = useState({ nombre: '', estado: '', especie_id: '' })
  const [plagas, setPlagas] = useState([])
  const [especies, setEspecies] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [form, setForm] = useState({
    nombre_comun: '',
    nombre_cientifico: '',
    descripcion: '',
    nivel_riesgo: 'medio',
    especie_id: '',
  })

  const [createForm, setCreateForm] = useState(emptyCreate)
  const [fieldErrors, setFieldErrors] = useState({})

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3200)
  }

  const mapBackendError = (err, fallback) => {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message

    if (code === 'NOMBRE_CIENTIFICO_DUPLICADO') return 'E1: Ya existe una plaga con ese nombre cientifico.'
    if (code === 'SIN_ESPECIE') return 'E2: Debes seleccionar una especie asociada.'
    if (code === 'ESPECIE_INVALIDA') return 'La especie seleccionada no existe o esta inactiva.'
    if (code === 'NOMBRE_CIENTIFICO_BLOQUEADO') return 'E3: No se puede modificar el nombre cientifico por inspecciones asociadas.'
    if (code === 'DESACTIVACION_NO_PERMITIDA') return 'E4: Hay inspecciones en curso usando esta plaga. Espera a que finalicen.'
    if (code === 'ELIMINACION_NO_PERMITIDA') return 'E5: Tiene inspecciones historicas asociadas. Desactiva la plaga en lugar de eliminarla.'
    if (code === 'CAMPOS_OBLIGATORIOS') return 'E6: Completa los campos obligatorios resaltados.'

    return message || fallback
  }

  const validateCreate = () => {
    const errs = {
      create_nombre_comun: !createForm.nombre_comun.trim(),
      create_nombre_cientifico: !createForm.nombre_cientifico.trim(),
      create_especie_id: !createForm.especie_id,
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  const validateEdit = () => {
    const errs = {
      edit_nombre_comun: !form.nombre_comun.trim(),
      edit_nombre_cientifico: !form.nombre_cientifico.trim(),
      edit_especie_id: !form.especie_id,
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  const especieNombre = (id) => {
    const row = especies.find((e) => Number(e.id) === Number(id))
    return row?.nombre || `Especie #${id}`
  }

  const loadPlagas = async (keepSelection = true) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filtros.nombre.trim()) params.nombre = filtros.nombre.trim()
      if (filtros.estado) params.estado = filtros.estado
      if (filtros.especie_id) params.especie_id = filtros.especie_id

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
        especie_id: d.especie_id ? String(d.especie_id) : '',
      })
    } catch {
      setDetalle(null)
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
    const t = setTimeout(() => loadPlagas(false), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros])

  const crearPlaga = async () => {
    if (!validateCreate()) {
      showToast('E6: Completa los campos obligatorios y selecciona una especie.')
      return
    }

    setSaving(true)
    try {
      await plagasAPI.create({
        nombre_comun: createForm.nombre_comun,
        nombre_cientifico: createForm.nombre_cientifico,
        descripcion: createForm.descripcion,
        nivel_riesgo: createForm.nivel_riesgo,
        especie_id: Number(createForm.especie_id),
      })
      showToast('Plaga creada correctamente')
      setCreateForm(emptyCreate)
      setFieldErrors({})
      await loadPlagas(false)
    } catch (e) {
      showToast(mapBackendError(e, 'No fue posible crear la plaga'))
      if (e?.response?.data?.code === 'NOMBRE_CIENTIFICO_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, create_nombre_cientifico: true }))
      }
      if (e?.response?.data?.code === 'SIN_ESPECIE') {
        setFieldErrors((prev) => ({ ...prev, create_especie_id: true }))
      }
    } finally {
      setSaving(false)
    }
  }

  const guardarCambios = async () => {
    if (!detalle) return
    if (!validateEdit()) {
      showToast('E6: Completa los campos obligatorios y selecciona la especie afectada.')
      return
    }

    setSaving(true)
    try {
      await plagasAPI.update(detalle.id, {
        nombre_comun: form.nombre_comun,
        nombre_cientifico: form.nombre_cientifico,
        descripcion: form.descripcion,
        nivel_riesgo: form.nivel_riesgo,
        especie_id: Number(form.especie_id),
      })
      setFieldErrors({})
      showToast('Plaga actualizada correctamente')
      await loadPlagas(true)
    } catch (e) {
      showToast(mapBackendError(e, 'No se pudo guardar la plaga'))
      if (e?.response?.data?.code === 'NOMBRE_CIENTIFICO_DUPLICADO' || e?.response?.data?.code === 'NOMBRE_CIENTIFICO_BLOQUEADO') {
        setFieldErrors((prev) => ({ ...prev, edit_nombre_cientifico: true }))
      }
      if (e?.response?.data?.code === 'SIN_ESPECIE' || e?.response?.data?.code === 'ESPECIE_INVALIDA') {
        setFieldErrors((prev) => ({ ...prev, edit_especie_id: true }))
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

  return (
    <section className="mock-admin-page">
      {toast && (
        <div style={{ marginBottom:'0.6rem', background:'#ecfeff', border:'1px solid #a5f3fc', color:'#155e75', fontSize:'0.8rem', borderRadius:8, padding:'0.5rem 0.65rem' }}>
          {toast}
        </div>
      )}

      <header>
        <h2>Gestion de Plagas</h2>
        <p>Catalogo con campos: id, nombre, nombre cientifico, descripcion, nivel_riesgo y especie_id.</p>
      </header>

      <div style={{ marginTop:'0.8rem', border:'1px solid #e2e8f0', borderRadius:10, padding:'0.75rem' }}>
        <h3 style={{ margin:'0 0 0.6rem', fontSize:'0.9rem', color:'#0f172a' }}>Registrar nueva plaga</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(190px, 1fr))', gap:'0.55rem' }}>
          <label style={labelStyle}>
            Nombre *
            <input
              style={inputStyle(fieldErrors.create_nombre_comun)}
              value={createForm.nombre_comun}
              onChange={(e) => setCreateForm((f) => ({ ...f, nombre_comun: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            Nombre cientifico *
            <input
              style={inputStyle(fieldErrors.create_nombre_cientifico)}
              value={createForm.nombre_cientifico}
              onChange={(e) => setCreateForm((f) => ({ ...f, nombre_cientifico: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            Nivel de riesgo
            <select style={inputStyle(false)} value={createForm.nivel_riesgo} onChange={(e) => setCreateForm((f) => ({ ...f, nivel_riesgo: e.target.value }))}>
              {RIESGOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label style={labelStyle}>
            Especie afectada *
            <select
              style={inputStyle(fieldErrors.create_especie_id)}
              value={createForm.especie_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, especie_id: e.target.value }))}
            >
              <option value="">Selecciona una especie</option>
              {especiesActivas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>

          <label style={{ ...labelStyle, gridColumn:'1 / -1' }}>
            Descripcion
            <textarea
              rows={2}
              style={{ ...inputStyle(false), resize:'vertical' }}
              value={createForm.descripcion}
              onChange={(e) => setCreateForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </label>
        </div>

        <div style={{ marginTop:'0.55rem' }}>
          <button disabled={saving} onClick={crearPlaga} style={btnPrimary}>Crear plaga</button>
        </div>
      </div>

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
        <select value={filtros.especie_id} onChange={(e) => setFiltros((f) => ({ ...f, especie_id: e.target.value }))}>
          <option value="">Todas las especies</option>
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
                      {p.nombre_cientifico} | especie_id: {p.especie_id} ({p.especie_nombre || especieNombre(p.especie_id)})
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
            <p style={{ margin:0, color:'#64748b', fontSize:'0.82rem' }}>Selecciona una plaga para ver detalle y gestionarla.</p>
          ) : (
            <>
              <h3 style={{ margin:'0 0 0.45rem', fontSize:'0.92rem', color:'#0f172a' }}>Detalle de plaga</h3>

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
                  Especie afectada *
                  <select
                    style={inputStyle(fieldErrors.edit_especie_id)}
                    value={form.especie_id}
                    onChange={(e) => setForm((f) => ({ ...f, especie_id: e.target.value }))}
                  >
                    <option value="">Selecciona una especie</option>
                    {especiesActivas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </label>

                <label style={labelStyle}>
                  Descripcion
                  <textarea
                    rows={3}
                    style={{ ...inputStyle(false), resize:'vertical' }}
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  />
                </label>

                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
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
