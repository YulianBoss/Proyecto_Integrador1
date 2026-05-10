const axios = require('axios');
const db = require('../config/db');

const PRODUCTION_URL = process.env.PRODUCTION_SERVICE_URL || 'http://localhost:58761';

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const toEstado = (value) => (String(value || '').toLowerCase() === 'inactivo' ? 'inactivo' : 'activo');
const toRiesgo = (value) => {
    const riesgo = String(value || '').toLowerCase();
    return ['bajo', 'medio', 'alto'].includes(riesgo) ? riesgo : 'medio';
};

const normalize = (value, maxLen = 255) => String(value || '').trim().slice(0, maxLen);

const getEspeciesCatalogo = async (authHeader) => {
    const response = await axios.get(
        `${PRODUCTION_URL}/api/especies`,
        { headers: { Authorization: authHeader } }
    );
    return Array.isArray(response.data) ? response.data : [];
};

const mapEspeciesById = async (authHeader) => {
    const especies = await getEspeciesCatalogo(authHeader);
    const map = new Map();
    especies.forEach((e) => {
        map.set(Number(e.id), {
            id: Number(e.id),
            nombre: e.nombre || `Especie #${e.id}`,
        });
    });
    return map;
};

const parseEspecieId = (value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

const parseCultivoIds = (value) => {
    const values = Array.isArray(value)
        ? value
        : Array.isArray(value?.cultivo_ids)
            ? value.cultivo_ids
            : [];

    return [...new Set(values
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0))];
};

const getCultivosSeleccionados = async (authHeader, cultivoIds) => {
    const especiesMap = await mapEspeciesById(authHeader);
    const cultivos = cultivoIds
        .map((id) => especiesMap.get(Number(id)))
        .filter(Boolean);

    return {
        especiesMap,
        cultivos,
    };
};

const syncPlagaCultivos = async (plagaId, cultivos) => {
    await queryAsync('DELETE FROM plaga_cultivos WHERE plaga_id = ?', [plagaId]);

    if (!cultivos.length) return;

    const values = cultivos.map(() => '(?, ?, ?)').join(', ');
    const params = cultivos.flatMap((cultivo) => [plagaId, cultivo.id, cultivo.nombre]);

    await queryAsync(
        `INSERT INTO plaga_cultivos (plaga_id, cultivo_id, cultivo_nombre)
         VALUES ${values}`,
        params
    );
};

const getCultivosPorPlaga = async (plagaIds, authHeader) => {
    if (!plagaIds.length) return new Map();

    const placeholders = plagaIds.map(() => '?').join(', ');
    const rows = await queryAsync(
        `SELECT plaga_id, cultivo_id, cultivo_nombre
         FROM plaga_cultivos
         WHERE plaga_id IN (${placeholders})
         ORDER BY cultivo_nombre ASC`,
        plagaIds
    );

    const especiesMap = await mapEspeciesById(authHeader);
    const result = new Map();

    rows.forEach((row) => {
        const cultivoId = Number(row.cultivo_id);
        const cultivo = especiesMap.get(cultivoId);
        const item = {
            id: cultivoId,
            nombre: cultivo?.nombre || row.cultivo_nombre || `Cultivo #${cultivoId}`,
        };

        if (!result.has(Number(row.plaga_id))) {
            result.set(Number(row.plaga_id), []);
        }

        result.get(Number(row.plaga_id)).push(item);
    });

    return result;
};

