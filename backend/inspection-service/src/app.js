const express = require('express');
const cors = require('cors');
require('dotenv').config();

require('./config/db');

const inspectionRoutes = require('./inspections/inspection.routes');
const plagaRoutes = require('./plagas/plagas.routes');

const app = express();

// ⚡ CONFIGURACIÓN DE CORS EN INSPECCIONES
app.use(cors({
    origin: '*', // Permite que tu React conecte sin restricciones
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'] // Permite recibir el token del usuario
}));

// Evita fallos con la librería de rutas en Express 5 usando RegExp nativa
app.options(/.*/, cors());

app.use(express.json());

app.use('/api/inspections', inspectionRoutes);
app.use('/api/plagas', plagaRoutes);

// 🛠️ CORREGIDO AQUÍ: Añadido 'app.' antes del get
app.get('/', (req, res) => {
    res.send('Inspection Service funcionando 🔍');
});

app.listen(process.env.PORT, () => {
    console.log(`Inspection service en puerto ${process.env.PORT}`);
});