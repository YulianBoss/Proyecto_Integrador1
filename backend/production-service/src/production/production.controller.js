const db = require('../config/db');

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
    });
});

const normalizeText = (value) => String(value || '').trim();
const normalizeCoordinate = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? NaN : parsed;
};

const parseIdList = (value) => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
};

const calcularFechaProximaInspeccion = (baseDate = new Date()) => {
    const nextDate = new Date(baseDate);
    nextDate.setMonth(nextDate.getMonth() + 6);
    return nextDate;
};

const obtenerPrediosDelProductor = async (productor_id, predioIds) => {
    if (!predioIds.length) return [];
    return queryAsync(
        `SELECT id, nombre_identificacion, departamento, municipio, vereda_direccion,
                area_ha, coordenadas_lat, coordenadas_lng
         FROM predios_produccion
         WHERE productor_id IN (?, 1) AND id IN (?)
         ORDER BY id ASC`,
        [productor_id, predioIds]
    );
};

const resolverUbicacionDesdePredios = (predios, predioPrincipalId) => {
    const principal = predios.find((predio) => predio.id === predioPrincipalId) || predios[0];
    return {
        principal,
        departamento: principal.departamento,
        municipio: principal.municipio,
        vereda_direccion: principal.vereda_direccion,
        coordenadas_lat: principal.coordenadas_lat ?? 0,
        coordenadas_lng: principal.coordenadas_lng ?? 0,
    };
};

const obtenerInspeccionesLugar = async (lugarId, productorId) => {
    try {
        return await queryAsync(
            `SELECT id, estado, fecha_solicitud, fecha_inicio, fecha_cierre, concepto_tecnico
             FROM inspecciones
             WHERE lugar_produccion_id = ? AND productor_id = ?
             ORDER BY fecha_solicitud DESC`,
            [lugarId, productorId]
        );
    } catch (err) {
        if (err?.code === 'ER_NO_SUCH_TABLE') return [];
        throw err;
    }
};

const reemplazarPrediosAsociados = async (lugarId, predioIds, predioPrincipalId) => {
    await queryAsync(`DELETE FROM lugar_predios WHERE lugar_produccion_id = ?`, [lugarId]);

    for (const predioId of predioIds) {
        await queryAsync(
            `INSERT INTO lugar_predios (lugar_produccion_id, predio_id, es_principal)
             VALUES (?, ?, ?)`,
            [lugarId, predioId, predioId === predioPrincipalId ? 1 : 0]
        );
    }
};

const mapLugarDetalle = async (lugarId, productor_id) => {
    const lugares = await queryAsync(
        `SELECT id, nombre, numero_registro_ica, departamento, municipio,
                vereda_direccion, area_total_ha, coordenadas_lat, coordenadas_lng,
                estado, fecha_registro, fecha_ultima_inspeccion, fecha_proxima_inspeccion,
                (
                    SELECT p.nombre_identificacion
                    FROM lugar_predios lpr
                    JOIN predios_produccion p ON p.id = lpr.predio_id
                    WHERE lpr.lugar_produccion_id = lugares_produccion.id
                    ORDER BY lpr.es_principal DESC, lpr.fecha_asociacion ASC, lpr.id ASC
                    LIMIT 1
                ) AS predio_principal,
                (
                    SELECT p.id
                    FROM lugar_predios lpr
                    JOIN predios_produccion p ON p.id = lpr.predio_id
                    WHERE lpr.lugar_produccion_id = lugares_produccion.id
                    ORDER BY lpr.es_principal DESC, lpr.fecha_asociacion ASC, lpr.id ASC
                    LIMIT 1
                ) AS predio_principal_id
         FROM lugares_produccion
         WHERE id = ? AND productor_id = ?`,
        [lugarId, productor_id]
    );

    if (lugares.length === 0) return null;

    const predios = await queryAsync(
        `SELECT p.id, p.nombre_identificacion, p.departamento, p.municipio,
                p.vereda_direccion, p.area_ha, p.coordenadas_lat, p.coordenadas_lng,
                lp.es_principal
         FROM lugar_predios lp
         JOIN predios_produccion p ON p.id = lp.predio_id
         WHERE lp.lugar_produccion_id = ?
         ORDER BY lp.es_principal DESC, lp.fecha_asociacion ASC, lp.id ASC`,
        [lugarId]
    );

    const lotes = await queryAsync(
        `SELECT l.id, l.codigo, l.area_ha, l.estado, l.fecha_registro, l.cultivo_activo_id,
                c.id AS cultivo_id, c.variedad AS cultivo_variedad, c.estado AS cultivo_estado
         FROM lotes l
         LEFT JOIN cultivos c ON c.lote_id = l.id AND c.estado = 'activo'
         WHERE l.lugar_produccion_id = ?
         ORDER BY l.fecha_registro DESC`,
        [lugarId]
    );

    const inspecciones = await obtenerInspeccionesLugar(lugarId, productor_id);

    return {
        ...lugares[0],
        predios,
        lotes,
        inspecciones: inspecciones.map((item) => ({
            ...item,
            enlace_informe: `http://localhost:3003/api/inspections/${item.id}`,
        })),
    };
};

