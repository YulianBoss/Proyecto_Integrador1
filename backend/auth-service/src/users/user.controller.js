const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────
// 🔓 PÚBLICO — REGISTRO (productor o tecnico)
// ─────────────────────────────────────────────
const register = async (req, res) => {
    const { nombre_completo, correo, password, rol, num_identificacion, telefono, tarjeta_profesional, departamento, municipio } = req.body;

    if (!nombre_completo || !correo || !password || !rol || !num_identificacion || !telefono) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const nombreLimpio = String(nombre_completo).trim();
    const correoLimpio = String(correo).trim();
    const identificacionLimpia = String(num_identificacion).trim();
    const telefonoLimpio = String(telefono).trim();

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+(?:\s+[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+)+$/.test(nombreLimpio)) {
        return res.status(400).json({ message: 'El nombre completo debe tener al menos dos palabras y solo letras con espacios' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correoLimpio)) {
        return res.status(400).json({ message: 'Correo electrónico inválido. Debe incluir dominio' });
    }

    if (!/^\d{8,10}$/.test(identificacionLimpia)) {
        return res.status(400).json({ message: 'El número de identificación debe tener entre 8 y 10 dígitos' });
    }

    if (!/^\d{10}$/.test(telefonoLimpio)) {
        return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos numéricos' });
    }

    // Solo se puede registrar como productor o tecnico
    if (!['productor', 'tecnico'].includes(rol)) {
        return res.status(403).json({ message: 'Rol no permitido. Solo puedes registrarte como productor o tecnico' });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número' });
    }

    if (rol === 'tecnico') {
        if (!tarjeta_profesional) {
            return res.status(400).json({ message: 'La tarjeta profesional es obligatoria para Asistente Técnico' });
        }

        if (!/^\d+$/.test(String(tarjeta_profesional).trim())) {
            return res.status(400).json({ message: 'La tarjeta profesional debe contener solo números' });
        }

        if (!departamento || !municipio) {
            return res.status(400).json({ message: 'El departamento y municipio de ubicación son obligatorios para el Asistente Técnico' });
        }
    }

    const tarjetaProfesionalLimpia = rol === 'tecnico'
        ? String(tarjeta_profesional).trim()
        : null;

    try {
const checkQuery = `
    SELECT id, correo, telefono, num_identificacion 
    FROM usuarios 
    WHERE correo = ? OR telefono = ? OR num_identificacion = ?
`;

db.query(checkQuery, [correoLimpio, telefonoLimpio, identificacionLimpia], async (err, results) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error del servidor' });
    }

    if (results.length > 0) {
        const existente = results[0];

        if (existente.correo === correoLimpio) {
            return res.status(409).json({ message: 'El correo electrónico ya está registrado en el sistema' });
        }

        if (existente.telefono === telefonoLimpio) {
            return res.status(409).json({ message: 'El teléfono ya está registrado en el sistema' });
        }

        if (existente.num_identificacion === identificacionLimpia) {
            return res.status(409).json({ message: 'El número de identificación ya está registrado en el sistema' });
        }
    }

            const hashedPassword = await bcrypt.hash(password, 10);

            const insertQuery = `
                INSERT INTO usuarios 
                (nombre_completo, correo, contrasena_hash, rol, estado, num_identificacion, tarjeta_profesional, telefono, departamento, municipio)
                VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?)
            `;

            db.query(insertQuery, [
                nombreLimpio,
                correoLimpio,
                hashedPassword,
                rol,
                identificacionLimpia,
                tarjetaProfesionalLimpia,
                telefonoLimpio,
                rol === 'tecnico' ? String(departamento).trim() : null,
                rol === 'tecnico' ? String(municipio).trim() : null,
            ], (err, insertResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error al registrar usuario' });
                }

                const notificacionQuery = `
                    INSERT INTO notificaciones_admin (tipo, titulo, mensaje, referencia_usuario_id)
                    VALUES (?, ?, ?, ?)
                `;

                const titulo = 'Nueva solicitud de registro';
                const mensaje = `${nombreLimpio} solicitó acceso como ${rol}.`;

                db.query(notificacionQuery, ['solicitud_registro', titulo, mensaje, insertResult.insertId], (notifyErr) => {
                    if (notifyErr) {
                        console.error('⚠️ No se pudo registrar notificación de solicitud:', notifyErr.message);
                    }
                });

                res.status(201).json({
                    message: 'Solicitud enviada. Tu cuenta está pendiente de aprobación por el administrador ✅'
                });
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ─────────────────────────────────────────────
// 🔓 PÚBLICO — LOGIN
// ─────────────────────────────────────────────
const login = (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    const query = `SELECT * FROM usuarios WHERE correo = ?`;

    db.query(query, [correo], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error del servidor' });
        }

        // Mensaje genérico por seguridad
        if (results.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = results[0];

        if (user.estado === 'pendiente') {
            return res.status(403).json({ message: 'Tu cuenta está pendiente de aprobación. Contacta al administrador' });
        }

        if (user.estado === 'inactivo' || user.estado === 'rechazado') {
            return res.status(403).json({ message: 'Tu cuenta no está activa. Contacta al administrador' });
        }

        const validPassword = await bcrypt.compare(password, user.contrasena_hash);

        if (!validPassword) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const jwtPayload = { id: user.id, rol: user.rol };
        if (user.rol === 'tecnico') {
            jwtPayload.departamento = user.departamento || null;
            jwtPayload.municipio    = user.municipio    || null;
        }

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '2h' });

        const userResponse = {
            id: user.id,
            nombre: user.nombre_completo,
            rol: user.rol,
            correo: user.correo,
        };
        if (user.rol === 'tecnico') {
            userResponse.departamento = user.departamento || null;
            userResponse.municipio    = user.municipio    || null;
        }

        res.json({ message: 'Login exitoso ✅', token, user: userResponse });
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — LISTAR TODOS LOS USUARIOS
// ─────────────────────────────────────────────
const getAllUsers = (req, res) => {
    const { estado, rol, departamento, municipio } = req.query;

    let query = `
        SELECT id, nombre_completo, correo, rol, estado, num_identificacion, tarjeta_profesional, telefono, departamento, municipio, fecha_registro
        FROM usuarios WHERE 1=1
    `;
    const params = [];

    if (estado) { query += ` AND estado = ?`; params.push(estado); }
    if (rol)    { query += ` AND rol = ?`;    params.push(rol); }
    if (departamento) { query += ` AND departamento = ?`; params.push(departamento); }
    if (municipio)    { query += ` AND municipio = ?`;    params.push(municipio); }

    query += ` ORDER BY fecha_registro DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener usuarios' });
        }
        res.json(results);
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — VER UN USUARIO POR ID
// ─────────────────────────────────────────────
const getUserById = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT id, nombre_completo, correo, rol, estado, num_identificacion, tarjeta_profesional, telefono, departamento, municipio, fecha_registro
        FROM usuarios WHERE id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener usuario' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(results[0]);
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — EDITAR USUARIO
// ─────────────────────────────────────────────
const updateUser = (req, res) => {
    const { id } = req.params;
    const { nombre_completo, correo, telefono, rol, estado } = req.body;
    const adminId = req.user.id;

    if (parseInt(id) === adminId && estado === 'inactivo') {
        return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    if (rol && !['productor', 'tecnico', 'admin'].includes(rol)) {
        return res.status(400).json({ message: 'Rol no válido' });
    }

    if (estado && !['activo', 'inactivo', 'pendiente'].includes(estado)) {
        return res.status(400).json({ message: 'Estado no válido' });
    }

    const correoLimpio = correo !== undefined ? String(correo).trim() : undefined;
    const telefonoLimpio = telefono !== undefined ? String(telefono).trim() : undefined;

    if (correo !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correoLimpio)) {
        return res.status(400).json({ message: 'Correo electrónico inválido. Debe incluir dominio' });
    }

    if (telefono !== undefined && telefonoLimpio === '') {
        return res.status(400).json({ message: 'El teléfono no puede ser nulo o vacío' });
    }

    if (telefono !== undefined && !/^\d{10}$/.test(telefonoLimpio)) {
        return res.status(400).json({ message: 'El teléfono debe tener exactamente 10 dígitos numéricos' });
    }

    db.query(`SELECT id FROM usuarios WHERE id = ?`, [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        if (results.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const fields = [];
        const values = [];

        if (nombre_completo)        { fields.push('nombre_completo = ?'); values.push(nombre_completo); }
        if (correo !== undefined)    { fields.push('correo = ?');          values.push(correoLimpio); }
        if (telefono !== undefined)  { fields.push('telefono = ?');        values.push(telefonoLimpio); }
        if (rol)                     { fields.push('rol = ?');             values.push(rol); }
        if (estado)                  { fields.push('estado = ?');          values.push(estado); }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
        }

        const ejecutarActualizacion = () => {
            values.push(id);
            db.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error al actualizar usuario' });
                }
                res.json({ message: 'Usuario actualizado ✅' });
            });
        };

        const validarTelefonoUnico = () => {
            if (telefono === undefined) {
                return ejecutarActualizacion();
            }

            db.query(`SELECT id FROM usuarios WHERE telefono = ? AND id <> ?`, [telefonoLimpio, id], (phoneErr, phoneResults) => {
                if (phoneErr) {
                    console.error(phoneErr);
                    return res.status(500).json({ message: 'Error del servidor' });
                }

                if (phoneResults.length > 0) {
                    return res.status(400).json({ message: 'El teléfono ya está registrado en otra cuenta' });
                }

                ejecutarActualizacion();
            });
        };

        if (correo !== undefined) {
            db.query(`SELECT id FROM usuarios WHERE correo = ? AND id <> ?`, [correoLimpio, id], (mailErr, mailResults) => {
                if (mailErr) {
                    console.error(mailErr);
                    return res.status(500).json({ message: 'Error del servidor' });
                }

                if (mailResults.length > 0) {
                    return res.status(400).json({ message: 'El correo ya está registrado en otra cuenta' });
                }

                validarTelefonoUnico();
            });
            return;
        }

        validarTelefonoUnico();
    });
};

// ─────────────────────────────────────────────
// 🔒 CUALQUIER ROL AUTENTICADO — PERFIL BÁSICO POR ID
// Uso interno entre servicios para resolver nombres por id
// ─────────────────────────────────────────────
const getUserPublicById = (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT id, nombre_completo, correo, rol, estado
        FROM usuarios
        WHERE id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener usuario' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = results[0];
        return res.json({
            id: user.id,
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            rol: user.rol,
            estado: user.estado,
        });
    });
};

// ─────────────────────────────────────────────
// 🔒 ADMIN — ACTIVAR / DESACTIVAR CUENTA
// ─────────────────────────────────────────────
const toggleUserStatus = (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const adminId = req.user.id;

    if (!['activo', 'inactivo'].includes(estado)) {
        return res.status(400).json({ message: 'Estado inválido. Usa: activo | inactivo' });
    }

    if (parseInt(id) === adminId && estado === 'inactivo') {
        return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    db.query(`SELECT id FROM usuarios WHERE id = ?`, [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error del servidor' });
        if (results.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        db.query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id], (err) => {
            if (err) return res.status(500).json({ message: 'Error al cambiar estado' });
            res.json({ message: `Cuenta ${estado === 'activo' ? 'activada' : 'desactivada'} ✅` });
        });
    });
};

// ─────────────────────────────────────────────
// 🔒 CUALQUIER ROL AUTENTICADO — LISTAR TÉCNICOS (uso interno entre servicios)
// Solo expone id y nombre de técnicos activos, opcionalmente filtrados por ubicación
// ─────────────────────────────────────────────
const getTecnicosByLocation = (req, res) => {
    const { departamento, municipio } = req.query;

    let query = `
        SELECT id, nombre_completo, correo, departamento, municipio
        FROM usuarios
        WHERE rol = 'tecnico' AND estado = 'activo'
    `;
    const params = [];

    if (departamento) { query += ` AND departamento = ?`; params.push(departamento); }
    if (municipio)    { query += ` AND municipio = ?`;    params.push(municipio); }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error al obtener técnicos' });
        }
        res.json(results);
    });
};

module.exports = {
    register,
    login,
    getAllUsers,
    getUserById,
    getUserPublicById,
    updateUser,
    toggleUserStatus,
    getTecnicosByLocation
};