const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT,
});

// Agrega una columna si no existe aún
const ensureColumn = (column, definition, after, done) => {
    connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = 'inspecciones'
           AND COLUMN_NAME  = ?`,
        [column],
        (err, rows) => {
            if (err) { console.error(`❌ Error verificando columna ${column}:`, err.message); return done(); }
            if (Number(rows[0].total) > 0) return done();
            connection.query(
                `ALTER TABLE inspecciones ADD COLUMN ${column} ${definition} AFTER ${after}`,
                (altErr) => {
                    if (altErr) console.error(`❌ Error agregando columna ${column}:`, altErr.message);
                    else console.log(`✅ Columna ${column} agregada a inspecciones`);
                    done();
                }
            );
        }
    );
};

connection.connect((err) => {
    if (err) {
        console.error('❌ Error DB inspection-service:', err);
        return;
    }
    console.log('✅ DB inspection-service conectada');
    // Migración: columnas de ubicación y lote
    ensureColumn('lote_id', 'INT NULL', 'lugar_produccion_id', () =>
        ensureColumn('departamento', 'VARCHAR(120) NULL', 'lote_id', () =>
            ensureColumn('municipio', 'VARCHAR(120) NULL', 'departamento', () => {
                console.log('✅ Esquema inspection-service verificado');
            })
        )
    );
});

module.exports = connection;