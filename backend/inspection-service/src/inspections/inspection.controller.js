const db = require('../config/db');
const axios = require('axios');

const PRODUCTION_URL = process.env.PRODUCTION_SERVICE_URL || 'http://localhost:58761';
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const beginTransactionAsync = () => new Promise((resolve, reject) => {
    db.beginTransaction((err) => (err ? reject(err) : resolve()));
});

const commitAsync = () => new Promise((resolve, reject) => {
    db.commit((err) => (err ? reject(err) : resolve()));
});

const rollbackAsync = () => new Promise((resolve) => {
    db.rollback(() => resolve());
});

const clampPercent = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
};

const calcularNivelRiesgo = (porcentajeTotal) => {
    if (porcentajeTotal <= 5) return 'bajo';
    if (porcentajeTotal <= 15) return 'medio';
    return 'alto';
};

const normalizarPlaga = (value) => String(value || '').trim().slice(0, 180);

const logAccionTecnico = (accion, tecnicoId, inspeccionId, detalle = null) => {
    const texto = `TECNICO: ${accion} | tecnico=${tecnicoId} | inspeccion=${inspeccionId}` + (detalle ? ` | detalle=${detalle}` : '')
    console.info(texto)
};

const obtenerNombreUsuarioPorId = async (authHeader, userId) => {
    const parsedId = Number(userId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) return null;

    try {
        const resp = await axios.get(
            `${AUTH_URL}/api/users/public/${parsedId}`,
            { headers: { Authorization: authHeader } }
        );
        const user = resp?.data || null;
        return user?.nombre_completo || user?.correo || null;
    } catch (err) {
        console.warn(`No se pudo resolver nombre de usuario ${parsedId}:`, err.message);
        return null;
    }
};

const obtenerTecnicoConMenorCarga = async (authHeader, departamento, municipio) => {
    try {
        const params = new URLSearchParams();
        if (departamento) params.append('departamento', departamento);
        if (municipio) params.append('municipio', municipio);

        const resp = await axios.get(
            `${AUTH_URL}/api/users/tecnicos?${params.toString()}`,
            { headers: { Authorization: authHeader } }
        );

        const tecnicos = resp.data || [];
        if (tecnicos.length === 0) {
            return { asistenteId: null, motivo: 'sin_tecnicos_zona' };
        }

        const cargas = await Promise.all(
            tecnicos.map((t) => new Promise((resolve) => {
                db.query(
                    `SELECT COUNT(*) AS total
                     FROM inspecciones
                     WHERE asistente_id = ? AND estado IN ('pendiente', 'en_proceso')`,
                    [t.id],
                    (err, rows) => resolve({ id: t.id, carga: err ? 999 : Number(rows?.[0]?.total || 0) })
                );
            }))
        );

        const sinCarga = cargas.filter((c) => c.carga === 0);
        if (sinCarga.length > 0) {
            const elegido = sinCarga[Math.floor(Math.random() * sinCarga.length)];
            return { asistenteId: elegido.id, motivo: null };
        }

        const minCarga = Math.min(...cargas.map((c) => c.carga));
        if (!Number.isFinite(minCarga) || minCarga >= 999) {
            return { asistenteId: null, motivo: 'error_asignacion_automatica' };
        }

        const candidatos = cargas.filter((c) => c.carga === minCarga);
        const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
        return { asistenteId: elegido.id, motivo: null };
    } catch (err) {
        console.warn('No se pudo consultar tecnicos al auth-service:', err.message);
        return { asistenteId: null, motivo: 'error_asignacion_automatica' };
    }
};

const verificarInspeccionTecnico = async (inspeccionId, tecnicoId) => {
    const rows = await queryAsync(
        `SELECT * FROM inspecciones WHERE id = ? AND asistente_id = ?`,
        [inspeccionId, tecnicoId]
    );
    return rows[0] || null;
};

const obtenerLugarYLotesActivos = async (authHeader, lugarId) => {
    const resp = await axios.get(
        `${PRODUCTION_URL}/api/production/inspeccion/${lugarId}`,
        { headers: { Authorization: authHeader } }
    );
    return resp.data;
};

