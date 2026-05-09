const db = require('../config/db')

const normalize = (value, maxLen = 255) => String(value || '').trim().slice(0, maxLen)

// GET /api/especies — lista todas las activas (publico para productores)
const getEspecies = (req, res) => {
    const { q } = req.query
    let query = `SELECT id, nombre, nombre_cientifico, descripcion FROM especies WHERE estado = 'activo'`
    const params = []

    if (q) {
        query += ` AND (nombre LIKE ? OR nombre_cientifico LIKE ?)`
        params.push(`%${q}%`, `%${q}%`)
    }

    query += ` ORDER BY nombre ASC`

    db.query(query, params, (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener especies' }) }
        res.json(results)
    })
}

// GET /api/especies/admin — catalogo completo para gestion (admin)
const getEspeciesAdmin = (req, res) => {
    const { q, estado } = req.query
    let query = `SELECT id, nombre, nombre_cientifico, descripcion, estado FROM especies WHERE 1=1`
    const params = []

    if (q) {
        query += ` AND (nombre LIKE ? OR nombre_cientifico LIKE ?)`
        params.push(`%${q}%`, `%${q}%`)
    }

    if (estado && ['activo', 'inactivo'].includes(String(estado).toLowerCase())) {
        query += ` AND estado = ?`
        params.push(String(estado).toLowerCase())
    }

    query += ` ORDER BY nombre ASC`

    db.query(query, params, (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener catalogo de especies' }) }
        res.json(results)
    })
}

const createEspecie = (req, res) => {
    const nombre = normalize(req.body.nombre, 180)
    const nombre_cientifico = normalize(req.body.nombre_cientifico, 220)
    const descripcion = normalize(req.body.descripcion, 2000)

    if (!nombre || !nombre_cientifico) {
        return res.status(400).json({ message: 'Nombre y nombre cientifico son obligatorios', code: 'CAMPOS_OBLIGATORIOS' })
    }

    db.query(
        `SELECT id FROM especies WHERE LOWER(nombre) = LOWER(?) OR LOWER(nombre_cientifico) = LOWER(?) LIMIT 1`,
        [nombre, nombre_cientifico],
        (dupErr, dupRows) => {
            if (dupErr) { console.error(dupErr); return res.status(500).json({ message: 'Error del servidor' }) }
            if (dupRows.length > 0) {
                return res.status(400).json({ message: 'Ya existe una especie con ese nombre o nombre cientifico', code: 'ESPECIE_DUPLICADA' })
            }

            db.query(
                `INSERT INTO especies (nombre, nombre_cientifico, descripcion, estado) VALUES (?, ?, ?, 'activo')`,
                [nombre, nombre_cientifico, descripcion || null],
                (insErr, result) => {
                    if (insErr) { console.error(insErr); return res.status(500).json({ message: 'No se pudo crear la especie' }) }
                    res.status(201).json({ message: 'Especie creada correctamente', id: result.insertId })
                }
            )
        }
    )
}

const updateEspecie = (req, res) => {
    const { id } = req.params
    const nombre = req.body.nombre !== undefined ? normalize(req.body.nombre, 180) : undefined
    const nombre_cientifico = req.body.nombre_cientifico !== undefined ? normalize(req.body.nombre_cientifico, 220) : undefined
    const descripcion = req.body.descripcion !== undefined ? normalize(req.body.descripcion, 2000) : undefined

    const fields = []
    const values = []

    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre) }
    if (nombre_cientifico !== undefined) { fields.push('nombre_cientifico = ?'); values.push(nombre_cientifico) }
    if (descripcion !== undefined) { fields.push('descripcion = ?'); values.push(descripcion || null) }

    if (fields.length === 0) {
        return res.status(400).json({ message: 'No se enviaron campos para actualizar' })
    }

    db.query(`SELECT id FROM especies WHERE id = ?`, [id], (findErr, found) => {
        if (findErr) { console.error(findErr); return res.status(500).json({ message: 'Error del servidor' }) }
        if (found.length === 0) return res.status(404).json({ message: 'Especie no encontrada' })

        const runUpdate = () => {
            values.push(id)
            db.query(`UPDATE especies SET ${fields.join(', ')} WHERE id = ?`, values, (updErr) => {
                if (updErr) { console.error(updErr); return res.status(500).json({ message: 'No se pudo actualizar la especie' }) }
                res.json({ message: 'Especie actualizada correctamente' })
            })
        }

        if (nombre || nombre_cientifico) {
            db.query(
                `SELECT id FROM especies
                 WHERE id <> ?
                   AND (LOWER(nombre) = LOWER(?) OR LOWER(nombre_cientifico) = LOWER(?))
                 LIMIT 1`,
                [id, nombre || '', nombre_cientifico || ''],
                (dupErr, dupRows) => {
                    if (dupErr) { console.error(dupErr); return res.status(500).json({ message: 'Error del servidor' }) }
                    if (dupRows.length > 0) {
                        return res.status(400).json({ message: 'Ya existe otra especie con ese nombre o nombre cientifico', code: 'ESPECIE_DUPLICADA' })
                    }
                    runUpdate()
                }
            )
            return
        }

        runUpdate()
    })
}

const updateEstadoEspecie = (req, res) => {
    const { id } = req.params
    const estado = String(req.body.estado || '').toLowerCase()
    if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ message: 'Estado invalido. Solo activo o inactivo' })
    }

    db.query(`UPDATE especies SET estado = ? WHERE id = ?`, [estado, id], (err, result) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'No se pudo actualizar el estado' }) }
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Especie no encontrada' })
        res.json({ message: 'Estado actualizado correctamente' })
    })
}

const deleteEspecie = (req, res) => {
    const { id } = req.params

    db.query(`SELECT COUNT(*) AS total FROM cultivos WHERE especie_id = ?`, [id], (refErr, refRows) => {
        if (refErr) { console.error(refErr); return res.status(500).json({ message: 'Error del servidor' }) }
        if (Number(refRows?.[0]?.total || 0) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la especie porque tiene cultivos asociados',
                code: 'ESPECIE_CON_CULTIVOS',
            })
        }

        db.query(`DELETE FROM especies WHERE id = ?`, [id], (delErr, result) => {
            if (delErr) { console.error(delErr); return res.status(500).json({ message: 'No se pudo eliminar la especie' }) }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Especie no encontrada' })
            res.json({ message: 'Especie eliminada correctamente' })
        })
    })
}

module.exports = { getEspecies, getEspeciesAdmin, createEspecie, updateEspecie, updateEstadoEspecie, deleteEspecie }