const createPlaga = async (req, res) => {
    const nombre_comun = normalize(req.body.nombre_comun, 180);
    const nombre_cientifico = normalize(req.body.nombre_cientifico, 180);
    const descripcion = normalize(req.body.descripcion, 2000);
    const nivel_riesgo = toRiesgo(req.body.nivel_riesgo);
    const cultivo_ids = parseCultivoIds(req.body.cultivo_ids || req.body);

    if (!nombre_comun || !nombre_cientifico) {
        return res.status(400).json({
            message: 'Campos obligatorios incompletos: nombre comun y nombre cientifico son requeridos',
            code: 'CAMPOS_OBLIGATORIOS',
            fields: {
                nombre_comun: !nombre_comun,
                nombre_cientifico: !nombre_cientifico,
            },
        });
    }

    if (cultivo_ids.length === 0) {
        return res.status(400).json({
            message: 'Debes seleccionar al menos un cultivo asociado para la plaga',
            code: 'SIN_CULTIVOS_ASOCIADOS',
        });
    }

    try {
        const { cultivos } = await getCultivosSeleccionados(req.headers.authorization, cultivo_ids);
        if (cultivos.length !== cultivo_ids.length) {
            return res.status(400).json({
                message: 'Uno o mas cultivos seleccionados no existen o estan inactivos',
                code: 'CULTIVO_INVALIDO',
            });
        }

        const dupNombreComun = await queryAsync(
            'SELECT id FROM plagas WHERE LOWER(nombre_comun) = LOWER(?) LIMIT 1',
            [nombre_comun]
        );
        if (dupNombreComun.length > 0) {
            return res.status(400).json({
                message: 'Ya existe una plaga registrada con ese nombre comun',
                code: 'NOMBRE_COMUN_DUPLICADO',
            });
        }

        const dup = await queryAsync(
            'SELECT id FROM plagas WHERE LOWER(nombre_cientifico) = LOWER(?) LIMIT 1',
            [nombre_cientifico]
        );
        if (dup.length > 0) {
            return res.status(400).json({
                message: 'Ya existe una plaga registrada con ese nombre cientifico',
                code: 'NOMBRE_CIENTIFICO_DUPLICADO',
            });
        }

        const insert = await queryAsync(
            `INSERT INTO plagas (nombre_comun, nombre_cientifico, descripcion, nivel_riesgo, especie_id, estado)
             VALUES (?, ?, ?, ?, ?, 'activo')`,
            [nombre_comun, nombre_cientifico, descripcion || null, nivel_riesgo, cultivos[0].id]
        );

        await syncPlagaCultivos(insert.insertId, cultivos);

        res.status(201).json({ message: 'Plaga creada correctamente', id: insert.insertId });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY') {
            const sqlMessage = String(err?.sqlMessage || '');
            if (sqlMessage.toLowerCase().includes('nombre_comun')) {
                return res.status(400).json({
                    message: 'Ya existe una plaga registrada con ese nombre comun',
                    code: 'NOMBRE_COMUN_DUPLICADO',
                });
            }
            return res.status(400).json({
                message: 'Ya existe una plaga registrada con ese nombre cientifico',
                code: 'NOMBRE_CIENTIFICO_DUPLICADO',
            });
        }
        console.error(err);
        res.status(500).json({ message: 'Error al crear plaga' });
    }
};

const getPlagas = async (req, res) => {
    const nombre = normalize(req.query.nombre || req.query.q, 180);
    const estado = req.query.estado ? toEstado(req.query.estado) : '';
    const cultivo_id = parseEspecieId(req.query.cultivo_id || req.query.especie_id);

    let query = `
        SELECT p.id, p.nombre_comun, p.nombre_cientifico, p.descripcion,
               p.nivel_riesgo, p.especie_id, p.estado, p.fecha_registro
        FROM plagas p
        WHERE 1 = 1
    `;
    const params = [];

    if (nombre) {
        query += ' AND (p.nombre_comun LIKE ? OR p.nombre_cientifico LIKE ?)';
        params.push(`%${nombre}%`, `%${nombre}%`);
    }

    if (estado) {
        query += ' AND p.estado = ?';
        params.push(estado);
    }

    if (cultivo_id) {
        query += ' AND EXISTS (SELECT 1 FROM plaga_cultivos pc WHERE pc.plaga_id = p.id AND pc.cultivo_id = ?)';
        params.push(cultivo_id);
    }

    query += ' ORDER BY p.nombre_comun ASC';

    try {
        const rows = await queryAsync(query, params);
        const especiesMap = await mapEspeciesById(req.headers.authorization);
        const cultivosMap = await getCultivosPorPlaga(rows.map((row) => Number(row.id)), req.headers.authorization);

        res.json(rows.map((row) => {
            const especie = especiesMap.get(Number(row.especie_id));
            const cultivos_asociados = cultivosMap.get(Number(row.id)) || [];
            return {
                ...row,
                especie_id: row.especie_id ? Number(row.especie_id) : null,
                especie_nombre: especie?.nombre || null,
                cultivo_ids: cultivos_asociados.map((cultivo) => cultivo.id),
                cultivos_asociados,
                cultivos_asociados_texto: cultivos_asociados.map((cultivo) => cultivo.nombre).join(', '),
            };
        }));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al consultar plagas' });
    }
};

