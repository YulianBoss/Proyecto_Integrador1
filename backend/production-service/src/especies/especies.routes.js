const express = require('express')
const router = express.Router()
const {
	getEspecies,
	getEspeciesAdmin,
	createEspecie,
	updateEspecie,
	updateEstadoEspecie,
	deleteEspecie,
} = require('./especies.controller')
const { verifyToken, verifyAdmin } = require('../middlewares/auth')

router.get('/', verifyToken, getEspecies)
router.get('/admin', verifyToken, verifyAdmin, getEspeciesAdmin)
router.post('/', verifyToken, verifyAdmin, createEspecie)
router.put('/:id', verifyToken, verifyAdmin, updateEspecie)
router.patch('/:id/estado', verifyToken, verifyAdmin, updateEstadoEspecie)
router.delete('/:id', verifyToken, verifyAdmin, deleteEspecie)

module.exports = router