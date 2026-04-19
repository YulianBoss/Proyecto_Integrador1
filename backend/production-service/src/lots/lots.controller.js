const db = require('../config/db');

// Helper: registrar cambio de estado en historial
const registrarHistorial = (lote_id, estado_anterior, estado_nuevo, observacion, callback) => {
    db.query(
        `INSERT INTO historial_estado_lote (lote_id, estado_anterior, estado_nuevo, fecha_cambio, observacion)
         VALUES (?, ?, ?, NOW(), ?)`,
        [lote_id, estado_anterior, estado_nuevo, observacion || null],
        callback
    );
};

// ─────────────────────────────────────────────────────────────
// 📦 CREAR LOTE
// Tu BD: lotes(id, codigo, lugar_produccion_id, area_ha, estado, fecha_registro, cultivo_activo_id)
// ─────────────────────────────────────────────────────────────
const createLot = (req, res) => {
    const { codigo, lugar_produccion_id, area_ha, estado } = req.body;
    const productor_id = req.user.id;

    if (!codigo || !lugar_produccion_id || !area_ha) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (codigo, lugar_produccion_id, area_ha)' });
    }

    if (isNaN(area_ha) || parseFloat(area_ha) <= 0) {
        return res.status(400).json({ message: 'El área debe ser un número mayor a cero' });
    }

    const estadosValidos = ['activo', 'inactivo', 'en_preparacion'];
    const estadoFinal = estado || 'activo';
    if (!estadosValidos.includes(estadoFinal)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` });
    }

    // Verificar que el lugar pertenece al productor y está activo; traer area_total_ha para validar
    db.query(
        `SELECT id, area_total_ha FROM lugares_produccion WHERE id = ? AND productor_id = ? AND estado = 'activo'`,
        [lugar_produccion_id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lugar de producción no encontrado o no pertenece al productor' });

            const lugar = results[0];
            if (lugar.area_total_ha !== null && parseFloat(area_ha) >= parseFloat(lugar.area_total_ha)) {
                return res.status(400).json({
                    message: `Las hectáreas del lote deben ser menores a las del lugar de producción (${lugar.area_total_ha} ha)`
                });
            }

            // Validar que la suma de lotes no supere area_total_ha del lugar
            if (lugar.area_total_ha !== null) {
                db.query(
                    `SELECT COALESCE(SUM(area_ha), 0) AS total_usado
                     FROM lotes
                     WHERE lugar_produccion_id = ?`,
                    [lugar_produccion_id],
                    (err, sumRows) => {
                        if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }

                        const totalUsado = parseFloat(sumRows[0].total_usado);
                        const nuevaArea  = parseFloat(area_ha);
                        const disponible = parseFloat(lugar.area_total_ha) - totalUsado;

                        if (nuevaArea > disponible) {
                            return res.status(400).json({
                                message: `Las hectáreas del lote (${nuevaArea} ha) superan la capacidad disponible del lugar. Disponible: ${disponible.toFixed(2)} ha de ${lugar.area_total_ha} ha totales`
                            });
                        }

                        // Código único dentro del mismo lugar
                        db.query(
                            `SELECT id FROM lotes WHERE codigo = ? AND lugar_produccion_id = ?`,
                            [codigo, lugar_produccion_id],
                            (err, dup) => {
                                if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                                if (dup.length > 0) return res.status(400).json({ message: 'Ya existe un lote con ese código en este lugar de producción' });

                                db.query(
                                    `INSERT INTO lotes (codigo, lugar_produccion_id, area_ha, estado, fecha_registro)
                                     VALUES (?, ?, ?, ?, NOW())`,
                                    [codigo, lugar_produccion_id, area_ha, estadoFinal],
                                    (err, result) => {
                                        if (err) { console.error(err); return res.status(500).json({ message: 'Error al crear lote' }); }

                                        registrarHistorial(result.insertId, null, estadoFinal, 'Creación del lote', () => {});

                                        res.status(201).json({ message: 'Lote creado ✅', id: result.insertId });
                                    }
                                );
                            }
                        );
                    }
                );
            } else {
                // Sin límite de area_total_ha definido en el lugar
                db.query(
                    `SELECT id FROM lotes WHERE codigo = ? AND lugar_produccion_id = ?`,
                    [codigo, lugar_produccion_id],
                    (err, dup) => {
                        if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                        if (dup.length > 0) return res.status(400).json({ message: 'Ya existe un lote con ese código en este lugar de producción' });

                        db.query(
                            `INSERT INTO lotes (codigo, lugar_produccion_id, area_ha, estado, fecha_registro)
                             VALUES (?, ?, ?, ?, NOW())`,
                            [codigo, lugar_produccion_id, area_ha, estadoFinal],
                            (err, result) => {
                                if (err) { console.error(err); return res.status(500).json({ message: 'Error al crear lote' }); }

                                registrarHistorial(result.insertId, null, estadoFinal, 'Creación del lote', () => {});

                                res.status(201).json({ message: 'Lote creado ✅', id: result.insertId });
                            }
                        );
                    }
                );
            }
        }
    );
};

// ─────────────────────────────────────────────────────────────
// 📋 LISTAR LOTES POR LUGAR
// ─────────────────────────────────────────────────────────────
const getLotsByProduction = (req, res) => {
    const { lugar_id } = req.params;
    const productor_id = req.user.id;

    db.query(
        `SELECT id FROM lugares_produccion WHERE id = ? AND productor_id = ?`,
        [lugar_id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lugar de producción no encontrado' });

            // Traer lotes con su cultivo activo si tiene
            db.query(
                `SELECT l.id, l.codigo, l.area_ha, l.estado, l.fecha_registro,
                    l.predio_id,
                    pp.nombre_identificacion AS predio_nombre,
                    pp.departamento AS predio_departamento,
                    pp.municipio AS predio_municipio,
                        c.id AS cultivo_id, c.variedad, c.fecha_siembra, c.estado AS estado_cultivo
                 FROM lotes l
                 LEFT JOIN predios_produccion pp ON pp.id = l.predio_id
                 LEFT JOIN cultivos c ON c.lote_id = l.id AND c.estado = 'activo'
                 WHERE l.lugar_produccion_id = ?
                 ORDER BY l.fecha_registro DESC`,
                [lugar_id],
                (err, lotes) => {
                    if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener lotes' }); }
                    res.json(lotes);
                }
            );
        }
    );
};

// ─────────────────────────────────────────────────────────────
// 🔍 VER LOTE POR ID (con historial)
// ─────────────────────────────────────────────────────────────
const getLoteById = (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;

    db.query(
        `SELECT l.*, p.nombre_identificacion AS predio_nombre,
            p.departamento AS predio_departamento,
            p.municipio AS predio_municipio
         FROM lotes l
         LEFT JOIN predios_produccion p ON p.id = l.predio_id
         JOIN lugares_produccion lp ON lp.id = l.lugar_produccion_id
         WHERE l.id = ? AND lp.productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lote no encontrado' });

            const lote = results[0];

            db.query(
                `SELECT * FROM historial_estado_lote WHERE lote_id = ? ORDER BY fecha_cambio DESC`,
                [id],
                (err, historial) => {
                    if (err) { console.error(err); return res.status(500).json({ message: 'Error al obtener historial' }); }
                    res.json({ ...lote, historial });
                }
            );
        }
    );
};

// ─────────────────────────────────────────────────────────────
// ✏️ EDITAR LOTE  (area_ha, predio_id, estado)
// ─────────────────────────────────────────────────────────────
const updateLot = (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;
    const { area_ha, predio_id, estado, observacion } = req.body;

    const estadosValidos = ['activo', 'inactivo', 'en_preparacion', 'cosechado'];

    if (area_ha !== undefined && (isNaN(area_ha) || parseFloat(area_ha) <= 0)) {
        return res.status(400).json({ message: 'El área debe ser un número mayor a cero' });
    }

    if (estado !== undefined && !estadosValidos.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` });
    }

    if (area_ha === undefined && predio_id === undefined && estado === undefined) {
        return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
    }

    // Cargar lote actual (necesitamos lugar para validar area acumulada e historial de estado)
    db.query(
        `SELECT l.id, l.estado AS estado_actual, l.lugar_produccion_id, lp.area_total_ha
         FROM lotes l
         JOIN lugares_produccion lp ON lp.id = l.lugar_produccion_id
         WHERE l.id = ? AND lp.productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lote no encontrado' });

            const loteActual = results[0];

            const ejecutarUpdate = () => {
                const fields = [];
                const values = [];

                if (area_ha !== undefined) { fields.push('area_ha = ?'); values.push(parseFloat(area_ha)); }
                if (predio_id !== undefined) { fields.push('predio_id = ?'); values.push(Number(predio_id)); }
                if (estado !== undefined) { fields.push('estado = ?'); values.push(estado); }

                values.push(id);
                db.query(`UPDATE lotes SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
                    if (err) { console.error(err); return res.status(500).json({ message: 'Error al actualizar lote' }); }

                    // Si cambió el estado, registrar historial
                    if (estado !== undefined && estado !== loteActual.estado_actual) {
                        registrarHistorial(id, loteActual.estado_actual, estado, observacion || null, () => {});
                    }

                    res.json({ message: 'Lote actualizado ✅' });
                });
            };

            // Validar suma acumulada si se está cambiando el área
            const validarAreaYSeguir = (siguiente) => {
                if (area_ha === undefined || loteActual.area_total_ha === null) {
                    return siguiente();
                }
                db.query(
                    `SELECT COALESCE(SUM(area_ha), 0) AS total_otros
                     FROM lotes
                     WHERE lugar_produccion_id = ? AND id != ?`,
                    [loteActual.lugar_produccion_id, id],
                    (err, sumRows) => {
                        if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                        const totalOtros  = parseFloat(sumRows[0].total_otros);
                        const nuevaArea   = parseFloat(area_ha);
                        const disponible  = parseFloat(loteActual.area_total_ha) - totalOtros;
                        if (nuevaArea > disponible) {
                            return res.status(400).json({
                                message: `Las hectáreas del lote (${nuevaArea} ha) superan la capacidad disponible del lugar. Disponible: ${disponible.toFixed(2)} ha de ${loteActual.area_total_ha} ha totales`
                            });
                        }
                        siguiente();
                    }
                );
            };

            // Validar que el predio sea válido para el lugar si se está cambiando
            if (predio_id !== undefined) {
                db.query(
                    `SELECT p.id
                     FROM predios_produccion p
                     JOIN lugares_produccion lp ON lp.id = ?
                     WHERE p.id = ?
                       AND p.productor_id IN (?, 1)
                       AND p.departamento = lp.departamento
                       AND p.municipio = lp.municipio
                     LIMIT 1`,
                    [loteActual.lugar_produccion_id, predio_id, productor_id],
                    (err, predioRows) => {
                        if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                        if (predioRows.length === 0) {
                            return res.status(400).json({ message: 'El predio seleccionado no es válido para este lugar de producción' });
                        }
                        validarAreaYSeguir(ejecutarUpdate);
                    }
                );
            } else {
                validarAreaYSeguir(ejecutarUpdate);
            }
        }
    );
};

// ─────────────────────────────────────────────────────────────
// 🔄 CAMBIAR ESTADO DEL LOTE (con historial)
// ─────────────────────────────────────────────────────────────
const changeLoteEstado = (req, res) => {
    const { id } = req.params;
    const { estado, observacion } = req.body;
    const productor_id = req.user.id;

    const estadosValidos = ['activo', 'inactivo', 'en_preparacion', 'cosechado'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}` });
    }

    db.query(
        `SELECT l.id, l.estado FROM lotes l
         JOIN lugares_produccion lp ON lp.id = l.lugar_produccion_id
         WHERE l.id = ? AND lp.productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lote no encontrado' });

            const estadoAnterior = results[0].estado;
            if (estadoAnterior === estado) return res.status(400).json({ message: `El lote ya tiene el estado '${estado}'` });

            db.query(`UPDATE lotes SET estado = ? WHERE id = ?`, [estado, id], (err) => {
                if (err) { console.error(err); return res.status(500).json({ message: 'Error al cambiar estado' }); }
                registrarHistorial(id, estadoAnterior, estado, observacion || null, () => {});
                res.json({ message: `Estado actualizado: ${estadoAnterior} → ${estado} ✅` });
            });
        }
    );
};

// ─────────────────────────────────────────────────────────────
// 📜 HISTORIAL DE ESTADOS
// ─────────────────────────────────────────────────────────────
const getHistorialLote = (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;

    db.query(
        `SELECT l.id FROM lotes l
         JOIN lugares_produccion lp ON lp.id = l.lugar_produccion_id
         WHERE l.id = ? AND lp.productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lote no encontrado' });

            db.query(
                `SELECT * FROM historial_estado_lote WHERE lote_id = ? ORDER BY fecha_cambio DESC`,
                [id],
                (err, historial) => {
                    if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                    res.json(historial);
                }
            );
        }
    );
};

