import { useMemo, useState } from 'react'
import './AdminMockPages.css'

const BASE_CULTIVOS = [
  { id: 1, nombre: 'Cafe', especie: 'Arabica', lotes: 120, estado: 'activo' },
  { id: 2, nombre: 'Banano', especie: 'Cavendish', lotes: 46, estado: 'activo' },
  { id: 3, nombre: 'Cacao', especie: 'Theobroma cacao', lotes: 38, estado: 'revision' },
  { id: 4, nombre: 'Aguacate', especie: 'Hass', lotes: 22, estado: 'planificado' },
]

export default function AdminCultivosMock() {
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')

  const rows = useMemo(() => {
    return BASE_CULTIVOS.filter(item => {
      const matchQ = q.trim() === '' || item.nombre.toLowerCase().includes(q.toLowerCase())
      const matchEstado = estado === '' || item.estado === estado
      return matchQ && matchEstado
    })
  }, [q, estado])

  return (
    <section className="mock-admin-page">
      <header>
        <h2>Gestion de Cultivos (Mockup)</h2>
        <p>Vista de relleno para validar experiencia del administrador.</p>
      </header>

      <div className="mock-toolbar">
        <input
          type="text"
          placeholder="Buscar cultivo..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="revision">Revision</option>
          <option value="planificado">Planificado</option>
        </select>
      </div>

      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th>Cultivo</th>
              <th>Especie</th>
              <th>Lotes referenciados</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.nombre}</td>
                <td>{row.especie}</td>
                <td>{row.lotes}</td>
                <td>{row.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
