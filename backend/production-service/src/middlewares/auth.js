const jwt = require('jsonwebtoken');

// ✅ Verifica JWT válido
const verifyToken = (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(403).json({ message: 'Token requerido' });

    const token = header.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido o expirado' });
        req.user = decoded;
        next();
    });
};

// ✅ Solo productores pueden gestionar sus lugares/lotes/cultivos
const verifyProductor = (req, res, next) => {
    if (req.user.rol !== 'productor') {
        return res.status(403).json({ message: 'Acceso denegado: solo productores' });
    }
    next();
};

const verifyTecnicoOrAdmin = (req, res, next) => {
    if (!['tecnico', 'admin'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Acceso denegado: solo tecnicos o administradores' });
    }
    next();
};

const verifyAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
    }
    next();
};

module.exports = { verifyToken, verifyProductor, verifyTecnicoOrAdmin, verifyAdmin };