const getPlagasSugeridasPorInspeccion = async (lotes) => {
    const especieIds = [...new Set(
        (Array.isArray(lotes) ? lotes : [])
            .map((l) => Number(l.especie_id))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];

    let rows = [];
    if (especieIds.length > 0) {
        rows = await queryAsync(
            `SELECT DISTINCT p.id, p.nombre_comun, p.nivel_riesgo
             FROM plagas p
             LEFT JOIN plaga_cultivos pc ON pc.plaga_id = p.id
             WHERE p.estado = 'activo'
             AND pc.cultivo_id IN (?)
             ORDER BY p.nombre_comun ASC`,
            [especieIds]
        );
    }

    return rows.map((row) => ({
        id: Number(row.id),
        nombre: row.nombre_comun,
        nivel_riesgo: row.nivel_riesgo,
    }));
};

const sincronizarLotesInspeccion = async (inspeccion, authHeader) => {
    const lugarData = await obtenerLugarYLotesActivos(authHeader, inspeccion.lugar_produccion_id);
    const lotesActivos = Array.isArray(lugarData?.lotes) ? lugarData.lotes.filter((l) => l.estado === 'activo') : [];
    const lotesMetaMap = new Map(
        lotesActivos.map((l) => [Number(l.id), {
            especie_id: l.especie_id ? Number(l.especie_id) : null,
            especie_nombre: l.especie_nombre || null,
            cultivo_id: l.cultivo_id ? Number(l.cultivo_id) : null,
            area_ha: l.area_ha ? Number(l.area_ha) : null,
            predio_nombre: l.predio_nombre || null,
            predio_id: l.predio_id ? Number(l.predio_id) : null,
            predio_municipio: l.predio_municipio || null,
            predio_departamento: l.predio_departamento || null,
            predio_vereda: l.predio_vereda || null,
            fecha_siembra: l.fecha_siembra || null,
        }])
    );

    for (const lote of lotesActivos) {
        await queryAsync(
            `INSERT INTO inspeccion_lotes (inspeccion_id, lote_id, lote_codigo, predio_nombre)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 lote_codigo = VALUES(lote_codigo),
                 predio_nombre = VALUES(predio_nombre)`,
            [inspeccion.id, lote.id, lote.codigo || null, lote.predio_nombre || null]
        );
    }

    const lotesEvaluacion = await queryAsync(
        `SELECT id, inspeccion_id, lote_id, lote_codigo, predio_nombre,
                total_plantas_inspeccionadas, observaciones_lote, fecha_evaluacion
         FROM inspeccion_lotes
         WHERE inspeccion_id = ?
         ORDER BY lote_codigo ASC, lote_id ASC`,
        [inspeccion.id]
    );

    const plagas = await queryAsync(
        `SELECT inspeccion_lote_id, plaga_id, plaga_nombre, plantas_afectadas
         FROM inspeccion_lote_plagas
         WHERE inspeccion_lote_id IN (
            SELECT id FROM inspeccion_lotes WHERE inspeccion_id = ?
         )
         ORDER BY plaga_nombre ASC`,
        [inspeccion.id]
    );

    const plagasPorLoteEval = plagas.reduce((acc, item) => {
        if (!acc[item.inspeccion_lote_id]) acc[item.inspeccion_lote_id] = [];
        acc[item.inspeccion_lote_id].push({
            plaga_id: item.plaga_id ? Number(item.plaga_id) : null,
            plaga_nombre: item.plaga_nombre,
            plantas_afectadas: Number(item.plantas_afectadas || 0),
        });
        return acc;
    }, {});

    const lotesConEstado = lotesEvaluacion.map((loteEval) => ({
        ...loteEval,
        evaluado: loteEval.fecha_evaluacion !== null && loteEval.fecha_evaluacion !== undefined,
        total_plantas_inspeccionadas: Number(loteEval.total_plantas_inspeccionadas || 0),
        especie_id: lotesMetaMap.get(Number(loteEval.lote_id))?.especie_id || null,
        especie_nombre: lotesMetaMap.get(Number(loteEval.lote_id))?.especie_nombre || null,
        cultivo_id: lotesMetaMap.get(Number(loteEval.lote_id))?.cultivo_id || null,
        area_ha: lotesMetaMap.get(Number(loteEval.lote_id))?.area_ha || null,
        predio_id: lotesMetaMap.get(Number(loteEval.lote_id))?.predio_id || null,
        predio_municipio: lotesMetaMap.get(Number(loteEval.lote_id))?.predio_municipio || null,
        predio_departamento: lotesMetaMap.get(Number(loteEval.lote_id))?.predio_departamento || null,
        predio_vereda: lotesMetaMap.get(Number(loteEval.lote_id))?.predio_vereda || null,
        fecha_siembra: lotesMetaMap.get(Number(loteEval.lote_id))?.fecha_siembra || null,
        plagas: plagasPorLoteEval[loteEval.id] || [],
    }));

    return {
        lugar: {
            id: lugarData.id,
            nombre: lugarData.nombre,
            departamento: lugarData.departamento,
            municipio: lugarData.municipio,
            vereda_direccion: lugarData.vereda_direccion,
        },
        lotes: lotesConEstado,
    };
};

const registrarActualizacionUltimaInspeccion = async (authHeader, lugarId) => {
    try {
        await axios.patch(
            `${PRODUCTION_URL}/api/production/inspeccion/${lugarId}/ultima-inspeccion`,
            {},
            { headers: { Authorization: authHeader } }
        );
    } catch (err) {
        console.warn('No se pudo actualizar fecha de ultima inspeccion en production-service:', err.message);
    }
};

const calcularMetricasConsolidadas = async (inspeccionId) => {
    const lotes = await queryAsync(
        `SELECT id, lote_id, lote_codigo, predio_nombre, total_plantas_inspeccionadas
         FROM inspeccion_lotes
         WHERE inspeccion_id = ?
         ORDER BY lote_codigo ASC, lote_id ASC`,
        [inspeccionId]
    );

    const plagasRows = await queryAsync(
        `SELECT il.lote_id, il.lote_codigo, il.predio_nombre, il.total_plantas_inspeccionadas,
                p.plaga_nombre, p.plantas_afectadas
         FROM inspeccion_lotes il
         LEFT JOIN inspeccion_lote_plagas p ON p.inspeccion_lote_id = il.id
         WHERE il.inspeccion_id = ?
         ORDER BY il.lote_id ASC, p.plaga_nombre ASC`,
        [inspeccionId]
    );

    const porLote = {};
    const totalPorPlaga = {};
    let totalPlantasInspeccionadas = 0;
    let totalPlantasAfectadas = 0;

    lotes.forEach((lote) => {
        const key = String(lote.lote_id);
        porLote[key] = {
            lote_id: lote.lote_id,
            lote_codigo: lote.lote_codigo,
            predio_nombre: lote.predio_nombre,
            total_plantas_inspeccionadas: Number(lote.total_plantas_inspeccionadas || 0),
            plagas: [],
        };
        totalPlantasInspeccionadas += Number(lote.total_plantas_inspeccionadas || 0);
    });

    plagasRows.forEach((row) => {
        if (!row.plaga_nombre) return;

        const loteKey = String(row.lote_id);
        const total = Number(row.total_plantas_inspeccionadas || 0);
        const afectadas = Number(row.plantas_afectadas || 0);
        const incidencia = total > 0 ? clampPercent((afectadas * 100) / total) : 0;

        porLote[loteKey].plagas.push({
            plaga_nombre: row.plaga_nombre,
            plantas_afectadas: afectadas,
            incidencia_porcentaje: Number(incidencia.toFixed(2)),
        });

        if (!totalPorPlaga[row.plaga_nombre]) {
            totalPorPlaga[row.plaga_nombre] = { plantas_afectadas: 0 };
        }
        totalPorPlaga[row.plaga_nombre].plantas_afectadas += afectadas;
        totalPlantasAfectadas += afectadas;
    });

    const resumenPlagas = Object.entries(totalPorPlaga).map(([plaga_nombre, data]) => {
        const incidencia = totalPlantasInspeccionadas > 0
            ? clampPercent((data.plantas_afectadas * 100) / totalPlantasInspeccionadas)
            : 0;
        return {
            plaga_nombre,
            plantas_afectadas: data.plantas_afectadas,
            incidencia_porcentaje: Number(incidencia.toFixed(2)),
        };
    }).sort((a, b) => b.incidencia_porcentaje - a.incidencia_porcentaje);

    const porcentajeTotal = totalPlantasInspeccionadas > 0
        ? clampPercent((totalPlantasAfectadas * 100) / totalPlantasInspeccionadas)
        : 0;

    const nivelRiesgo = calcularNivelRiesgo(porcentajeTotal);

    return {
        lotes: Object.values(porLote),
        resumen_plagas: resumenPlagas,
        total_plantas_inspeccionadas: totalPlantasInspeccionadas,
        total_plantas_afectadas: totalPlantasAfectadas,
        porcentaje_infeccion_total: Number(porcentajeTotal.toFixed(2)),
        nivel_riesgo: nivelRiesgo,
    };
};

const solicitarInspeccion = async (req, res) => {
    const { lugar_produccion_id, fecha_solicitada } = req.body;
    const productor_id = req.user.id;
    let productor_nombre = req.user.nombre_completo || req.user.nombre || req.user.correo || null;

    const lugarId = Number(lugar_produccion_id);

    if (!Number.isInteger(lugarId) || lugarId <= 0 || !fecha_solicitada) {
        return res.status(400).json({ message: 'Debes enviar lugar_produccion_id y fecha_solicitada' });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fecha_solicitada);
    if (Number.isNaN(fecha.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha invalido. Usa YYYY-MM-DD' });
    }
    if (fecha < hoy) {
        return res.status(400).json({ message: 'La fecha solicitada no puede ser anterior a la fecha actual' });
    }

    try {
        if (!productor_nombre) {
            productor_nombre = await obtenerNombreUsuarioPorId(req.headers.authorization, productor_id);
        }

        const lugar_produccion_id = lugarId;
        const loteCodigo = null;
        let predioNombre = null;

        let lugarDepto = null;
        let lugarMuni = null;
        let lugarNombre = null;
        try {
            const lugarResp = await axios.get(
                `${PRODUCTION_URL}/api/production/${lugar_produccion_id}`,
                { headers: { Authorization: req.headers.authorization } }
            );
            lugarDepto = lugarResp.data?.departamento || null;
            lugarMuni = lugarResp.data?.municipio || null;
            lugarNombre = lugarResp.data?.nombre || null;
            predioNombre = lugarResp.data?.predio_principal || null;

            const lotesLugar = Array.isArray(lugarResp.data?.lotes) ? lugarResp.data.lotes : [];
            const lotesActivos = lotesLugar.filter((l) => l.estado === 'activo');
            if (lotesActivos.length === 0) {
                return res.status(400).json({ message: 'El lugar seleccionado no tiene lotes activos para inspeccionar' });
            }
        } catch (e) {
            return res.status(404).json({ message: 'Lugar de produccion no encontrado o servicio de produccion no disponible' });
        }

        const activas = await queryAsync(
            `SELECT id FROM inspecciones
             WHERE lugar_produccion_id = ? AND estado IN ('pendiente', 'en_proceso')`,
            [lugar_produccion_id]
        );

        if (activas.length > 0) {
            return res.status(400).json({
                message: 'Ya existe una inspeccion pendiente o en proceso para este lugar de produccion. Espera a que finalice.',
            });
        }

        const asignacion = await obtenerTecnicoConMenorCarga(req.headers.authorization, lugarDepto, lugarMuni);
        const asistente_id = asignacion?.asistenteId ?? null;
        const sinAsistente = asistente_id === null;
        const motivoSinAsignacion = asignacion?.motivo || null;

        const result = await queryAsync(
            `INSERT INTO inspecciones
             (lugar_produccion_id, lote_id, productor_id, productor_nombre, asistente_id, estado, fecha_solicitud, fecha_programada,
              departamento, municipio, lote_codigo, lugar_nombre, predio_nombre)
             VALUES (?, ?, ?, ?, ?, 'pendiente', NOW(), ?, ?, ?, ?, ?, ?)`,
            [
                lugar_produccion_id,
                null,
                productor_id,
                productor_nombre,
                asistente_id,
                fecha_solicitada,
                lugarDepto,
                lugarMuni,
                loteCodigo,
                lugarNombre,
                predioNombre,
            ]
        );

        if (sinAsistente) {
            console.warn(
                `[NOTIFICAR_ADMIN] Inspeccion ${result.insertId} requiere asignacion manual. ` +
                `Lugar ${lugar_produccion_id} (${lugarMuni || 'N/A'} - ${lugarDepto || 'N/A'}). ` +
                `Motivo: ${motivoSinAsignacion || 'sin_tecnicos_zona'}`
            );
        }

        const mensajeSinAsignacion = motivoSinAsignacion === 'error_asignacion_automatica'
            ? 'Inspeccion registrada en estado pendiente de asignacion por error en asignacion automatica.'
            : 'Inspeccion registrada en estado pendiente de asignacion. No hay asistentes tecnicos disponibles en la zona.';

        return res.status(201).json({
            message: sinAsistente ? mensajeSinAsignacion : 'Inspeccion solicitada y asignada automaticamente.',
            inspeccion_id: result.insertId,
            lote_id: null,
            lote_codigo: null,
            predio_nombre: predioNombre,
            lugar_produccion_id,
            lugar_nombre: lugarNombre,
            fecha_solicitada,
            estado: 'pendiente',
            asistente_asignado: asistente_id,
            pendiente_asignacion: sinAsistente,
            motivo_asignacion: motivoSinAsignacion,
            notificacion_admin: sinAsistente,
        });
    } catch (error) {
        console.error(error);
        return res.status(502).json({
            message: 'Error al comunicarse con el servicio de produccion. Verifica que este activo.',
        });
    }
};

const getMisSolicitudes = async (req, res) => {
    const productor_id = req.user.id;
    const { estado } = req.query;

    let query = `
        SELECT id, lugar_produccion_id, lote_id, asistente_id, estado,
               fecha_solicitud, fecha_programada, fecha_inicio, fecha_cierre,
               lote_codigo, lugar_nombre, predio_nombre,
               concepto_tecnico
        FROM inspecciones
        WHERE productor_id = ?
    `;
    const params = [productor_id];

    if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
    }
    query += ' ORDER BY fecha_solicitud DESC';

    try {
        const results = await queryAsync(query, params);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener solicitudes' });
    }
};

const getInspecciones = async (req, res) => {
    const { id: userId, rol } = req.user;
    const { estado } = req.query;

    let query = `
        SELECT id, lugar_produccion_id, lote_id, productor_id, asistente_id, estado,
               fecha_solicitud, fecha_programada, fecha_inicio, fecha_cierre,
               lote_codigo, lugar_nombre, predio_nombre,
               observaciones_generales, recomendaciones, concepto_tecnico
        FROM inspecciones
        WHERE `;
    const params = [];

    if (rol === 'productor') {
        query += 'productor_id = ?';
        params.push(userId);
    } else if (rol === 'tecnico') {
        query += 'asistente_id = ?';
        params.push(userId);
    } else if (rol === 'admin') {
        query += '1';
    } else {
        return res.status(403).json({ message: 'Acceso denegado: rol inválido para listar inspecciones' });
    }

    if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
    }

    query += ' ORDER BY fecha_solicitud DESC';

    try {
        const results = await queryAsync(query, params);

        // Enrich with user names from auth-service
        let userMap = {};
        try {
            const userIds = [...new Set(
                results.flatMap(r => [r.productor_id, r.asistente_id]).filter(Boolean)
            )];
            if (userIds.length > 0) {
                const usersResp = await axios.get(
                    `${AUTH_URL}/api/users`,
                    { headers: { Authorization: req.headers.authorization } }
                );
                const users = usersResp.data || [];
                users.forEach(u => { 
                    userMap[u.id] = u.nombre_completo || u.nombre || u.correo || u.email; 
                });
            }
        } catch (enrichErr) {
            console.warn('No se pudo enriquecer con nombres de usuarios:', enrichErr.message);
        }

        // Enrich with predio/lugar names and user names
        const enriched = await Promise.all(results.map(async (item) => {
            let predio_nombre = item.predio_nombre;
            if (!predio_nombre && item.lote_id) {
                try {
                    const lotResp = await axios.get(
                        `${PRODUCTION_URL}/api/lots/${item.lote_id}`,
                        { headers: { Authorization: req.headers.authorization } }
                    );
                    predio_nombre = lotResp.data?.predio_nombre || lotResp.data?.nombre_identificacion || null;
                    if (predio_nombre) {
                        queryAsync('UPDATE inspecciones SET predio_nombre = ? WHERE id = ?', [predio_nombre, item.id]).catch(err => {
                            console.error('Error al guardar predio_nombre actualizado:', err.message);
                        });
                    }
                } catch (e) {
                    console.warn(`No se pudo recuperar predio_nombre para lote ${item.lote_id}:`, e.message);
                }
            }

            return {
                ...item,
                predio_nombre: predio_nombre || item.lugar_nombre || 'Predio General',
                productor_nombre: userMap[item.productor_id] || null,
                tecnico_nombre: userMap[item.asistente_id] || null,
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener inspecciones' });
    }
};

const getDetalleSolicitud = async (req, res) => {
    const { id } = req.params;
    const { rol, id: userId } = req.user;

    try {
        let query = `SELECT id, lugar_produccion_id, asistente_id, estado,
                            fecha_solicitud, fecha_programada, fecha_inicio, fecha_cierre,
                            lote_id, lote_codigo, lugar_nombre, predio_nombre,
                            observaciones_generales, recomendaciones, concepto_tecnico,
                            porcentaje_infeccion_total, nivel_riesgo, informe_json
                     FROM inspecciones
                     WHERE id = ?`;
        const params = [id];

        if (rol === 'productor') {
            query += ' AND productor_id = ?';
            params.push(userId);
        } else if (rol === 'tecnico') {
            query += ' AND asistente_id = ?';
            params.push(userId);
        } else if (rol !== 'admin') {
            return res.status(403).json({ message: 'Acceso denegado: rol inválido para ver esta inspección' });
        }

        const results = await queryAsync(query, params);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Inspección no encontrada o no tiene permiso para verla' });
        }

        const detalle = results[0];
        if (detalle.informe_json) {
            try {
                detalle.informe = JSON.parse(detalle.informe_json);
            } catch {
                detalle.informe = null;
            }
        }
        res.json(detalle);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const getInspeccionesTecnico = async (req, res) => {
    const asistente_id = req.user.id;
    const { estado } = req.query;

    let query = `
        SELECT i.id, i.lugar_produccion_id, i.lote_id, i.productor_id, i.asistente_id, i.estado,
               i.fecha_solicitud, i.fecha_programada, i.fecha_inicio, i.fecha_cierre,
               i.observaciones_generales, i.recomendaciones, i.concepto_tecnico,
               i.lote_codigo, i.lugar_nombre, i.predio_nombre,
               i.departamento, i.municipio,
               (
                 SELECT COUNT(*)
                 FROM inspeccion_lotes il
                 WHERE il.inspeccion_id = i.id
               ) AS total_lotes,
               (
                 SELECT COUNT(*)
                 FROM inspeccion_lotes il
                 WHERE il.inspeccion_id = i.id AND il.fecha_evaluacion IS NOT NULL
               ) AS lotes_evaluados
        FROM inspecciones i
        WHERE i.asistente_id = ?
    `;
    const params = [asistente_id];

    if (estado) {
        query += ' AND i.estado = ?';
        params.push(estado);
    } else {
        query += " AND i.estado IN ('pendiente', 'en_proceso', 'sin_lotes_inspeccionables')";
    }

    query += ' ORDER BY COALESCE(i.fecha_programada, DATE(i.fecha_solicitud)) ASC, i.fecha_solicitud ASC';

    try {
        const results = await queryAsync(query, params);
        res.json(results.map((item) => ({
            ...item,
            total_lotes: Number(item.total_lotes || 0),
            lotes_evaluados: Number(item.lotes_evaluados || 0),
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener inspecciones' });
    }
};

const getTecnicoDashboard = async (req, res) => {
    const asistente_id = req.user.id;

    try {
        const inspecciones = await queryAsync(
            `SELECT id, estado, porcentaje_infeccion_total, nivel_riesgo, fecha_solicitud, fecha_programada, fecha_cierre, observaciones_generales, recomendaciones, concepto_tecnico, lote_codigo, lugar_nombre
             FROM inspecciones
             WHERE asistente_id = ?`,
            [asistente_id]
        );

        const counts = inspecciones.reduce((acc, item) => {
            acc.total += 1;
            acc[item.estado] = (acc[item.estado] || 0) + 1;
            if (item.estado === 'completada') {
                acc.completadas += 1;
                if (Number.isFinite(Number(item.porcentaje_infeccion_total))) {
                    acc.riesgos.push(Number(item.porcentaje_infeccion_total));
                }
            }
            return acc;
        }, { total: 0, pendiente: 0, en_proceso: 0, completada: 0, sin_lotes_inspeccionables: 0, riesgos: [] });

        const porcentaje_completadas = counts.total === 0 ? 0 : Number(((counts.completadas / counts.total) * 100).toFixed(0));
        const promedio_riesgo = counts.riesgos.length === 0 ? 0 : Number((counts.riesgos.reduce((sum, value) => sum + value, 0) / counts.riesgos.length).toFixed(2));
        const nivel_riesgo_promedio = promedio_riesgo <= 5 ? 'bajo' : promedio_riesgo <= 15 ? 'medio' : 'alto';

        const lotesEvaluados = await queryAsync(
            `SELECT COUNT(*) AS total
             FROM inspeccion_lotes il
             JOIN inspecciones i ON i.id = il.inspeccion_id
             WHERE i.asistente_id = ?
               AND il.fecha_evaluacion IS NOT NULL`,
            [asistente_id]
        );

        const plagaRecurrenteRows = await queryAsync(
            `SELECT p.plaga_nombre, COUNT(*) AS apariciones, SUM(p.plantas_afectadas) AS total_afectadas
             FROM inspeccion_lote_plagas p
             JOIN inspeccion_lotes il ON il.id = p.inspeccion_lote_id
             JOIN inspecciones i ON i.id = il.inspeccion_id
             WHERE i.asistente_id = ?
             GROUP BY p.plaga_nombre
             ORDER BY apariciones DESC, total_afectadas DESC
             LIMIT 1`,
            [asistente_id]
        );

        const plaga_recurrente = plagaRecurrenteRows[0] || null;

        const nuevasAsignaciones = await queryAsync(
            `SELECT id, estado, lote_codigo, lugar_nombre, fecha_solicitud
             FROM inspecciones
             WHERE asistente_id = ?
               AND fecha_solicitud >= DATE_SUB(NOW(), INTERVAL 3 DAY)
             ORDER BY fecha_solicitud DESC
             LIMIT 5`,
            [asistente_id]
        );

        const proximasVencer = await queryAsync(
            `SELECT id, estado, lote_codigo, lugar_nombre, fecha_programada
             FROM inspecciones
             WHERE asistente_id = ?
               AND estado IN ('pendiente', 'en_proceso')
               AND fecha_programada IS NOT NULL
               AND fecha_programada <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
             ORDER BY fecha_programada ASC
             LIMIT 5`,
            [asistente_id]
        );

        const recientesCompletadas = await queryAsync(
            `SELECT id, estado, lote_codigo, lugar_nombre, fecha_cierre
             FROM inspecciones
             WHERE asistente_id = ?
               AND estado IN ('completada', 'sin_lotes_inspeccionables')
               AND fecha_cierre >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY fecha_cierre DESC
             LIMIT 5`,
            [asistente_id]
        );

        res.json({
            metrics: {
                total: counts.total,
                pendientes: counts.pendiente,
                en_proceso: counts.en_proceso,
                completadas: counts.completada,
                sin_lotes_inspeccionables: counts.sin_lotes_inspeccionables,
                porcentaje_completadas,
                promedio_porcentaje_infeccion: promedio_riesgo,
                nivel_riesgo_promedio,
                lotes_evaluados: Number(lotesEvaluados?.[0]?.total || 0),
                plaga_recurrente: plaga_recurrente ? {
                    nombre: plaga_recurrente.plaga_nombre,
                    apariciones: Number(plaga_recurrente.apariciones || 0),
                    total_afectadas: Number(plaga_recurrente.total_afectadas || 0),
                } : null,
            },
            notifications: {
                nuevas_asignaciones: nuevasAsignaciones,
                proximas_vencer: proximasVencer,
                recientes_completadas: recientesCompletadas,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener métricas del tablero técnico' });
    }
};

const getDetalleRealizacion = async (req, res) => {
    const asistente_id = req.user.id;
    const inspeccionId = Number(req.params.id);

    if (!Number.isInteger(inspeccionId) || inspeccionId <= 0) {
        return res.status(400).json({ message: 'Id de inspeccion invalido' });
    }

    try {
        const inspeccion = await verificarInspeccionTecnico(inspeccionId, asistente_id);
        if (!inspeccion) {
            return res.status(404).json({ message: 'Inspeccion no encontrada o no asignada al tecnico' });
        }

        const detalle = await sincronizarLotesInspeccion(inspeccion, req.headers.authorization);
        const lotesSolicitados = detalle.lotes;
        let productorNombre = inspeccion.productor_nombre || null;

        if (!productorNombre) {
            productorNombre = await obtenerNombreUsuarioPorId(req.headers.authorization, inspeccion.productor_id);
            if (productorNombre) {
                await queryAsync(
                    `UPDATE inspecciones
                     SET productor_nombre = ?
                     WHERE id = ?`,
                    [productorNombre, inspeccion.id]
                );
            }
        }
        
        const total = lotesSolicitados.length;
        const evaluados = lotesSolicitados.filter((l) => l.evaluado).length;
        const plagasSugeridas = await getPlagasSugeridasPorInspeccion(lotesSolicitados);

        let informe = null;
        try {
            if (inspeccion.informe_json) {
                informe = JSON.parse(inspeccion.informe_json);
            }
        } catch (parseError) {
            console.warn('No se pudo parsear informe_json para inspeccion', inspeccionId);
            informe = null;
        }

        res.json({
            inspeccion: {
                id: inspeccion.id,
                estado: inspeccion.estado,
                fecha_programada: inspeccion.fecha_programada,
                fecha_solicitud: inspeccion.fecha_solicitud,
                fecha_inicio: inspeccion.fecha_inicio,
                fecha_cierre: inspeccion.fecha_cierre,
                observaciones_generales: inspeccion.observaciones_generales,
                recomendaciones: inspeccion.recomendaciones,
                concepto_tecnico: inspeccion.concepto_tecnico,
                productor_nombre: productorNombre || 'No registrado',
                lote_id_solicitado: inspeccion.lote_id || null,
            },
            lugar: detalle.lugar,
            lotes: lotesSolicitados,
            resumen: {
                total_lotes: total,
                lotes_evaluados: evaluados,
                lotes_pendientes: total - evaluados,
                todos_evaluados: total > 0 && total === evaluados,
            },
            plagas_sugeridas: plagasSugeridas,
            informe,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener detalle de realizacion' });
    }
};

const asignarTecnicoManual = async (req, res) => {
    const inspeccionId = Number(req.params.id);
    const tecnicoId = Number(req.body.tecnico_id);

    if (!Number.isInteger(inspeccionId) || inspeccionId <= 0) {
        return res.status(400).json({ message: 'Id de inspeccion invalido' });
    }

    if (!Number.isInteger(tecnicoId) || tecnicoId <= 0) {
        return res.status(400).json({ message: 'Debes enviar un tecnico_id valido' });
    }

    try {
        const inspecciones = await queryAsync(
            `SELECT id, estado
             FROM inspecciones
             WHERE id = ?`,
            [inspeccionId]
        );

        if (inspecciones.length === 0) {
            return res.status(404).json({ message: 'Inspeccion no encontrada' });
        }

        if (inspecciones[0].estado !== 'pendiente') {
            return res.status(400).json({ message: 'Solo puedes reasignar inspecciones en estado pendiente' });
        }

        let tecnicoNombre = null;
        try {
            const tecnicoResp = await axios.get(
                `${AUTH_URL}/api/users/${tecnicoId}`,
                { headers: { Authorization: req.headers.authorization } }
            );
            const tecnico = tecnicoResp.data || null;
            if (!tecnico || tecnico.rol !== 'tecnico') {
                return res.status(400).json({ message: 'El usuario seleccionado no es un tecnico valido' });
            }
            tecnicoNombre = tecnico.nombre_completo || tecnico.nombre || tecnico.correo || null;
        } catch (err) {
            return res.status(400).json({ message: 'No se pudo validar el tecnico seleccionado' });
        }

        await queryAsync(
            `UPDATE inspecciones
             SET asistente_id = ?
             WHERE id = ?`,
            [tecnicoId, inspeccionId]
        );

        return res.json({
            message: 'Tecnico asignado correctamente',
            inspeccion_id: inspeccionId,
            tecnico_id: tecnicoId,
            tecnico_nombre: tecnicoNombre,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error al asignar tecnico manualmente' });
    }
};

const iniciarInspeccion = async (req, res) => {
    const asistente_id = req.user.id;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de inspeccion invalido' });
    }

    try {
        const insp = await verificarInspeccionTecnico(id, asistente_id);
        if (!insp) return res.status(404).json({ message: 'Inspeccion no encontrada' });

        if (insp.estado === 'sin_lotes_inspeccionables') {
            return res.status(400).json({ message: 'Esta inspección ya fue marcada como sin lotes inspeccionables', estado: insp.estado });
        }

        const detalle = await sincronizarLotesInspeccion(insp, req.headers.authorization);
        if (detalle.lotes.length === 0) {
            const motivo = 'No hay lotes activos en el lugar de producción para iniciar esta inspección.';
            const observaciones = insp.observaciones_generales
                ? `${insp.observaciones_generales} | ${motivo}`
                : motivo;

            await queryAsync(
                `UPDATE inspecciones
                 SET estado = 'sin_lotes_inspeccionables', fecha_cierre = NOW(), observaciones_generales = ?
                 WHERE id = ?`,
                [observaciones, id]
            );

            logAccionTecnico('marca_sin_lotes_inspeccionables', asistente_id, id, motivo);
            return res.status(400).json({
                message: motivo,
                estado: 'sin_lotes_inspeccionables',
                motivo,
            });
        }

        if (insp.estado !== 'pendiente') {
            return res.status(400).json({ message: `No se puede iniciar: estado actual es '${insp.estado}'` });
        }

        await queryAsync(
            `UPDATE inspecciones
             SET estado = 'en_proceso', fecha_inicio = COALESCE(fecha_inicio, NOW())
             WHERE id = ?`,
            [id]
        );

        logAccionTecnico('inicia_inspeccion', asistente_id, id);
        res.json({ message: 'Inspeccion iniciada', id, estado: 'en_proceso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar inspeccion' });
    }
};

const guardarEvaluacionLote = async (req, res) => {
    const asistente_id = req.user.id;
    const inspeccionId = Number(req.params.id);
    const loteId = Number(req.params.loteId);
    const totalPlantas = Number(req.body.total_plantas_inspeccionadas);
    const observaciones = req.body.observaciones_lote || null;
    const plagas = Array.isArray(req.body.plagas) ? req.body.plagas : [];

    if (!Number.isInteger(inspeccionId) || inspeccionId <= 0 || !Number.isInteger(loteId) || loteId <= 0) {
        return res.status(400).json({ message: 'Ids invalidos para evaluacion' });
    }

    if (!Number.isInteger(totalPlantas) || totalPlantas <= 0) {
        return res.status(400).json({ message: 'El total de plantas inspeccionadas debe ser un entero mayor a cero' });
    }

    const plagasNormalizadas = [];
    for (const item of plagas) {
        const plagaId = Number(item?.plaga_id);
        const plagaNombre = normalizarPlaga(item?.plaga_nombre || item?.nombre);
        const plantasAfectadas = Number(item?.plantas_afectadas);

        if (!plagaNombre) continue;
        if (!Number.isInteger(plantasAfectadas) || plantasAfectadas < 0) {
            return res.status(400).json({ message: `Cantidad invalida para la plaga '${plagaNombre}'` });
        }
        if (plantasAfectadas > totalPlantas) {
            return res.status(400).json({ message: `Las plantas afectadas de '${plagaNombre}' no pueden superar el total inspeccionado` });
        }

        plagasNormalizadas.push({
            plaga_id: Number.isInteger(plagaId) && plagaId > 0 ? plagaId : null,
            plaga_nombre: plagaNombre,
            plantas_afectadas: plantasAfectadas,
        });
    }

    try {
        const inspeccion = await verificarInspeccionTecnico(inspeccionId, asistente_id);
        if (!inspeccion) return res.status(404).json({ message: 'Inspeccion no encontrada o no asignada al tecnico' });

        if (!['pendiente', 'en_proceso'].includes(inspeccion.estado)) {
            return res.status(400).json({ message: 'Solo se pueden evaluar lotes en inspecciones pendientes o en proceso' });
        }

        await sincronizarLotesInspeccion(inspeccion, req.headers.authorization);

        const lotesRows = await queryAsync(
            `SELECT id, evaluado
             FROM inspeccion_lotes
             WHERE inspeccion_id = ? AND lote_id = ?`,
            [inspeccionId, loteId]
        );

        if (lotesRows.length === 0) {
            return res.status(404).json({ message: 'El lote no pertenece a esta inspeccion' });
        }

        const inspeccionLoteId = lotesRows[0].id;

        await beginTransactionAsync();
        await queryAsync(
            `UPDATE inspeccion_lotes
             SET total_plantas_inspeccionadas = ?,
                 observaciones_lote = ?,
                 evaluado = 1,
                 fecha_evaluacion = NOW()
             WHERE id = ?`,
            [totalPlantas, observaciones, inspeccionLoteId]
        );

        await queryAsync(
            'DELETE FROM inspeccion_lote_plagas WHERE inspeccion_lote_id = ?',
            [inspeccionLoteId]
        );

        for (const plaga of plagasNormalizadas) {
            let plagaId = plaga.plaga_id;
            let plagaNombre = plaga.plaga_nombre;

            if (plagaId) {
                const plagaRows = await queryAsync(
                    `SELECT id, nombre_comun
                     FROM plagas
                     WHERE id = ?`,
                    [plagaId]
                );
                if (plagaRows.length > 0) {
                    plagaNombre = plagaRows[0].nombre_comun;
                } else {
                    plagaId = null;
                }
            }

            if (!plagaId && plagaNombre) {
                const nameRows = await queryAsync(
                    `SELECT id, nombre_comun
                     FROM plagas
                     WHERE nombre_comun = ?
                     LIMIT 1`,
                    [plagaNombre]
                );
                if (nameRows.length > 0) {
                    plagaId = Number(nameRows[0].id);
                    plagaNombre = nameRows[0].nombre_comun;
                }
            }

            await queryAsync(
                `INSERT INTO inspeccion_lote_plagas (inspeccion_lote_id, plaga_id, plaga_nombre, plantas_afectadas)
                 VALUES (?, ?, ?, ?)`,
                [inspeccionLoteId, plagaId, plagaNombre, plaga.plantas_afectadas]
            );
        }

        if (inspeccion.estado === 'pendiente') {
            await queryAsync(
                `UPDATE inspecciones
                 SET estado = 'en_proceso', fecha_inicio = COALESCE(fecha_inicio, NOW())
                 WHERE id = ?`,
                [inspeccionId]
            );
        }

        await commitAsync();

        const resumenRows = await queryAsync(
            `SELECT COUNT(*) AS total, SUM(CASE WHEN fecha_evaluacion IS NOT NULL THEN 1 ELSE 0 END) AS evaluados
             FROM inspeccion_lotes
             WHERE inspeccion_id = ?`,
            [inspeccionId]
        );

        const total = Number(resumenRows?.[0]?.total || 0);
        const evaluados = Number(resumenRows?.[0]?.evaluados || 0);

        res.json({
            message: 'Lote evaluado correctamente',
            inspeccion_id: inspeccionId,
            lote_id: loteId,
            resumen: {
                total_lotes: total,
                lotes_evaluados: evaluados,
                lotes_pendientes: total - evaluados,
                todos_evaluados: total > 0 && total === evaluados,
            },
        });
    } catch (err) {
        await rollbackAsync();
        console.error(err);
        res.status(500).json({ message: 'Error al guardar la evaluacion del lote' });
    }
};

const completarInspeccion = async (req, res) => {
    const asistente_id = req.user.id;
    const id = Number(req.params.id);
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const observaciones_generales = String(payload.observaciones_generales || '').trim();
    const recomendaciones = String(payload.recomendaciones || '').trim();
    const concepto_tecnico = String(payload.concepto_tecnico || '').trim();

    if (!observaciones_generales) {
        return res.status(400).json({
            message: 'Las observaciones generales son obligatorias para completar la inspeccion',
        });
    }

    if (!recomendaciones) {
        return res.status(400).json({
            message: 'Las recomendaciones son obligatorias para completar la inspeccion',
        });
    }

    if (!concepto_tecnico) {
        return res.status(400).json({
            message: 'El concepto tecnico es obligatorio para completar la inspeccion',
        });
    }

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Id de inspeccion invalido' });
    }

    try {
        const insp = await verificarInspeccionTecnico(id, asistente_id);
        if (!insp) return res.status(404).json({ message: 'Inspeccion no encontrada' });

        if (!['pendiente', 'en_proceso'].includes(insp.estado)) {
            return res.status(400).json({ message: `No se puede completar: estado actual es '${insp.estado}'` });
        }

        await sincronizarLotesInspeccion(insp, req.headers.authorization);

        const resumen = await queryAsync(
            `SELECT COUNT(*) AS total, SUM(CASE WHEN fecha_evaluacion IS NOT NULL THEN 1 ELSE 0 END) AS evaluados
             FROM inspeccion_lotes
             WHERE inspeccion_id = ?`,
            [id]
        );

        const total = Number(resumen?.[0]?.total || 0);
        const evaluados = Number(resumen?.[0]?.evaluados || 0);

        if (total === 0) {
            return res.status(400).json({ message: 'No hay lotes activos asociados para completar la inspeccion' });
        }   

        if (evaluados < total) {
            return res.status(400).json({
                message: 'No puedes completar la inspeccion hasta evaluar todos los lotes activos',
                pendientes: total - evaluados,
            });
        }

        const metricas = await calcularMetricasConsolidadas(id);
        const informe = {
            inspeccion_id: id,
            fecha_generacion: new Date().toISOString(),
            porcentaje_infeccion_total: metricas.porcentaje_infeccion_total,
            nivel_riesgo: metricas.nivel_riesgo,
            resumen_plagas: metricas.resumen_plagas,
            lotes: metricas.lotes,
        };

        await queryAsync(
            `UPDATE inspecciones
             SET estado = 'completada',
                 fecha_cierre = NOW(),
                 observaciones_generales = ?,
                 recomendaciones = ?,
                 concepto_tecnico = ?,
                 porcentaje_infeccion_total = ?,
                 nivel_riesgo = ?,
                 informe_json = ?
             WHERE id = ?`,
            [
                observaciones_generales,
                recomendaciones,
                concepto_tecnico,
                metricas.porcentaje_infeccion_total,
                metricas.nivel_riesgo,
                JSON.stringify(informe),
                id,
            ]
        );

        await registrarActualizacionUltimaInspeccion(req.headers.authorization, insp.lugar_produccion_id);

        res.json({
            message: 'Inspeccion completada exitosamente',
            id,
            estado: 'completada',
            metricas: {
                porcentaje_infeccion_total: metricas.porcentaje_infeccion_total,
                nivel_riesgo: metricas.nivel_riesgo,
                resumen_plagas: metricas.resumen_plagas,
            },
            informe,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al completar inspeccion' });
    }
};

module.exports = {
    solicitarInspeccion,
    getMisSolicitudes,
    getInspecciones, 
    getDetalleSolicitud,
    getInspeccionesTecnico,
    getTecnicoDashboard,
    getDetalleRealizacion,
    asignarTecnicoManual,
    iniciarInspeccion,
    guardarEvaluacionLote,
    completarInspeccion,
};
