import axios from 'axios'

const AUTH_URL       = 'http://localhost:3001'
const PRODUCTION_URL = 'http://localhost:58761'
const INSPECTION_URL = 'http://localhost:3003'

const getHeaders = () => {
  const token = localStorage.getItem('sigfito_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const authAPI = {
  login:        (data)     => axios.post(`${AUTH_URL}/api/users/login`, data),
  register:     (data)     => axios.post(`${AUTH_URL}/api/users/register`, data),
  getUsers:     (params)   => axios.get(`${AUTH_URL}/api/users`, { headers: getHeaders(), params }),
  getTecnicos:  (params)   => axios.get(`${AUTH_URL}/api/users/tecnicos`, { headers: getHeaders(), params }),
  updateUser:   (id, data) => axios.put(`${AUTH_URL}/api/users/${id}`, data, { headers: getHeaders() }),
  toggleEstado: (id, data) => axios.patch(`${AUTH_URL}/api/users/${id}/estado`, data, { headers: getHeaders() }),
  getSolicitudes:(params)  => axios.get(`${AUTH_URL}/api/solicitudes`, { headers: getHeaders(), params }),
  aprobar:      (id)       => axios.put(`${AUTH_URL}/api/solicitudes/${id}/aprobar`, {}, { headers: getHeaders() }),
  rechazar:     (id, data) => axios.put(`${AUTH_URL}/api/solicitudes/${id}/rechazar`, data, { headers: getHeaders() }),
}

export const productionAPI = {
  create:  (data)      => axios.post(`${PRODUCTION_URL}/api/production`, data, { headers: getHeaders() }),
  getAll:  (params)    => axios.get(`${PRODUCTION_URL}/api/production`, { headers: getHeaders(), params }),
  getById: (id)        => axios.get(`${PRODUCTION_URL}/api/production/${id}`, { headers: getHeaders() }),
  update:  (id, data)  => axios.put(`${PRODUCTION_URL}/api/production/${id}`, data, { headers: getHeaders() }),
  delete:  (id)        => axios.delete(`${PRODUCTION_URL}/api/production/${id}`, { headers: getHeaders() }),
}

export const prediosAPI = {
  create:  (data)      => axios.post(`${PRODUCTION_URL}/api/predios`, data, { headers: getHeaders() }),
  getAll:  ()          => axios.get(`${PRODUCTION_URL}/api/predios`, { headers: getHeaders() }),
  update:  (id, data)  => axios.put(`${PRODUCTION_URL}/api/predios/${id}`, data, { headers: getHeaders() }),
  delete:  (id)        => axios.delete(`${PRODUCTION_URL}/api/predios/${id}`, { headers: getHeaders() }),
}

export const lotesAPI = {
  create:        (data)      => axios.post(`${PRODUCTION_URL}/api/lots`, data, { headers: getHeaders() }),
  getByLugar:    (lugar_id)  => axios.get(`${PRODUCTION_URL}/api/lots/lugar/${lugar_id}`, { headers: getHeaders() }),
  getById:       (id)        => axios.get(`${PRODUCTION_URL}/api/lots/${id}`, { headers: getHeaders() }),
  update:        (id, data)  => axios.put(`${PRODUCTION_URL}/api/lots/${id}`, data, { headers: getHeaders() }),
  cambiarEstado: (id, data)  => axios.patch(`${PRODUCTION_URL}/api/lots/${id}/estado`, data, { headers: getHeaders() }),
  delete:        (id)        => axios.delete(`${PRODUCTION_URL}/api/lots/${id}`, { headers: getHeaders() }),
  historial:     (id)        => axios.get(`${PRODUCTION_URL}/api/lots/${id}/historial`, { headers: getHeaders() }),
}

export const cultivosAPI = {
  create:    (data)     => axios.post(`${PRODUCTION_URL}/api/cultivos`, data, { headers: getHeaders() }),
  getByLote: (lote_id)  => axios.get(`${PRODUCTION_URL}/api/cultivos/lote/${lote_id}`, { headers: getHeaders() }),
  update:    (id, data) => axios.put(`${PRODUCTION_URL}/api/cultivos/${id}`, data, { headers: getHeaders() }),
  delete:    (id)       => axios.delete(`${PRODUCTION_URL}/api/cultivos/${id}`, { headers: getHeaders() }),
}

export const especiesAPI = {
  getAll: (q) => axios.get(`${PRODUCTION_URL}/api/especies`, { headers: getHeaders(), params: q ? { q } : {} }),
}

export const inspeccionesAPI = {
  solicitar:      (data)   => axios.post(`${INSPECTION_URL}/api/inspections/solicitar`, data, { headers: getHeaders() }),
  misSolicitudes: (params) => axios.get(`${INSPECTION_URL}/api/inspections/mis-solicitudes`, { headers: getHeaders(), params }),
  getById:        (id)     => axios.get(`${INSPECTION_URL}/api/inspections/${id}`, { headers: getHeaders() }),
}

export const tecnicoAPI = {
  misInspecciones: (params) => axios.get(`${INSPECTION_URL}/api/inspections/tecnico/mis-inspecciones`, { headers: getHeaders(), params }),
  iniciar:         (id)     => axios.patch(`${INSPECTION_URL}/api/inspections/${id}/iniciar`, {}, { headers: getHeaders() }),
  completar:       (id, data) => axios.patch(`${INSPECTION_URL}/api/inspections/${id}/completar`, data, { headers: getHeaders() }),
}