const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getAllUsers,
    getUserById,
    getUserPublicById,
    updateUser,
    toggleUserStatus,
    getTecnicosByLocation
} = require('./user.controller');

const { verifyToken, verifyAdmin } = require('../middlewares/auth');

// ─── PÚBLICAS ────────────────────────────────
router.post('/register', register);
router.post('/login', login);

// ─── SERVICIO INTERNO (cualquier token válido) ───────────────
router.get('/tecnicos', verifyToken, getTecnicosByLocation);
router.get('/public/:id', verifyToken, getUserPublicById);

// ─── SOLO ADMIN ──────────────────────────────
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.get('/:id', verifyToken, verifyAdmin, getUserById);
router.put('/:id', verifyToken, verifyAdmin, updateUser);
router.patch('/:id/estado', verifyToken, verifyAdmin, toggleUserStatus);

module.exports = router;