const createProduction = async (req, res) => {
    const productor_id = req.user.id;
    const nombre = normalizeText(req.body.nombre);
    const numero_registro_ica = normalizeText(req.body.numero_registro_ica);
    const area_total_ha = req.body.area_total_ha;
    const predio_ids = parseIdList(req.body.predio_ids);
    const predio_principal_id = req.body.predio_principal_id ? Number(req.body.predio_principal_id) : null;

    if (!nombre || !numero_registro_ica || area_total_ha === undefined || area_total_ha === null || area_total_ha === '' || predio_ids.length === 0) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (nombre, registro ICA, área total y predios asociados)' });
    }

    if (Number.isNaN(Number(area_total_ha)) || parseFloat(area_total_ha) <= 0) {
        return res.status(400).json({ message: 'El área total debe ser un número mayor a cero' });
    }

    try {
        const duplicados = await queryAsync(`SELECT id FROM lugares_produccion WHERE numero_registro_ica = ?`, [numero_registro_ica]);
        if (duplicados.length > 0) {
            return res.status(400).json({ message: 'El número de registro ICA ya existe en el sistema' });
        }

        const predios = await obtenerPrediosDelProductor(productor_id, predio_ids);
        if (predios.length !== predio_ids.length) {
            return res.status(400).json({ message: 'Uno o más predios seleccionados no existen o no están disponibles para este productor' });
        }

        // Validar que la suma acumulada de lugares no supere el area_ha de cada predio
        for (const predio of predios) {
            const sumRows = await queryAsync(
                `SELECT COALESCE(SUM(lp.area_total_ha), 0) AS total_usado
                 FROM lugares_produccion lp
                 JOIN lugar_predios lpj ON lpj.lugar_produccion_id = lp.id
                 WHERE lpj.predio_id = ?`,
                [predio.id]
            );
            const totalUsado = parseFloat(sumRows[0].total_usado);
            const nuevaArea  = parseFloat(area_total_ha);
            const disponible = parseFloat(predio.area_ha) - totalUsado;
            if (nuevaArea > disponible) {
                return res.status(400).json({
                    message: `Las hectáreas del lugar (${nuevaArea} ha) superan la capacidad disponible del predio "${predio.nombre_identificacion}". Disponible: ${disponible.toFixed(2)} ha de ${predio.area_ha} ha totales`
                });
            }
        }

        const principalId = predio_principal_id && predio_ids.includes(predio_principal_id) ? predio_principal_id : predio_ids[0];
        const ubicacion = resolverUbicacionDesdePredios(predios, principalId);
        const fechaProxima = calcularFechaProximaInspeccion();

        const result = await queryAsync(
            `INSERT INTO lugares_produccion
             (nombre, numero_registro_ica, departamento, municipio, vereda_direccion,
              area_total_ha, coordenadas_lat, coordenadas_lng, productor_id, estado,
              fecha_registro, fecha_ultima_inspeccion, fecha_proxima_inspeccion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', NOW(), NULL, ?)`,
            [
                nombre,
                numero_registro_ica,
                ubicacion.departamento,
                ubicacion.municipio,
                ubicacion.vereda_direccion,
                area_total_ha,
                ubicacion.coordenadas_lat,
                ubicacion.coordenadas_lng,
                productor_id,
                fechaProxima,
            ]
        );

        await reemplazarPrediosAsociados(result.insertId, predio_ids, principalId);

        res.status(201).json({
            message: 'Lugar de producción registrado ✅',
            id: result.insertId,
            estado: 'activo',
            predio_principal_id: principalId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear lugar de producción' });
    }
};

const getMyProductions = async (req, res) => {
    const productor_id = req.user.id;
    const nombre = normalizeText(req.query.nombre);
    const ubicacion = normalizeText(req.query.ubicacion);

    let query = `
        SELECT lp.id, lp.nombre, lp.numero_registro_ica, lp.departamento, lp.municipio,
               lp.vereda_direccion, lp.area_total_ha, lp.coordenadas_lat, lp.coordenadas_lng,
               lp.estado, lp.fecha_registro, lp.fecha_ultima_inspeccion, lp.fecha_proxima_inspeccion,
                             (
                                 SELECT p.nombre_identificacion
                                 FROM lugar_predios lpr
                                 JOIN predios_produccion p ON p.id = lpr.predio_id
                                 WHERE lpr.lugar_produccion_id = lp.id
                                 ORDER BY lpr.es_principal DESC, lpr.fecha_asociacion ASC, lpr.id ASC
                                 LIMIT 1
                             ) AS predio_principal,
               (
                 SELECT COUNT(*)
                 FROM lugar_predios lpr2
                 WHERE lpr2.lugar_produccion_id = lp.id
                             ) AS total_predios,
                             (
                                 SELECT GROUP_CONCAT(p.nombre_identificacion ORDER BY lpr3.es_principal DESC, p.nombre_identificacion ASC SEPARATOR ', ')
                                 FROM lugar_predios lpr3
                                 JOIN predios_produccion p ON p.id = lpr3.predio_id
                                 WHERE lpr3.lugar_produccion_id = lp.id
                             ) AS predios_asociados
        FROM lugares_produccion lp
        WHERE lp.productor_id = ?
    `;

    const params = [productor_id];

    if (nombre) {
        query += ` AND lp.nombre LIKE ?`;
        params.push(`%${nombre}%`);
    }

    if (ubicacion) {
        query += ` AND (
            lp.departamento LIKE ?
            OR lp.municipio LIKE ?
            OR lp.vereda_direccion LIKE ?
        )`;
        params.push(`%${ubicacion}%`, `%${ubicacion}%`, `%${ubicacion}%`);
    }

    query += ` ORDER BY lp.fecha_registro DESC`;

    try {
        const results = await queryAsync(query, params);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener lugares' });
    }
};

const getProductionById = async (req, res) => {
    try {
        const lugar = await mapLugarDetalle(req.params.id, req.user.id);
        if (!lugar) {
            return res.status(404).json({ message: 'Lugar de producción no encontrado' });
        }

        res.json(lugar);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const updateProduction = async (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;
    const nombre = req.body.nombre !== undefined ? normalizeText(req.body.nombre) : undefined;
    const area_total_ha = req.body.area_total_ha;
    const predio_ids = req.body.predio_ids !== undefined ? parseIdList(req.body.predio_ids) : undefined;
    const predio_principal_id = req.body.predio_principal_id !== undefined && req.body.predio_principal_id !== null && req.body.predio_principal_id !== ''
        ? Number(req.body.predio_principal_id)
        : undefined;
    const departamento = req.body.departamento !== undefined ? normalizeText(req.body.departamento) : undefined;
    const municipio = req.body.municipio !== undefined ? normalizeText(req.body.municipio) : undefined;
    const vereda_direccion = req.body.vereda_direccion !== undefined ? normalizeText(req.body.vereda_direccion) : undefined;
    const coordenadas_lat = normalizeCoordinate(req.body.coordenadas_lat);
    const coordenadas_lng = normalizeCoordinate(req.body.coordenadas_lng);

    if (area_total_ha !== undefined && (Number.isNaN(Number(area_total_ha)) || parseFloat(area_total_ha) <= 0)) {
        return res.status(400).json({ message: 'El área total debe ser un número mayor a cero' });
    }

    if (predio_ids !== undefined && predio_ids.length === 0) {
        return res.status(400).json({ message: 'Debe mantener al menos un predio asociado al lugar de producción' });
    }

    if (departamento !== undefined && !departamento) {
        return res.status(400).json({ message: 'El departamento no puede ser vacío' });
    }

    if (municipio !== undefined && !municipio) {
        return res.status(400).json({ message: 'El municipio no puede ser vacío' });
    }

    if (vereda_direccion !== undefined && !vereda_direccion) {
        return res.status(400).json({ message: 'La dirección de referencia no puede ser vacía' });
    }

    if (coordenadas_lat !== undefined && Number.isNaN(coordenadas_lat)) {
        return res.status(400).json({ message: 'La coordenada latitud no es válida' });
    }

    if (coordenadas_lng !== undefined && Number.isNaN(coordenadas_lng)) {
        return res.status(400).json({ message: 'La coordenada longitud no es válida' });
    }

    try {
        const actual = await mapLugarDetalle(id, productor_id);
        if (!actual) {
            return res.status(404).json({ message: 'Lugar de producción no encontrado' });
        }

        const fields = [];
        const values = [];

        if (nombre) {
            fields.push('nombre = ?');
            values.push(nombre);
        }

        if (area_total_ha !== undefined && area_total_ha !== null && area_total_ha !== '') {
            fields.push('area_total_ha = ?');
            values.push(area_total_ha);
        }

        const currentPredioIds = actual.predios.map((predio) => predio.id);
        const resolvedPredioIds = predio_ids || currentPredioIds;
        const resolvedPrincipalId = predio_principal_id !== undefined
            ? predio_principal_id
            : (actual.predios.find((predio) => predio.es_principal)?.id || resolvedPredioIds[0]);

        if (predio_ids !== undefined || predio_principal_id !== undefined) {
            const predios = await obtenerPrediosDelProductor(productor_id, resolvedPredioIds);
            if (predios.length !== resolvedPredioIds.length) {
                return res.status(400).json({ message: 'Uno o más predios seleccionados no existen o no están disponibles para este productor' });
            }

            if (!resolvedPredioIds.includes(resolvedPrincipalId)) {
                return res.status(400).json({ message: 'El predio principal debe estar dentro de los predios seleccionados' });
            }

            const ubicacion = resolverUbicacionDesdePredios(predios, resolvedPrincipalId);
            fields.push('departamento = ?', 'municipio = ?', 'vereda_direccion = ?', 'coordenadas_lat = ?', 'coordenadas_lng = ?');
            values.push(
                ubicacion.departamento,
                ubicacion.municipio,
                ubicacion.vereda_direccion,
                ubicacion.coordenadas_lat,
                ubicacion.coordenadas_lng
            );

            await reemplazarPrediosAsociados(id, resolvedPredioIds, resolvedPrincipalId);
        } else {
            const resolvedDepartamento = departamento !== undefined ? departamento : actual.departamento;
            const resolvedMunicipio = municipio !== undefined ? municipio : actual.municipio;

            if (departamento !== undefined || municipio !== undefined) {
                const ubicacionValida = await queryAsync(
                    `SELECT id
                     FROM predios_produccion
                     WHERE productor_id IN (?, 1)
                       AND departamento = ?
                       AND municipio = ?
                     LIMIT 1`,
                    [productor_id, resolvedDepartamento, resolvedMunicipio]
                );

                if (ubicacionValida.length === 0) {
                    return res.status(400).json({ message: 'La ubicación seleccionada no es válida (departamento/municipio)' });
                }
            }

            if (departamento !== undefined) {
                fields.push('departamento = ?');
                values.push(departamento);
            }

            if (municipio !== undefined) {
                fields.push('municipio = ?');
                values.push(municipio);
            }

            if (vereda_direccion !== undefined) {
                fields.push('vereda_direccion = ?');
                values.push(vereda_direccion);
            }

            if (coordenadas_lat !== undefined) {
                fields.push('coordenadas_lat = ?');
                values.push(coordenadas_lat);
            }

            if (coordenadas_lng !== undefined) {
                fields.push('coordenadas_lng = ?');
                values.push(coordenadas_lng);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
        }

        // Validar suma acumulada si se está cambiando el área
        if (area_total_ha !== undefined && area_total_ha !== null && area_total_ha !== '') {
            const prediosActuales = actual.predios;
            for (const predio of prediosActuales) {
                const sumRows = await queryAsync(
                    `SELECT COALESCE(SUM(lp.area_total_ha), 0) AS total_otros
                     FROM lugares_produccion lp
                     JOIN lugar_predios lpj ON lpj.lugar_produccion_id = lp.id
                     WHERE lpj.predio_id = ? AND lp.id != ?`,
                    [predio.id, id]
                );
                const totalOtros = parseFloat(sumRows[0].total_otros);
                const nuevaArea  = parseFloat(area_total_ha);
                const disponible = parseFloat(predio.area_ha) - totalOtros;
                if (nuevaArea > disponible) {
                    return res.status(400).json({
                        message: `Las hectáreas del lugar (${nuevaArea} ha) superan la capacidad disponible del predio "${predio.nombre_identificacion}". Disponible: ${disponible.toFixed(2)} ha de ${predio.area_ha} ha totales`
                    });
                }
            }
        }

        values.push(id, productor_id);
        await queryAsync(`UPDATE lugares_produccion SET ${fields.join(', ')} WHERE id = ? AND productor_id = ?`, values);

        res.json({ message: 'Lugar de producción actualizado ✅' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar' });
    }
};

const deleteProduction = async (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;

    try {
        const lugares = await queryAsync(`SELECT id FROM lugares_produccion WHERE id = ? AND productor_id = ?`, [id, productor_id]);
        if (lugares.length === 0) {
            return res.status(404).json({ message: 'Lugar de producción no encontrado' });
        }

        const lotes = await queryAsync(`SELECT COUNT(*) AS total FROM lotes WHERE lugar_produccion_id = ?`, [id]);
        const inspecciones = await obtenerInspeccionesLugar(id, productor_id);
        if (lotes[0].total > 0 || inspecciones.length > 0) {
            await queryAsync(`UPDATE lugares_produccion SET estado = 'inactivo' WHERE id = ?`, [id]);
            return res.json({ message: 'Lugar marcado como inactivo (tiene lotes o inspecciones asociadas, no se puede eliminar físicamente) ⚠️' });
        }

        await queryAsync(`DELETE FROM lugar_predios WHERE lugar_produccion_id = ?`, [id]);
        await queryAsync(`DELETE FROM lugares_produccion WHERE id = ?`, [id]);
        res.json({ message: 'Lugar de producción eliminado ✅' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar' });
    }
};

const getProductionForInspection = async (req, res) => {
    const lugarId = Number(req.params.id);

    if (!Number.isInteger(lugarId) || lugarId <= 0) {
        return res.status(400).json({ message: 'Id de lugar invalido' });
    }

    try {
        const lugarRows = await queryAsync(
            `SELECT id, nombre, departamento, municipio, vereda_direccion,
                    fecha_ultima_inspeccion, fecha_proxima_inspeccion
             FROM lugares_produccion
             WHERE id = ?`,
            [lugarId]
        );

        if (lugarRows.length === 0) {
            return res.status(404).json({ message: 'Lugar de produccion no encontrado' });
        }

        const lotesRows = await queryAsync(
            `SELECT l.id, l.codigo, l.estado,
                    p.nombre_identificacion AS predio_nombre,
                    c.id AS cultivo_id,
                    c.especie_id AS especie_id,
                    e.nombre AS especie_nombre,
                    c.variedad AS cultivo_variedad,
                    c.estado AS cultivo_estado
             FROM lotes l
             LEFT JOIN predios_produccion p ON p.id = l.predio_id
             LEFT JOIN cultivos c ON c.lote_id = l.id AND c.estado = 'activo'
             LEFT JOIN especies e ON e.id = c.especie_id
             WHERE l.lugar_produccion_id = ?
             ORDER BY l.codigo ASC, l.id ASC`,
            [lugarId]
        );

        res.json({
            ...lugarRows[0],
            lotes: lotesRows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener datos del lugar para inspeccion' });
    }
};

const registrarUltimaInspeccion = async (req, res) => {
    const lugarId = Number(req.params.id);

    if (!Number.isInteger(lugarId) || lugarId <= 0) {
        return res.status(400).json({ message: 'Id de lugar invalido' });
    }

    try {
        const lugarRows = await queryAsync(
            'SELECT id FROM lugares_produccion WHERE id = ?',
            [lugarId]
        );

        if (lugarRows.length === 0) {
            return res.status(404).json({ message: 'Lugar de produccion no encontrado' });
        }

        await queryAsync(
            `UPDATE lugares_produccion
             SET fecha_ultima_inspeccion = NOW(),
                 fecha_proxima_inspeccion = DATE_ADD(NOW(), INTERVAL 6 MONTH)
             WHERE id = ?`,
            [lugarId]
        );

        res.json({ message: 'Fecha de inspeccion actualizada', lugar_id: lugarId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar fecha de inspeccion' });
    }
};

module.exports = {
    createProduction,
    getMyProductions,
    getProductionById,
    updateProduction,
    deleteProduction,
    getProductionForInspection,
    registrarUltimaInspeccion,
};