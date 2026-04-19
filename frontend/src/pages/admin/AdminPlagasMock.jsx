import { useMemo, useState } from 'react'
import './AdminMockPages.css'

const BASE_PLAGAS = [
  { id: 1, nombre: 'Broca del cafe', riesgo: 'alto', cultivo: 'Cafe', estado: 'vigente' },
  { id: 2, nombre: 'Mosca blanca', riesgo: 'medio', cultivo: 'Tomate', estado: 'vigente' },
  { id: 3, nombre: 'Roya', riesgo: 'alto', cultivo: 'Cafe', estado: 'vigilancia' },
  { id: 4, nombre: 'Trips', riesgo: 'bajo', cultivo: 'Banano', estado: 'controlado' },
]

export default function AdminPlagasMock() {
  const [q, setQ] = useState('')
  const [riesgo, setRiesgo] = useState('')

  const rows = useMemo(() => {
    return BASE_PLAGAS.filter(item => {
      const matchQ = q.trim() === '' || item.nombre.toLowerCase().includes(q.toLowerCase())
      const matchRiesgo = riesgo === '' || item.riesgo === riesgo
      return matchQ && matchRiesgo
    })
  }, [q, riesgo])

  return (
    <section className="mock-admin-page">
      <header>
        <h2>Gestion de Plagas (Mockup)</h2>
        <p>Vista temporal de catalogo para pruebas de interfaz.</p>
      </header>

      <div className="mock-toolbar">
        <input
          type="text"
          placeholder="Buscar plaga..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select value={riesgo} onChange={e => setRiesgo(e.target.value)}>
          <option value="">Todos los riesgos</option>
          <option value="alto">Alto</option>
          <option value="medio">Medio</option>
          <option value="bajo">Bajo</option>
        </select>
      </div>

      <div className="mock-table-wrap">
        <table className="mock-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cultivo</th>
              <th>Riesgo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.nombre}</td>
                <td>{row.cultivo}</td>
                <td>{row.riesgo}</td>
                <td>{row.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
