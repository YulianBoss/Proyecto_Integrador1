import { useState, useEffect, useCallback } from 'react'
import { authAPI } from '../../services/api'
import './AdminUsuarios.css'

// ── Helpers ──────────────────────────────────────────────────
const initiales = (nombre = '') =>
  nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const ROL_LABELS = { admin: 'Administrador', productor: 'Productor', tecnico: 'Técnico' }
const ROL_CLASS  = { admin: 'rol-admin', productor: 'rol-productor', tecnico: 'rol-tecnico' }
const ESTADO_CLASS = { activo: 'badge-activo', inactivo: 'badge-inactivo', pendiente: 'badge-pendiente', rechazado: 'badge-rechazado' }

// ── Subcomponentes ──────────────────────────────────────────
function StatCard({ icon, value, label, sub, variant }) {
  return (
    <div className="gu-stat-card">
      <div className={`gu-stat-icon gu-stat-icon--${variant}`}>{icon}</div>
      <div className="gu-stat-body">
        <div className="gu-stat-value">{value}</div>
        <div className="gu-stat-label">{label}</div>
        {sub && <span className={`gu-stat-sub gu-stat-sub--${variant}`}>{sub}</span>}
      </div>
    </div>
  )
}

function Badge({ estado }) {
  const texto = { activo: 'Activo', inactivo: 'Inactivo', pendiente: 'Pendiente', rechazado: 'Rechazado' }
  return (
    <span className={`gu-badge ${ESTADO_CLASS[estado] || ''}`}>
      {texto[estado] || estado}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="gu-modal-overlay" onClick={onClose}>
      <div className="gu-modal" onClick={e => e.stopPropagation()}>
        <div className="gu-modal__header">
          <h3>{title}</h3>
          <button className="gu-modal__close" onClick={onClose}>
            <IconX />
          </button>
        </div>
        <div className="gu-modal__body">{children}</div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function AdminUsuarios() {
  const [tab, setTab]           = useState('usuarios')   // 'usuarios' | 'solicitudes'
  const [usuarios, setUsuarios] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState(null)

  // Filtros usuarios
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Filtros solicitudes
  const [filtroSolicitudIdentificacion, setFiltroSolicitudIdentificacion] = useState('')

  // Modales
  const [modalEditar, setModalEditar] = useState(null)
  const [modalRechazar, setModalRechazar] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Form editar
  const [formEditar, setFormEditar] = useState({ nombre_completo: '', correo: '', telefono: '', rol: '', estado: '' })

  const showToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Carga de datos ────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filtroRol)    params.rol    = filtroRol
      if (filtroEstado) params.estado = filtroEstado
      const res = await authAPI.getUsers(params)
      setUsuarios(res.data)
    } catch {
      setError('No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [filtroRol, filtroEstado])

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      const identificacion = filtroSolicitudIdentificacion.trim()
      if (identificacion) params.num_identificacion = identificacion
      const res = await authAPI.getSolicitudes(params)
      setSolicitudes(Array.isArray(res.data) ? res.data : res.data.data || [])
    } catch {
      setError('No se pudieron cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }, [filtroSolicitudIdentificacion])

  useEffect(() => { if (tab === 'usuarios')    cargarUsuarios()    }, [tab, cargarUsuarios])
  useEffect(() => { if (tab === 'solicitudes') cargarSolicitudes() }, [tab, cargarSolicitudes])

  // ── Acciones usuarios ─────────────────────────────────────
  const abrirEditar = (u) => {
    setFormEditar({
      nombre_completo: u.nombre_completo,
      correo: u.correo || '',
      telefono: u.telefono || '',
      rol: u.rol,
      estado: u.estado
    })
    setModalEditar(u)
  }

  const guardarEditar = async () => {
    const telefonoLimpio = (formEditar.telefono || '').trim()
    if (!telefonoLimpio) {
      showToast('El teléfono es obligatorio.', 'error')
      return
    }

    if (!/^\d{10}$/.test(telefonoLimpio)) {
      showToast('El teléfono debe tener exactamente 10 dígitos.', 'error')
      return
    }

    setProcesando(true)
    try {
      await authAPI.updateUser(modalEditar.id, { ...formEditar, telefono: telefonoLimpio })
      showToast('Usuario actualizado correctamente.')
      setModalEditar(null)
      cargarUsuarios()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al actualizar.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const toggleEstado = async (u) => {
    const nuevoEstado = u.estado === 'activo' ? 'inactivo' : 'activo'
    try {
      await authAPI.toggleEstado(u.id, { estado: nuevoEstado })
      showToast(`Cuenta ${nuevoEstado === 'activo' ? 'activada' : 'desactivada'}.`)
      cargarUsuarios()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al cambiar estado.', 'error')
    }
  }

  // ── Acciones solicitudes ──────────────────────────────────
  const aprobarSolicitud = async (id) => {
    setProcesando(true)
    try {
      await authAPI.aprobar(id)
      showToast('Solicitud aprobada. El usuario ya puede iniciar sesión.')
      cargarSolicitudes()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al aprobar.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  const abrirRechazar = (sol) => {
    setMotivoRechazo('')
    setModalRechazar(sol)
  }

  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      showToast('Debes ingresar un motivo de rechazo.', 'error')
      return
    }
    setProcesando(true)
    try {
      await authAPI.rechazar(modalRechazar.id, { motivo: motivoRechazo })
      showToast('Solicitud rechazada.')
      setModalRechazar(null)
      cargarSolicitudes()
    } catch (err) {
      showToast(err.response?.data?.message || 'Error al rechazar.', 'error')
    } finally {
      setProcesando(false)
    }
  }

  // ── Filtros locales usuarios ──────────────────────────────
  const usuariosFiltrados = usuarios.filter(u => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return u.nombre_completo?.toLowerCase().includes(q) || u.correo?.toLowerCase().includes(q)
  })

  // ── Stats ─────────────────────────────────────────────────
  const totalActivos   = usuarios.filter(u => u.estado === 'activo').length
  const totalInactivos = usuarios.filter(u => u.estado === 'inactivo').length
  const totalPendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const totalProductores = usuarios.filter(u => u.rol === 'productor').length

  return (
    <div className="gu-root">
      {/* Toast */}
      {toast && (
        <div className={`gu-toast gu-toast--${toast.tipo}`}>
          {toast.tipo === 'ok' ? <IconCheck /> : <IconAlert />}
          {toast.msg}
        </div>
      )}

      {/* Cabecera de página */}
      <div className="gu-page-header">
        <div>
          <h2 className="gu-page-title">Gestión de Usuarios</h2>
          <p className="gu-page-sub">Administre cuentas de acceso y solicitudes de registro del sistema.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="gu-stats-grid">
        <StatCard icon={<IconUsers />}    value={totalActivos}    label="Usuarios Activos"    sub="en el sistema"    variant="blue" />
        <StatCard icon={<IconUserOff />}  value={totalInactivos}  label="Usuarios Inactivos"  sub="sin acceso"       variant="gray" />
        <StatCard icon={<IconClock />}    value={totalPendientes} label="Solicitudes Pendientes" sub="requieren revisión" variant="yellow" />
        <StatCard icon={<IconLeaf />}     value={totalProductores} label="Productores"         sub="registrados"      variant="green" />
      </div>

      {/* Tabs */}
      <div className="gu-tabs">
        <button
          className={`gu-tab ${tab === 'usuarios' ? 'gu-tab--active' : ''}`}
          onClick={() => setTab('usuarios')}
        >
          <IconUsers /> Usuarios registrados
        </button>
        <button
          className={`gu-tab ${tab === 'solicitudes' ? 'gu-tab--active' : ''}`}
          onClick={() => setTab('solicitudes')}
        >
          <IconSolicitud />
          Solicitudes de acceso
          {totalPendientes > 0 && (
            <span className="gu-tab-badge">{totalPendientes}</span>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="gu-alert gu-alert--error">
          <IconAlert /> {error}
        </div>
      )}

      {/* ── TAB: USUARIOS ── */}
      {tab === 'usuarios' && (
        <div className="gu-section-card">
          <div className="gu-section-header">
            <div>
              <h3>Usuarios Registrados</h3>
              <p>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="gu-filter-bar">
              <div className="gu-search-box">
                <span className="gu-search-icon"><IconSearch /></span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
              <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} className="gu-select">
                <option value="">Todos los roles</option>
                <option value="productor">Productor</option>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="gu-select">
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="gu-table-wrap">
            {loading ? (
              <div className="gu-loading"><span className="gu-spinner" /> Cargando usuarios...</div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="gu-empty">
                <IconUsers />
                <p>No se encontraron usuarios con esos criterios.</p>
              </div>
            ) : (
              <table className="gu-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Identificación</th>
                    <th>Tarjeta Profesional</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="gu-user-cell">
                          <div className="gu-mini-avatar">{initiales(u.nombre_completo)}</div>
                          <strong>{u.nombre_completo}</strong>
                        </div>
                      </td>
                      <td className="gu-td-muted">{u.correo}</td>
                      <td>
                        <span className={`gu-rol-tag ${ROL_CLASS[u.rol] || ''}`}>
                          {ROL_LABELS[u.rol] || u.rol}
                        </span>
                      </td>
                      <td className="gu-td-muted">{u.num_identificacion || '—'}</td>
                      <td className="gu-td-muted">{u.rol === 'tecnico' ? (u.tarjeta_profesional || '—') : '—'}</td>
                      <td className="gu-td-muted">{u.telefono || '—'}</td>
                      <td><Badge estado={u.estado} /></td>
                      <td>
                        <div className="gu-actions">
                          <button className="gu-btn gu-btn--outline gu-btn--sm" onClick={() => abrirEditar(u)} title="Editar">
                            <IconEdit /> Editar
                          </button>
                          <button
                            className={`gu-btn gu-btn--sm ${u.estado === 'activo' ? 'gu-btn--danger' : 'gu-btn--success'}`}
                            onClick={() => toggleEstado(u)}
                            title={u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          >
                            {u.estado === 'activo' ? <><IconBan /> Desactivar</> : <><IconCheck /> Activar</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SOLICITUDES ── */}
      {tab === 'solicitudes' && (
        <div className="gu-section-card">
          <div className="gu-section-header">
            <div>
              <h3>Solicitudes de Acceso</h3>
              <p>Productores y técnicos que esperan aprobación de cuenta.</p>
            </div>
            <div className="gu-filter-bar">
              <div className="gu-search-box">
                <span className="gu-search-icon"><IconSearch /></span>
                <input
                  type="text"
                  placeholder="Filtrar por N° identificación..."
                  value={filtroSolicitudIdentificacion}
                  onChange={e => {
                    const next = e.target.value
                    if (!/^\d*$/.test(next)) return
                    setFiltroSolicitudIdentificacion(next)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="gu-table-wrap">
            {loading ? (
              <div className="gu-loading"><span className="gu-spinner" /> Cargando solicitudes...</div>
            ) : solicitudes.length === 0 ? (
              <div className="gu-empty">
                <IconSolicitud />
                <p>No hay solicitudes pendientes con esos criterios.</p>
              </div>
            ) : (
              <table className="gu-table">
                <thead>
                  <tr>
                    <th>Solicitante</th>
                    <th>Correo</th>
                    <th>Rol solicitado</th>
                    <th>Identificación</th>
                    <th>Tarjeta Profesional</th>
                    <th>Teléfono</th>
                    <th>Fecha solicitud</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="gu-user-cell">
                          <div className="gu-mini-avatar">{initiales(s.nombre_completo)}</div>
                          <strong>{s.nombre_completo}</strong>
                        </div>
                      </td>
                      <td className="gu-td-muted">{s.correo}</td>
                      <td>
                        <span className={`gu-rol-tag ${ROL_CLASS[s.rol] || ''}`}>
                          {ROL_LABELS[s.rol] || s.rol}
                        </span>
                      </td>
                      <td className="gu-td-muted">{s.num_identificacion || '—'}</td>
                      <td className="gu-td-muted">{s.rol === 'tecnico' ? (s.tarjeta_profesional || '—') : '—'}</td>
                      <td className="gu-td-muted">{s.telefono || '—'}</td>
                      <td className="gu-td-muted">
                        {s.fecha_registro
                          ? new Date(s.fecha_registro).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td><Badge estado={s.estado} /></td>
                      <td>
                        {s.estado === 'pendiente' ? (
                          <div className="gu-actions">
                            <button
                              className="gu-btn gu-btn--success gu-btn--sm"
                              onClick={() => aprobarSolicitud(s.id)}
                              disabled={procesando}
                            >
                              <IconCheck /> Aprobar
                            </button>
                            <button
                              className="gu-btn gu-btn--danger gu-btn--sm"
                              onClick={() => abrirRechazar(s)}
                              disabled={procesando}
                            >
                              <IconX /> Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="gu-td-muted">Procesada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Editar Usuario ── */}
      {modalEditar && (
        <Modal title={`Editar usuario — ${modalEditar.nombre_completo}`} onClose={() => setModalEditar(null)}>
          <div className="gu-form-grid">
            <div className="gu-form-group gu-form-group--full">
              <label>Nombre completo</label>
              <input
                className="gu-input"
                value={formEditar.nombre_completo}
                onChange={e => setFormEditar(p => ({ ...p, nombre_completo: e.target.value }))}
              />
            </div>
            <div className="gu-form-group gu-form-group--full">
              <label>Correo electrónico</label>
              <input
                className="gu-input"
                type="email"
                value={formEditar.correo}
                onChange={e => setFormEditar(p => ({ ...p, correo: e.target.value }))}
                placeholder="usuario@dominio.com"
              />
            </div>
            <div className="gu-form-group">
              <label>Teléfono</label>
              <input
                className="gu-input"
                value={formEditar.telefono}
                onChange={e => {
                  const next = e.target.value
                  if (!/^\d*$/.test(next)) return
                  if (next.length > 10) return
                  setFormEditar(p => ({ ...p, telefono: next }))
                }}
                inputMode="numeric"
                minLength={10}
                maxLength={10}
                placeholder="10 dígitos"
                required
              />
            </div>
            <div className="gu-form-group">
              <label>Rol</label>
              <select
                className="gu-input"
                value={formEditar.rol}
                onChange={e => setFormEditar(p => ({ ...p, rol: e.target.value }))}
              >
                <option value="productor">Productor</option>
                <option value="tecnico">Técnico</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="gu-form-group">
              <label>Estado</label>
              <select
                className="gu-input"
                value={formEditar.estado}
                onChange={e => setFormEditar(p => ({ ...p, estado: e.target.value }))}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>
          <div className="gu-modal__actions">
            <button className="gu-btn gu-btn--outline" onClick={() => setModalEditar(null)}>
              Cancelar
            </button>
            <button className="gu-btn gu-btn--primary" onClick={guardarEditar} disabled={procesando}>
              {procesando ? <><span className="gu-spinner gu-spinner--sm" /> Guardando...</> : <><IconCheck /> Guardar cambios</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Rechazar ── */}
      {modalRechazar && (
        <Modal title="Rechazar solicitud" onClose={() => setModalRechazar(null)}>
          <p className="gu-modal__info">
            Estás por rechazar la solicitud de <strong>{modalRechazar.nombre_completo}</strong>.
            La cuenta quedará inactiva y no podrá iniciar sesión.
          </p>
          <div className="gu-form-group" style={{ marginTop: '1rem' }}>
            <label>Motivo de rechazo *</label>
            <textarea
              className="gu-input gu-textarea"
              rows={3}
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Explique el motivo del rechazo..."
            />
          </div>
          <div className="gu-modal__actions">
            <button className="gu-btn gu-btn--outline" onClick={() => setModalRechazar(null)}>
              Cancelar
            </button>
            <button className="gu-btn gu-btn--danger" onClick={confirmarRechazo} disabled={procesando}>
              {procesando ? <><span className="gu-spinner gu-spinner--sm" /> Procesando...</> : <><IconX /> Confirmar rechazo</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }
function IconUsers()    { return <svg viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconUserOff()  { return <svg viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> }
function IconClock()    { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IconLeaf()     { return <svg viewBox="0 0 24 24" {...S}><path d="M12 2C8 6 6 10 6 14a6 6 0 0 0 12 0c0-4-2-8-6-12z"/><line x1="12" y1="14" x2="12" y2="22"/></svg> }
function IconSearch()   { return <svg viewBox="0 0 24 24" {...S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function IconEdit()     { return <svg viewBox="0 0 24 24" {...S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconCheck()    { return <svg viewBox="0 0 24 24" {...S}><polyline points="20 6 9 17 4 12"/></svg> }
function IconX()        { return <svg viewBox="0 0 24 24" {...S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconBan()      { return <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> }
function IconAlert()    { return <svg viewBox="0 0 24 24" {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function IconSolicitud(){ return <svg viewBox="0 0 24 24" {...S}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }