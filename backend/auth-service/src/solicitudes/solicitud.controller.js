const db = require('../config/db');

// ─────────────────────────────────────────────
// 🔒 ADMIN — LISTAR SOLICITUDES
// Filtros opcionales: ?rol=productor|tecnico&num_identificacion=123
// ─────────────────────────────────────────────
const getSolicitudes = (req, res) => {
    const { rol, num_identificacion } = req.query;

    let query = `
        SELECT 
            id, nombre_completo, correo, rol, estado,
            num_identificacion, tarjeta_profesional, telefono, fecha_registro
        FROM usuarios
        WHERE rol IN ('productor', 'tecnico')
          AND estado = 'pendiente'
    `;
    const params = [];

    if (rol)    { query += ` AND rol = ?`;    params.push(rol); }

    if (num_identificacion) {
        const identificacion = String(num_identificacion).trim();

        if (!/^\d+$/.test(identificacion)) {
            return res.status(400).json({ message: 'El filtro de identificación solo admite dígitos' });
        }

        query += ` AND num_identificacion LIKE ?`;
        params.push(`%${identificacion}%`);
    }

    query += ` ORDER BY fecha_registro DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener solicitudes' });
        }

        if (results.length === 0) {
            return res.json({ message: 'No hay solicitudes con esos criterios', data: [] });
        }

        res.json(results);
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — VER DETALLE DE UNA SOLICITUD
// ─────────────────────────────────────────────
const getSolicitudById = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT id, nombre_completo, correo, rol, estado,
               num_identificacion, tarjeta_profesional, telefono, fecha_registro
        FROM usuarios
        WHERE id = ? AND rol IN ('productor', 'tecnico')
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error del servidor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        res.json(results[0]);
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — APROBAR SOLICITUD
// ─────────────────────────────────────────────
const aprobarSolicitud = (req, res) => {
    const { id } = req.params;

    db.query(
        `SELECT id, estado FROM usuarios WHERE id = ? AND rol IN ('productor', 'tecnico')`,
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error del servidor' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Solicitud no encontrada' });
            }

            if (results[0].estado !== 'pendiente') {
                return res.status(400).json({
                    message: `Esta solicitud ya fue procesada (estado actual: ${results[0].estado})`
                });
            }

            db.query(`UPDATE usuarios SET estado = 'activo' WHERE id = ?`, [id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error al aprobar solicitud' });
                }
                res.json({ message: 'Solicitud aprobada. El usuario ya puede iniciar sesión ✅' });
            });
        }
    );
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — RECHAZAR SOLICITUD
// Body: { motivo: "..." } (obligatorio)
// ─────────────────────────────────────────────
const rechazarSolicitud = (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim() === '') {
        return res.status(400).json({ message: 'Debes ingresar un motivo de rechazo' });
    }

    db.query(
        `SELECT id, estado FROM usuarios WHERE id = ? AND rol IN ('productor', 'tecnico')`,
        [id],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error del servidor' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Solicitud no encontrada' });
            }

            if (results[0].estado !== 'pendiente') {
                return res.status(400).json({
                    message: `Esta solicitud ya fue procesada (estado actual: ${results[0].estado})`
                });
            }

            db.query(`UPDATE usuarios SET estado = 'inactivo' WHERE id = ?`, [id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error al rechazar solicitud' });
                }
                res.json({ message: 'Solicitud rechazada. La cuenta quedó inactiva ❌', motivo });
            });
        }
    );
};

module.exports = {
    getSolicitudes,
    getSolicitudById,
    aprobarSolicitud,
    rechazarSolicitud
};