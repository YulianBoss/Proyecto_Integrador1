const db = require('../config/db');

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});

const normalizeText = (value) => String(value || '').trim();

const listPredios = async (req, res) => {
    try {
        const productorId = Number(req.user.id);
        const predios = await queryAsync(
            `SELECT id, nombre_identificacion, departamento, municipio, vereda_direccion,
                    area_ha, coordenadas_lat, coordenadas_lng, fecha_registro
             FROM predios_produccion
             WHERE productor_id IN (?, 1)
             ORDER BY id ASC`,
            [productorId]
        );

        res.json(predios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener predios' });
    }
};

const createPredio = async (req, res) => {
    const productor_id = req.user.id;
    const nombre_identificacion = normalizeText(req.body.nombre_identificacion);
    const departamento = normalizeText(req.body.departamento);
    const municipio = normalizeText(req.body.municipio);
    const vereda_direccion = normalizeText(req.body.vereda_direccion);
    const area_ha = req.body.area_ha;
    const coordenadas_lat = req.body.coordenadas_lat ?? null;
    const coordenadas_lng = req.body.coordenadas_lng ?? null;

    if (!nombre_identificacion || !departamento || !municipio || !vereda_direccion || area_ha === undefined || area_ha === null || area_ha === '') {
        return res.status(400).json({ message: 'Faltan datos obligatorios del predio' });
    }

    if (Number.isNaN(Number(area_ha)) || parseFloat(area_ha) <= 0) {
        return res.status(400).json({ message: 'El área del predio debe ser un número mayor a cero' });
    }

    try {
        const dup = await queryAsync(
            `SELECT id FROM predios_produccion WHERE productor_id = ? AND nombre_identificacion = ?`,
            [productor_id, nombre_identificacion]
        );

        if (dup.length > 0) {
            return res.status(400).json({ message: 'Ya existe un predio con ese nombre o identificación' });
        }

        const result = await queryAsync(
            `INSERT INTO predios_produccion
             (productor_id, nombre_identificacion, departamento, municipio, vereda_direccion, area_ha, coordenadas_lat, coordenadas_lng)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [productor_id, nombre_identificacion, departamento, municipio, vereda_direccion, area_ha, coordenadas_lat || null, coordenadas_lng || null]
        );

        res.status(201).json({ message: 'Predio registrado ✅', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear predio' });
    }
};

const updatePredio = async (req, res) => {
    const productor_id = req.user.id;
    const { id } = req.params;
    const payload = {
        nombre_identificacion: req.body.nombre_identificacion !== undefined ? normalizeText(req.body.nombre_identificacion) : undefined,
        departamento: req.body.departamento !== undefined ? normalizeText(req.body.departamento) : undefined,
        municipio: req.body.municipio !== undefined ? normalizeText(req.body.municipio) : undefined,
        vereda_direccion: req.body.vereda_direccion !== undefined ? normalizeText(req.body.vereda_direccion) : undefined,
        area_ha: req.body.area_ha,
        coordenadas_lat: req.body.coordenadas_lat,
        coordenadas_lng: req.body.coordenadas_lng,
    };

    try {
        const predios = await queryAsync(`SELECT * FROM predios_produccion WHERE id = ? AND productor_id = ?`, [id, productor_id]);
        if (predios.length === 0) {
            return res.status(404).json({ message: 'Predio no encontrado' });
        }

        if (payload.area_ha !== undefined && (Number.isNaN(Number(payload.area_ha)) || parseFloat(payload.area_ha) <= 0)) {
            return res.status(400).json({ message: 'El área del predio debe ser un número mayor a cero' });
        }

        const fields = [];
        const values = [];

        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined) return;
            if (typeof value === 'string' && !value.trim() && key !== 'coordenadas_lat' && key !== 'coordenadas_lng') return;
            fields.push(`${key} = ?`);
            values.push(value === '' ? null : value);
        });

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar el predio' });
        }

        if (payload.nombre_identificacion) {
            const dup = await queryAsync(
                `SELECT id FROM predios_produccion WHERE productor_id = ? AND nombre_identificacion = ? AND id <> ?`,
                [productor_id, payload.nombre_identificacion, id]
            );

            if (dup.length > 0) {
                return res.status(400).json({ message: 'Ya existe un predio con ese nombre o identificación' });
            }
        }

        values.push(id, productor_id);
        await queryAsync(`UPDATE predios_produccion SET ${fields.join(', ')} WHERE id = ? AND productor_id = ?`, values);
        res.json({ message: 'Predio actualizado ✅' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar predio' });
    }
};

const deletePredio = async (req, res) => {
    const productor_id = req.user.id;
    const { id } = req.params;

    try {
        const predios = await queryAsync(`SELECT id FROM predios_produccion WHERE id = ? AND productor_id = ?`, [id, productor_id]);
        if (predios.length === 0) {
            return res.status(404).json({ message: 'Predio no encontrado' });
        }

        const usage = await queryAsync(`SELECT COUNT(*) AS total FROM lugar_predios WHERE predio_id = ?`, [id]);
        if (usage[0].total > 0) {
            return res.status(400).json({ message: 'No se puede eliminar el predio porque está asociado a un lugar de producción' });
        }

        await queryAsync(`DELETE FROM predios_produccion WHERE id = ? AND productor_id = ?`, [id, productor_id]);
        res.json({ message: 'Predio eliminado ✅' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar predio' });
    }
};

module.exports = {
    listPredios,
    createPredio,
    updatePredio,
    deletePredio,
};