const express = require('express');
const router = express.Router();

const {
    solicitarInspeccion,
    getMisSolicitudes,
    getDetalleSolicitud,
    getInspeccionesTecnico,
    iniciarInspeccion,
    completarInspeccion,
} = require('./inspection.controller');

const { verifyToken, verifyProductor, verifyTecnico } = require('../middlewares/auth');

// ── Rutas del Productor ─────────────────────────────────────
router.post('/solicitar',       verifyToken, verifyProductor, solicitarInspeccion);
router.get('/mis-solicitudes',  verifyToken, verifyProductor, getMisSolicitudes);

// ── Rutas del Técnico ───────────────────────────────────────
router.get('/tecnico/mis-inspecciones', verifyToken, verifyTecnico, getInspeccionesTecnico);
router.patch('/:id/iniciar',            verifyToken, verifyTecnico, iniciarInspeccion);
router.patch('/:id/completar',          verifyToken, verifyTecnico, completarInspeccion);

// ── Ruta compartida (detalle) ───────────────────────────────
router.get('/:id', verifyToken, getDetalleSolicitud);

module.exports = router;