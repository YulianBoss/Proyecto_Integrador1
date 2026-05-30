const express = require('express');
const router = express.Router();

const {
    solicitarInspeccion,
    getMisSolicitudes,
    getDetalleSolicitud,
    getInspecciones,
    getInspeccionesTecnico,
    getTecnicoDashboard,
    getDetalleRealizacion,
    asignarTecnicoManual,
    iniciarInspeccion,
    guardarEvaluacionLote,
    completarInspeccion,
} = require('./inspection.controller');

const { verifyToken, verifyProductor, verifyTecnico, verifyAdmin } = require('../middlewares/auth');

// ── Rutas del Productor ─────────────────────────────────────
router.post('/solicitar',       verifyToken, verifyProductor, solicitarInspeccion);
router.get('/',                verifyToken, getInspecciones);
router.get('/mis-solicitudes',  verifyToken, verifyProductor, getMisSolicitudes);

// ── Rutas del Técnico ───────────────────────────────────────
router.get('/tecnico/mis-inspecciones', verifyToken, verifyTecnico, getInspeccionesTecnico);
router.get('/tecnico/dashboard',       verifyToken, verifyTecnico, getTecnicoDashboard);
router.get('/:id/realizacion',          verifyToken, verifyTecnico, getDetalleRealizacion);
router.patch('/:id/iniciar',            verifyToken, verifyTecnico, iniciarInspeccion);
router.put('/:id/lotes/:loteId/evaluar',verifyToken, verifyTecnico, guardarEvaluacionLote);
router.patch('/:id/completar',          verifyToken, verifyTecnico, completarInspeccion);

// ── Rutas del Admin ─────────────────────────────────────────
router.patch('/:id/asignar-tecnico', verifyToken, verifyAdmin, asignarTecnicoManual);

// ── Ruta compartida (detalle) ───────────────────────────────
router.get('/:id', verifyToken, getDetalleSolicitud);

module.exports = router;