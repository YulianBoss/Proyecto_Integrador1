const express = require('express');
const router = express.Router();
const controller = require('./predios.controller');
const { verifyToken, verifyProductor } = require('../middlewares/auth');

router.use(verifyToken, verifyProductor);

router.get('/', controller.listPredios);
router.post('/', controller.createPredio);
router.put('/:id', controller.updatePredio);
router.delete('/:id', controller.deletePredio);

module.exports = router;