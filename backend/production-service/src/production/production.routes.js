const express = require('express');
const router = express.Router();
const controller = require('./production.controller');
const { verifyToken, verifyProductor, verifyTecnicoOrAdmin } = require('../middlewares/auth');

router.get('/inspeccion/:id', verifyToken, verifyTecnicoOrAdmin, controller.getProductionForInspection);
router.patch('/inspeccion/:id/ultima-inspeccion', verifyToken, verifyTecnicoOrAdmin, controller.registrarUltimaInspeccion);

router.post('/', verifyToken, verifyProductor, controller.createProduction);
router.get('/', verifyToken, verifyProductor, controller.getMyProductions);
router.get('/:id', verifyToken, verifyProductor, controller.getProductionById);
router.put('/:id', verifyToken, verifyProductor, controller.updateProduction);
router.delete('/:id', verifyToken, verifyProductor, controller.deleteProduction);

module.exports = router;