const getPlagaById = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de plaga invalido' });
    }

    try {
        const rows = await queryAsync('SELECT * FROM plagas WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Plaga no encontrada' });
        }

        const usos = await queryAsync(
            `SELECT COUNT(*) AS total
             FROM inspeccion_lote_plagas
             WHERE plaga_id = ?`,
            [id]
        );

        const tieneInspecciones = Number(usos?.[0]?.total || 0) > 0;
        const plaga = rows[0];
        const especiesMap = await mapEspeciesById(req.headers.authorization);
        const especie = especiesMap.get(Number(plaga.especie_id));
        const cultivosMap = await getCultivosPorPlaga([id], req.headers.authorization);
        const cultivos_asociados = cultivosMap.get(id) || [];

        res.json({
            ...plaga,
            especie_id: plaga.especie_id ? Number(plaga.especie_id) : null,
            especie_nombre: especie?.nombre || null,
            cultivo_ids: cultivos_asociados.map((cultivo) => cultivo.id),
            cultivos_asociados,
            tiene_inspecciones: tieneInspecciones,
            puede_editar_nombre_cientifico: !tieneInspecciones,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener detalle de la plaga' });
    }
};

const updatePlaga = async (req, res) => {
    const id = Number(req.params.id);
    const nombre_comun = normalize(req.body.nombre_comun, 180);
    const nombre_cientifico = normalize(req.body.nombre_cientifico, 180);
    const descripcion = normalize(req.body.descripcion, 2000);
    const nivel_riesgo = toRiesgo(req.body.nivel_riesgo);
    const cultivo_ids = parseCultivoIds(req.body.cultivo_ids || req.body);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de plaga invalido' });
    }

    if (!nombre_comun || !nombre_cientifico) {
        return res.status(400).json({
            message: 'Campos obligatorios incompletos: nombre comun y nombre cientifico son requeridos',
            code: 'CAMPOS_OBLIGATORIOS',
            fields: {
                nombre_comun: !nombre_comun,
                nombre_cientifico: !nombre_cientifico,
            },
        });
    }

    if (cultivo_ids.length === 0) {
        return res.status(400).json({ message: 'Debes seleccionar al menos un cultivo asociado', code: 'SIN_CULTIVOS_ASOCIADOS' });
    }

    try {
        const rows = await queryAsync('SELECT * FROM plagas WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Plaga no encontrada' });

        const { cultivos } = await getCultivosSeleccionados(req.headers.authorization, cultivo_ids);
        if (cultivos.length !== cultivo_ids.length) {
            return res.status(400).json({
                message: 'Uno o mas cultivos seleccionados no existen o estan inactivos',
                code: 'CULTIVO_INVALIDO',
            });
        }

        const plagaActual = rows[0];

        const dupNombreComun = await queryAsync(
            `SELECT id FROM plagas
             WHERE LOWER(nombre_comun) = LOWER(?)
               AND id <> ?
             LIMIT 1`,
            [nombre_comun, id]
        );
        if (dupNombreComun.length > 0) {
            return res.status(400).json({
                message: 'Ya existe una plaga registrada con ese nombre comun',
                code: 'NOMBRE_COMUN_DUPLICADO',
            });
        }

        if (nombre_cientifico !== plagaActual.nombre_cientifico) {
            const usos = await queryAsync(
                `SELECT COUNT(*) AS total
                 FROM inspeccion_lote_plagas
                 WHERE plaga_id = ?`,
                [id]
            );
            if (Number(usos?.[0]?.total || 0) > 0) {
                return res.status(400).json({
                    message: 'El nombre cientifico no puede modificarse porque la plaga tiene inspecciones asociadas',
                    code: 'NOMBRE_CIENTIFICO_BLOQUEADO',
                });
            }

            const dup = await queryAsync(
                `SELECT id FROM plagas
                 WHERE LOWER(nombre_cientifico) = LOWER(?)
                   AND id <> ?
                 LIMIT 1`,
                [nombre_cientifico, id]
            );
            if (dup.length > 0) {
                return res.status(400).json({
                    message: 'Ya existe una plaga registrada con ese nombre cientifico',
                    code: 'NOMBRE_CIENTIFICO_DUPLICADO',
                });
            }
        }

        await queryAsync(
            `UPDATE plagas
             SET nombre_comun = ?,
                 nombre_cientifico = ?,
                 descripcion = ?,
                 nivel_riesgo = ?,
                 especie_id = ?
             WHERE id = ?`,
            [nombre_comun, nombre_cientifico, descripcion || null, nivel_riesgo, cultivos[0].id, id]
        );

        await syncPlagaCultivos(id, cultivos);

        res.json({ message: 'Plaga actualizada correctamente' });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY') {
            const sqlMessage = String(err?.sqlMessage || '');
            if (sqlMessage.toLowerCase().includes('nombre_comun')) {
                return res.status(400).json({
                    message: 'Ya existe una plaga registrada con ese nombre comun',
                    code: 'NOMBRE_COMUN_DUPLICADO',
                });
            }
            return res.status(400).json({
                message: 'Ya existe una plaga registrada con ese nombre cientifico',
                code: 'NOMBRE_CIENTIFICO_DUPLICADO',
            });
        }
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar plaga' });
    }
};

