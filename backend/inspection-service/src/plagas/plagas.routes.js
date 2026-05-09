const express = require('express');
const router = express.Router();

const {
    createPlaga,
    getPlagas,
    getPlagaById,
    updatePlaga,
    updateEstado,
    deletePlaga,
    listEspeciesDisponibles,
} = require('./plagas.controller');

const { verifyToken, verifyAdmin } = require('../middlewares/auth');

router.use(verifyToken, verifyAdmin);

router.post('/', createPlaga);
router.get('/', getPlagas);
router.get('/especies-disponibles', listEspeciesDisponibles);
router.get('/:id', getPlagaById);
router.put('/:id', updatePlaga);
router.patch('/:id/estado', updateEstado);
router.delete('/:id', deletePlaga);

module.exports = router;
