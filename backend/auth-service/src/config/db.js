const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error DB:', err);
    } else {
        console.log('✅ DB auth-service conectada');

        const createNotificationsTableQuery = `
            CREATE TABLE IF NOT EXISTS notificaciones_admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipo VARCHAR(50) NOT NULL,
                titulo VARCHAR(150) NOT NULL,
                mensaje VARCHAR(255) NOT NULL,
                referencia_usuario_id INT NULL,
                leida TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notif_leida_fecha (leida, created_at)
            )
        `;

        connection.query(createNotificationsTableQuery, (tableErr) => {
            if (tableErr) {
                console.error('⚠️ No se pudo crear/verificar notificaciones_admin:', tableErr.message);
            }
        });

        const ensureColumn = (column, definition, after, done) => {
            connection.query(
                `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = ? LIMIT 1`,
                [process.env.DB_NAME, column],
                (err, rows) => {
                    if (err) { console.error(`⚠️ No se pudo verificar ${column}:`, err.message); done(); return; }
                    if (rows.length > 0) { done(); return; }
                    connection.query(
                        `ALTER TABLE usuarios ADD COLUMN ${column} ${definition} AFTER ${after}`,
                        (alterErr) => {
                            if (alterErr) console.error(`⚠️ No se pudo agregar ${column}:`, alterErr.message);
                            else console.log(`✅ Columna ${column} agregada en usuarios`);
                            done();
                        }
                    );
                }
            );
        };

        ensureColumn('tarjeta_profesional', 'VARCHAR(30) NULL', 'num_identificacion', () => {
            ensureColumn('departamento', 'VARCHAR(120) NULL', 'tarjeta_profesional', () => {
                ensureColumn('municipio', 'VARCHAR(120) NULL', 'departamento', () => {});
            });
        });
    }
});

module.exports = connection;