const updateEstado = async (req, res) => {
    const id = Number(req.params.id);
    const estado = toEstado(req.body.estado);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de plaga invalido' });
    }

    try {
        const rows = await queryAsync('SELECT id FROM plagas WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Plaga no encontrada' });

        if (estado === 'inactivo') {
            const enCurso = await queryAsync(
                `SELECT COUNT(*) AS total
                 FROM inspeccion_lote_plagas p
                 JOIN inspeccion_lotes il ON il.id = p.inspeccion_lote_id
                 JOIN inspecciones i ON i.id = il.inspeccion_id
                 WHERE p.plaga_id = ?
                   AND i.estado IN ('pendiente', 'en_proceso')`,
                [id]
            );
            if (Number(enCurso?.[0]?.total || 0) > 0) {
                return res.status(400).json({
                    message: 'No se puede desactivar esta plaga porque esta siendo usada en inspecciones en curso. Espera a que finalicen.',
                    code: 'DESACTIVACION_NO_PERMITIDA',
                });
            }
        }

        await queryAsync('UPDATE plagas SET estado = ? WHERE id = ?', [estado, id]);
        res.json({ message: `Plaga ${estado === 'activo' ? 'activada' : 'desactivada'} correctamente` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar estado de la plaga' });
    }
};

const deletePlaga = async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de plaga invalido' });
    }

    try {
        const rows = await queryAsync('SELECT id FROM plagas WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Plaga no encontrada' });

        const dependencias = await queryAsync(
            `SELECT COUNT(*) AS total
             FROM inspeccion_lote_plagas
             WHERE plaga_id = ?`,
            [id]
        );
        if (Number(dependencias?.[0]?.total || 0) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la plaga porque tiene inspecciones historicas asociadas. Se recomienda desactivarla.',
                code: 'ELIMINACION_NO_PERMITIDA',
            });
        }

        await queryAsync('DELETE FROM plaga_cultivos WHERE plaga_id = ?', [id]);
        await queryAsync('DELETE FROM plagas WHERE id = ?', [id]);
        res.json({ message: 'Plaga eliminada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar plaga' });
    }
};

const listEspeciesDisponibles = async (req, res) => {
    try {
        const especies = await getEspeciesCatalogo(req.headers.authorization);
        res.json(especies.map((e) => ({ id: Number(e.id), nombre: e.nombre || `Especie #${e.id}` })));
    } catch (err) {
        console.error(err);
        res.status(502).json({ message: 'No fue posible consultar especies desde production-service' });
    }
};

module.exports = {
    createPlaga,
    getPlagas,
    getPlagaById,
    updatePlaga,
    updateEstado,
    deletePlaga,
    listEspeciesDisponibles,
};
