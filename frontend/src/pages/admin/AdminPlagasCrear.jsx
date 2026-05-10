import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plagasAPI } from '../../services/api'
import './AdminMockPages.css'

const RIESGOS = ['bajo', 'medio', 'alto']

const emptyCreate = {
  nombre_comun: '',
  nombre_cientifico: '',
  descripcion: '',
  nivel_riesgo: 'medio',
  cultivo_ids: [],
}

export default function AdminPlagasCrear() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [loadingEspecies, setLoadingEspecies] = useState(true)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [especies, setEspecies] = useState([])
  const [createForm, setCreateForm] = useState(emptyCreate)
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
    if (code === 'CAMPOS_OBLIGATORIOS') return 'E6: Completa los campos obligatorios resaltados.'

    return message || fallback
  }

  const validateCreate = () => {
    const errs = {
      create_nombre_comun: !createForm.nombre_comun.trim(),
      create_nombre_cientifico: !createForm.nombre_cientifico.trim(),
      create_cultivo_ids: createForm.cultivo_ids.length === 0,
    }
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    return !Object.values(errs).some(Boolean)
  }

  useEffect(() => {
    const loadEspecies = async () => {
      setLoadingEspecies(true)
      setError('')
      try {
        const res = await plagasAPI.getEspecies()
        setEspecies(res.data || [])
      } catch {
        setEspecies([])
        setError('No fue posible cargar las especies')
      } finally {
        setLoadingEspecies(false)
      }
    }
    loadEspecies()
  }, [])

  const crearPlaga = async () => {
    if (!validateCreate()) {
      showToast('E6: Completa los campos obligatorios y selecciona al menos un cultivo.')
      return
    }

    setSaving(true)
    try {
      await plagasAPI.create({
        nombre_comun: createForm.nombre_comun,
        nombre_cientifico: createForm.nombre_cientifico,
        descripcion: createForm.descripcion,
        nivel_riesgo: createForm.nivel_riesgo,
        cultivo_ids: createForm.cultivo_ids,
      })
      showToast('Plaga creada correctamente')
      setCreateForm(emptyCreate)
      setFieldErrors({})
    } catch (e) {
      showToast(mapBackendError(e, 'No fue posible crear la plaga'))
      if (e?.response?.data?.code === 'NOMBRE_COMUN_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, create_nombre_comun: true }))
      }
      if (e?.response?.data?.code === 'NOMBRE_CIENTIFICO_DUPLICADO') {
        setFieldErrors((prev) => ({ ...prev, create_nombre_cientifico: true }))
      }
      if (e?.response?.data?.code === 'SIN_CULTIVOS_ASOCIADOS' || e?.response?.data?.code === 'CULTIVO_INVALIDO') {
        setFieldErrors((prev) => ({ ...prev, create_cultivo_ids: true }))
      }
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

      <header style={{ display:'flex', justifyContent:'space-between', gap:'0.6rem', alignItems:'center' }}>
        <div>
          <h2>Crear Plaga</h2>
          <p>Registra una nueva plaga y asociala a uno o varios cultivos del catalogo.</p>
        </div>
        <button onClick={() => navigate('/admin/plagas')} style={btnSecondary}>Volver</button>
      </header>

      {error && (
        <div style={{ marginTop:'0.7rem', background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:8, padding:'0.5rem 0.65rem', fontSize:'0.8rem' }}>
          {error}
        </div>
      )}

      <article style={{ marginTop:'0.8rem', border:'1px solid #e2e8f0', borderRadius:10, padding:'0.75rem' }}>
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
            Cultivos asociados *
            <div style={multiSelectBoxStyle(fieldErrors.create_cultivo_ids)}>
              {especiesActivas.map((e) => {
                const checked = createForm.cultivo_ids.includes(e.id)
                return (
                  <label key={e.id} style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      disabled={loadingEspecies}
                      checked={checked}
                      onChange={(event) => setCreateForm((form) => ({
                        ...form,
                        cultivo_ids: event.target.checked
                          ? [...form.cultivo_ids, e.id]
                          : form.cultivo_ids.filter((id) => id !== e.id),
                      }))}
                    />
                    <span>{e.nombre}</span>
                  </label>
                )
              })}
            </div>
          </label>

          <label style={{ ...labelStyle, gridColumn:'1 / -1' }}>
            Descripcion
            <textarea
              rows={3}
              style={{ ...inputStyle(false), resize:'vertical' }}
              value={createForm.descripcion}
              onChange={(e) => setCreateForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </label>
        </div>

        <div style={{ marginTop:'0.55rem' }}>
          <button disabled={saving || loadingEspecies} onClick={crearPlaga} style={btnPrimary}>Guardar nueva plaga</button>
        </div>
      </article>
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
