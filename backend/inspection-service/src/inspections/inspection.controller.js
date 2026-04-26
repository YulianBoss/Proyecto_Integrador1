const db   = require('../config/db');
const axios = require('axios');

const PRODUCTION_URL = process.env.PRODUCTION_SERVICE_URL || 'http://localhost:58761';
const AUTH_URL       = process.env.AUTH_SERVICE_URL       || 'http://localhost:3001';

// ─────────────────────────────────────────────────────────────
// HELPER: tecnico con menor carga consultando al auth-service
// ─────────────────────────────────────────────────────────────
// departamento y municipio filtran técnicos de la misma ubicación del lugar
const obtenerTecnicoConMenorCarga = async (authHeader, departamento, municipio) => {
    try {
        // Construir parámetros: filtrar por ubicación si está disponible
        const params = new URLSearchParams();
        if (departamento) params.append('departamento', departamento);
        if (municipio)    params.append('municipio',    municipio);

        const resp = await axios.get(
            `${AUTH_URL}/api/users/tecnicos?${params.toString()}`,
            { headers: { Authorization: authHeader } }
        );

        const tecnicos = resp.data || [];
        if (tecnicos.length === 0) {
            return { asistenteId: null, motivo: 'sin_tecnicos_zona' };
        }

        // Contar inspecciones activas de cada tecnico en esta BD
        const cargas = await Promise.all(
            tecnicos.map(t => new Promise(resolve => {
                db.query(
                    `SELECT COUNT(*) AS total FROM inspecciones
                     WHERE asistente_id = ? AND estado IN ('pendiente', 'en_proceso')`,
                    [t.id],
                    (err, rows) => resolve({ id: t.id, carga: err ? 999 : rows[0].total })
                );
            }))
        );

        // Prioridad 1: técnicos sin inspecciones activas (carga 0)
        const sinCarga = cargas.filter((c) => c.carga === 0);
        if (sinCarga.length > 0) {
            const elegido = sinCarga[Math.floor(Math.random() * sinCarga.length)];
            return { asistenteId: elegido.id, motivo: null };
        }

        // Prioridad 2: menor carga; si hay empate, elegir aleatoriamente uno
        const minCarga = Math.min(...cargas.map((c) => c.carga));
        if (!Number.isFinite(minCarga) || minCarga >= 999) {
            return { asistenteId: null, motivo: 'error_asignacion_automatica' };
        }

        const candidatos = cargas.filter((c) => c.carga === minCarga);
        const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
        return { asistenteId: elegido.id, motivo: null };

    } catch (err) {
        // Si el token del productor no puede listar usuarios o
        // el auth-service no responde, dejamos sin asignar
        console.warn('No se pudo consultar tecnicos al auth-service:', err.message);
        return { asistenteId: null, motivo: 'error_asignacion_automatica' };
    }
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTOR - SOLICITAR INSPECCION (RF-04)
// ═══════════════════════════════════════════════════════════════
const solicitarInspeccion = async (req, res) => {
    const { lote_id, fecha_solicitada } = req.body;
    const productor_id = req.user.id;

    if (!lote_id || !fecha_solicitada) {
        return res.status(400).json({ message: 'Debes enviar lote_id y fecha_solicitada' });
    }

    // Validar fecha no anterior a hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fecha_solicitada);
    if (isNaN(fecha.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha invalido. Usa YYYY-MM-DD' });
    }
    if (fecha < hoy) {
        return res.status(400).json({ message: 'La fecha solicitada no puede ser anterior a la fecha actual' });
    }

    try {
        // Obtener el lote desde production-service
        let lote;
        try {
            const loteResp = await axios.get(
                `${PRODUCTION_URL}/api/lots/${lote_id}`,
                { headers: { Authorization: req.headers.authorization } }
            );
            lote = loteResp.data;
        } catch (e) {
            return res.status(404).json({ message: 'Lote no encontrado o servicio de produccion no disponible' });
        }

        if (!lote || lote.estado !== 'activo') {
            return res.status(400).json({ message: 'El lote seleccionado no esta en estado Activo' });
        }

        const lugar_produccion_id = lote.lugar_produccion_id;

        // Obtener departamento y municipio del lugar desde production-service
        let lugarDepto = null;
        let lugarMuni  = null;
        try {
            const lugarResp = await axios.get(
                `${PRODUCTION_URL}/api/production/${lugar_produccion_id}`,
                { headers: { Authorization: req.headers.authorization } }
            );
            lugarDepto = lugarResp.data?.departamento || null;
            lugarMuni  = lugarResp.data?.municipio    || null;
        } catch (e) {
            console.warn('No se pudo obtener ubicación del lugar:', e.message);
        }

        // Verificar inspeccion activa existente para este lote
        db.query(
            `SELECT id FROM inspecciones
             WHERE lote_id = ? AND estado IN ('pendiente', 'en_proceso')`,
            [lote_id],
            async (err, activas) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error del servidor' });
                }

                if (activas.length > 0) {
                    return res.status(400).json({
                        message: 'Ya existe una inspeccion Pendiente o En proceso para este lote. Espera a que finalice.'
                    });
                }

                // Asignacion automatica: técnico de la misma ubicación del lugar
                const asignacion = await obtenerTecnicoConMenorCarga(req.headers.authorization, lugarDepto, lugarMuni);
                const asistente_id = asignacion?.asistenteId ?? null;
                const sinAsistente = asistente_id === null;
                const motivoSinAsignacion = asignacion?.motivo || null;

                // Crear la inspeccion
                db.query(
                    `INSERT INTO inspecciones
                     (lugar_produccion_id, lote_id, productor_id, asistente_id, estado, fecha_solicitud, departamento, municipio)
                     VALUES (?, ?, ?, ?, 'pendiente', NOW(), ?, ?)`,
                    [lugar_produccion_id, lote_id, productor_id, asistente_id, lugarDepto, lugarMuni],
                    (err, result) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Error al registrar la solicitud' });
                        }

                        if (sinAsistente) {
                            console.warn(
                                `[NOTIFICAR_ADMIN] Inspeccion ${result.insertId} requiere asignacion manual. ` +
                                `Lote ${lote_id} (${lugarMuni || 'N/A'} - ${lugarDepto || 'N/A'}). ` +
                                `Motivo: ${motivoSinAsignacion || 'sin_tecnicos_zona'}`
                            );
                        }

                        const mensajeSinAsignacion = motivoSinAsignacion === 'error_asignacion_automatica'
                            ? 'Inspeccion registrada en estado Pendiente de asignacion por error en asignacion automatica. El administrador sera notificado para asignacion manual.'
                            : 'Inspeccion registrada en estado Pendiente de asignacion. No hay asistentes tecnicos disponibles en la zona y el administrador sera notificado para asignacion manual.';

                        res.status(201).json({
                            message: sinAsistente ? mensajeSinAsignacion : 'Inspeccion solicitada y asignada automaticamente.',
                            inspeccion_id:      result.insertId,
                            lote_id,
                            lote_codigo:        lote.codigo,
                            lugar_produccion_id,
                            fecha_solicitada,
                            estado:             'pendiente',
                            asistente_asignado:  asistente_id,
                            pendiente_asignacion: sinAsistente,
                            motivo_asignacion: motivoSinAsignacion,
                            notificacion_admin: sinAsistente,
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error(error);
        return res.status(502).json({
            message: 'Error al comunicarse con el servicio de produccion. Verifica que este activo.'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTOR - VER MIS SOLICITUDES
// ═══════════════════════════════════════════════════════════════
const getMisSolicitudes = (req, res) => {
    const productor_id = req.user.id;
    const { estado } = req.query;

    let query = `
        SELECT id, lugar_produccion_id, lote_id, asistente_id, estado,
               fecha_solicitud, fecha_inicio, fecha_cierre, concepto_tecnico
        FROM inspecciones
        WHERE productor_id = ?
    `;
    const params = [productor_id];

    if (estado) { query += ` AND estado = ?`; params.push(estado); }
    query += ` ORDER BY fecha_solicitud DESC`;

    db.query(query, params, (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener solicitudes' }); }
        res.json(results);
    });
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTOR - VER DETALLE DE UNA SOLICITUD
// ═══════════════════════════════════════════════════════════════
const getDetalleSolicitud = (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;

    db.query(
        `SELECT id, lugar_produccion_id, asistente_id, estado,
                fecha_solicitud, fecha_inicio, fecha_cierre,
                observaciones_generales, recomendaciones, concepto_tecnico
         FROM inspecciones
         WHERE id = ? AND productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
            res.json(results[0]);
        }
    );
};

// ═══════════════════════════════════════════════════════════════
// TÉCNICO - VER INSPECCIONES ASIGNADAS
// ═══════════════════════════════════════════════════════════════
const getInspeccionesTecnico = (req, res) => {
    const asistente_id = req.user.id;
    const tecnicoDep   = req.user.departamento || null;
    const tecnicoMun   = req.user.municipio    || null;
    const { estado } = req.query;

    // Mostrar inspecciones asignadas a este técnico
    // O inspecciones sin asignar que estén en su misma zona
    let query = `
        SELECT id, lugar_produccion_id, lote_id, productor_id, asistente_id, estado,
               fecha_solicitud, fecha_inicio, fecha_cierre,
               observaciones_generales, recomendaciones, concepto_tecnico,
               departamento, municipio
        FROM inspecciones
        WHERE (
            asistente_id = ?
            OR (asistente_id IS NULL AND departamento = ? AND municipio = ?)
        )
    `;
    const params = [asistente_id, tecnicoDep, tecnicoMun];

    if (estado) {
        query += ` AND estado = ?`;
        params.push(estado);
    } else {
        query += ` AND estado IN ('pendiente', 'en_proceso')`;
    }
    query += ` ORDER BY fecha_solicitud ASC`;

    db.query(query, params, (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener inspecciones' }); }
        res.json(results);
    });
};

// ═══════════════════════════════════════════════════════════════
// TÉCNICO - INICIAR INSPECCIÓN (pendiente → en_proceso)
// ═══════════════════════════════════════════════════════════════
const iniciarInspeccion = (req, res) => {
    const asistente_id = req.user.id;
    const { id } = req.params;

    db.query(
        `SELECT id, estado, asistente_id FROM inspecciones WHERE id = ?`,
        [id],
        (err, rows) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (rows.length === 0) return res.status(404).json({ message: 'Inspección no encontrada' });

            const insp = rows[0];

            if (insp.asistente_id !== asistente_id) {
                return res.status(403).json({ message: 'No tienes permiso para gestionar esta inspección' });
            }
            if (insp.estado !== 'pendiente') {
                return res.status(400).json({ message: `No se puede iniciar: estado actual es '${insp.estado}'` });
            }

            db.query(`UPDATE inspecciones SET estado = 'en_proceso', fecha_inicio = NOW() WHERE id = ?`, [id], (err2) => {
                if (err2) { console.error(err2); return res.status(500).json({ message: 'Error al actualizar inspección' }); }
                res.json({ message: 'Inspección iniciada', id: Number(id), estado: 'en_proceso' });
            });
        }
    );
};

// ═══════════════════════════════════════════════════════════════
// TÉCNICO - COMPLETAR INSPECCIÓN (en_proceso → completada)
// ═══════════════════════════════════════════════════════════════
const completarInspeccion = (req, res) => {
    const asistente_id = req.user.id;
    const { id } = req.params;
    const { observaciones_generales, recomendaciones, concepto_tecnico } = req.body;

    if (!concepto_tecnico) {
        return res.status(400).json({ message: 'El concepto técnico es obligatorio para completar la inspección' });
    }

    db.query(
        `SELECT id, estado, asistente_id FROM inspecciones WHERE id = ?`,
        [id],
        (err, rows) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (rows.length === 0) return res.status(404).json({ message: 'Inspección no encontrada' });

            const insp = rows[0];
            if (insp.asistente_id !== asistente_id) {
                return res.status(403).json({ message: 'No tienes permiso para gestionar esta inspección' });
            }
            if (insp.estado !== 'en_proceso') {
                return res.status(400).json({ message: `No se puede completar: estado actual es '${insp.estado}'` });
            }

            db.query(
                `UPDATE inspecciones
                 SET estado = 'completada',
                     fecha_cierre = NOW(),
                     observaciones_generales = ?,
                     recomendaciones = ?,
                     concepto_tecnico = ?
                 WHERE id = ?`,
                [observaciones_generales || null, recomendaciones || null, concepto_tecnico, id],
                (err2) => {
                    if (err2) { console.error(err2); return res.status(500).json({ message: 'Error al completar inspección' }); }
                    res.json({ message: 'Inspección completada exitosamente', id: Number(id), estado: 'completada' });
                }
            );
        }
    );
};

module.exports = {
    solicitarInspeccion,
    getMisSolicitudes,
    getDetalleSolicitud,
    // Técnico
    getInspeccionesTecnico,
    iniciarInspeccion,
    completarInspeccion,
};