// ─────────────────────────────────────────────────────────────
// 🗑️ ELIMINAR LOTE
// ─────────────────────────────────────────────────────────────
const deleteLote = (req, res) => {
    const { id } = req.params;
    const productor_id = req.user.id;

    db.query(
        `SELECT l.id FROM lotes l
         JOIN lugares_produccion lp ON lp.id = l.lugar_produccion_id
         WHERE l.id = ? AND lp.productor_id = ?`,
        [id, productor_id],
        (err, results) => {
            if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
            if (results.length === 0) return res.status(404).json({ message: 'Lote no encontrado' });

            // E6: Bloquear si tiene cultivos activos (las inspecciones son del lugar, no del lote)
            db.query(
                `SELECT COUNT(*) AS total FROM cultivos WHERE lote_id = ? AND estado = 'activo'`,
                [id],
                (err, cultivosResult) => {
                    if (err) { console.error(err); return res.status(500).json({ message: 'Error del servidor' }); }
                    if (cultivosResult[0].total > 0) {
                        return res.status(400).json({ message: 'El lote tiene cultivos activos. Finaliza los cultivos antes de eliminar el lote.' });
                    }

                    db.query(`DELETE FROM lotes WHERE id = ?`, [id], (err) => {
                        if (err) { console.error(err); return res.status(500).json({ message: 'Error al eliminar lote' }); }
                        res.json({ message: 'Lote eliminado ✅' });
                    });
                }
            );
        }
    );
};

module.exports = { createLot, getLotsByProduction, getLoteById, updateLot, changeLoteEstado, getHistorialLote, deleteLote };