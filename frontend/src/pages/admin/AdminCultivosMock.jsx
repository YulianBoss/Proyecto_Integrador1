import { useEffect, useMemo, useState } from 'react'
import { especiesAPI } from '../../services/api'
import './AdminMockPages.css'

const emptyCreate = {
  nombre: '',
  nombre_cientifico: '',
  descripcion: '',
}

export default function AdminCultivosMock() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [filtros, setFiltros] = useState({ q: '', estado: '' })
  const [especies, setEspecies] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const [form, setForm] = useState({ nombre: '', nombre_cientifico: '', descripcion: '' })
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [fieldErrors, setFieldErrors] = useState({})

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3200)
  }

  const mapBackendError = (err, fallback) => {
    const code = err?.response?.data?.code
    const message = err?.response?.data?.message
    if (code === 'ESPECIE_DUPLICADA') return 'Ya existe una especie con ese nombre o nombre cientifico.'
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
        })
      } else if (rows.length > 0) {
        setSelectedId(rows[0].id)
        setDetalle(rows[0])
        setForm({
          nombre: rows[0].nombre || '',
          nombre_cientifico: rows[0].nombre_cientifico || '',
          descripcion: rows[0].descripcion || '',
        })
      } else {
        setSelectedId(null)
        setDetalle(null)
      }
    } catch {
      setError('No fue posible cargar el catalogo de especies')
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

  const crear = async () => {
    if (!validateCreate()) {
      showToast('Completa nombre y nombre cientifico para crear la especie.')
      return
    }

    setSaving(true)
    try {
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

  const guardar = async () => {
    if (!detalle) return
    if (!validateEdit()) {
      showToast('Completa nombre y nombre cientifico para guardar cambios.')
      return
    }

    setSaving(true)
    try {
      await especiesAPI.update(detalle.id, form)
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

  const cambiarEstado = async () => {
    if (!detalle) return
    const nuevoEstado = detalle.estado === 'activo' ? 'inactivo' : 'activo'

    setSaving(true)
    try {
      await especiesAPI.changeEstado(detalle.id, { estado: nuevoEstado })
      showToast(`Especie ${nuevoEstado === 'activo' ? 'activada' : 'inactivada'} correctamente`)
      await loadEspecies(true)
    } catch (err) {
      showToast(mapBackendError(err, 'No se pudo actualizar el estado'))
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async () => {
    if (!detalle) return
    const ok = window.confirm(`Confirma eliminar la especie ${detalle.nombre}? Esta accion es irreversible.`)
    if (!ok) return

    setSaving(true)
    try {
      await especiesAPI.delete(detalle.id)
      showToast('Especie eliminada correctamente')
      await loadEspecies(false)
    } catch (err) {
      showToast(mapBackendError(err, 'No se pudo eliminar la especie'))
    } finally {
      setSaving(false)
    }
  }

  const totalActivas = useMemo(() => especies.filter((e) => e.estado === 'activo').length, [especies])

  return (
    <section className="mock-admin-page">
      {toast && (
        <div style={{ marginBottom:'0.6rem', background:'#ecfeff', border:'1px solid #a5f3fc', color:'#155e75', fontSize:'0.8rem', borderRadius:8, padding:'0.5rem 0.65rem' }}>
          {toast}
        </div>
      )}

      <header>
        <h2>Catalogo de Cultivos (Especies)</h2>
        <p>Gestiona el catalogo maestro de especies para usar en los cultivos de cada lote.</p>
      </header>

      <div style={{ marginTop:'0.55rem', display:'flex', gap:'0.45rem', flexWrap:'wrap' }}>
        <span style={pillStatStyle}>Total: {especies.length}</span>
        <span style={pillStatStyle}>Activas: {totalActivas}</span>
        <span style={pillStatStyle}>Inactivas: {especies.length - totalActivas}</span>
      </div>

      <div style={{ marginTop:'0.8rem', border:'1px solid #e2e8f0', borderRadius:10, padding:'0.75rem' }}>
        <h3 style={{ margin:'0 0 0.6rem', fontSize:'0.9rem', color:'#0f172a' }}>Registrar nueva especie</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(200px, 1fr))', gap:'0.55rem' }}>
          <label style={labelStyle}>
            Nombre *
            <input
              style={inputStyle(fieldErrors.create_nombre)}
              value={createForm.nombre}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            Nombre cientifico *
            <input
              style={inputStyle(fieldErrors.create_nombre_cientifico)}
              value={createForm.nombre_cientifico}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, nombre_cientifico: e.target.value }))}
            />
          </label>

          <label style={{ ...labelStyle, gridColumn:'1 / -1' }}>
            Descripcion
            <textarea
              rows={2}
              style={{ ...inputStyle(false), resize:'vertical' }}
              value={createForm.descripcion}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
          </label>
        </div>

        <div style={{ marginTop:'0.55rem' }}>
          <button disabled={saving} onClick={crear} style={btnPrimary}>Crear especie</button>
        </div>
      </div>

      <div className="mock-toolbar" style={{ marginTop:'0.8rem' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o nombre cientifico..."
          value={filtros.q}
          onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
        </select>
      </div>

      {error && (
        <div style={{ marginTop:'0.7rem', background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:8, padding:'0.5rem 0.65rem', fontSize:'0.8rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop:'0.8rem', display:'grid', gridTemplateColumns:'minmax(300px, 45%) 1fr', gap:'0.75rem' }}>
        <div className="mock-table-wrap" style={{ marginTop:0, border:'1px solid #e2e8f0', borderRadius:10 }}>
          <table className="mock-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2}>Cargando...</td></tr>
              ) : especies.length === 0 ? (
                <tr><td colSpan={2}>No hay especies para los filtros seleccionados.</td></tr>
              ) : especies.map((item) => (
                <tr
                  key={item.id}
                  style={{ background: selectedId === item.id ? '#eff6ff' : 'transparent', cursor:'pointer' }}
                  onClick={() => { setSelectedId(item.id); loadDetalle(item.id) }}
                >
                  <td>
                    <strong>{item.nombre}</strong>
                    <div style={{ color:'#64748b', fontSize:'0.72rem' }}>{item.nombre_cientifico}</div>
                  </td>
                  <td>{item.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'0.75rem', minHeight:280 }}>
          {!detalle ? (
            <p style={{ margin:0, color:'#64748b', fontSize:'0.82rem' }}>Selecciona una especie para ver detalle y gestionarla.</p>
          ) : (
            <>
              <h3 style={{ margin:'0 0 0.45rem', fontSize:'0.92rem', color:'#0f172a' }}>Detalle de especie</h3>

              <div style={{ display:'grid', gap:'0.55rem' }}>
                <label style={labelStyle}>
                  Nombre *
                  <input
                    style={inputStyle(fieldErrors.edit_nombre)}
                    value={form.nombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                </label>

                <label style={labelStyle}>
                  Nombre cientifico *
                  <input
                    style={inputStyle(fieldErrors.edit_nombre_cientifico)}
                    value={form.nombre_cientifico}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre_cientifico: e.target.value }))}
                  />
                </label>

                <label style={labelStyle}>
                  Descripcion
                  <textarea
                    rows={4}
                    style={{ ...inputStyle(false), resize:'vertical' }}
                    value={form.descripcion}
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  />
                </label>

                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                  <button disabled={saving} onClick={guardar} style={btnPrimary}>Guardar cambios</button>
                  <button disabled={saving} onClick={cambiarEstado} style={btnSecondary}>
                    {detalle.estado === 'activo' ? 'Inactivar' : 'Activar'}
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

const pillStatStyle = {
  fontSize:'0.72rem',
  background:'#ecfeff',
  border:'1px solid #a5f3fc',
  borderRadius:999,
  padding:'0.15rem 0.55rem',
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
