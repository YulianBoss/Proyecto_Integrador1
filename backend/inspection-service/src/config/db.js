const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     process.env.DB_PORT,
});

const ensureTable = (sql, done) => {
    connection.query(sql, (err) => {
        if (err) {
            console.error('❌ Error creando/verificando tabla:', err.message);
        }
        done();
    });
};

const ensureStatement = (sql, successMessage, done) => {
    connection.query(sql, (err) => {
        if (err) {
            console.error('❌ Error ejecutando migracion:', err.message);
        } else if (successMessage) {
            console.log(successMessage);
        }
        done();
    });
};

const runSequential = (tasks, index = 0) => {
    if (index >= tasks.length) return;
    tasks[index](() => runSequential(tasks, index + 1));
};

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

const ensureColumnInTable = (table, column, definition, after, done) => {
    connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = ?
           AND COLUMN_NAME  = ?`,
        [table, column],
        (err, rows) => {
            if (err) { console.error(`❌ Error verificando columna ${column} en ${table}:`, err.message); return done(); }
            if (Number(rows[0].total) > 0) return done();
            connection.query(
                `ALTER TABLE ${table} ADD COLUMN ${column} ${definition} AFTER ${after}`,
                (altErr) => {
                    if (altErr) console.error(`❌ Error agregando columna ${column} en ${table}:`, altErr.message);
                    else console.log(`✅ Columna ${column} agregada en ${table}`);
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
    // Migración: columnas de ubicación y datos de referencia para dashboard técnico
    runSequential([
        (next) => ensureColumn('lote_id', 'INT NULL', 'lugar_produccion_id', next),
        (next) => ensureColumn('departamento', 'VARCHAR(120) NULL', 'lote_id', next),
        (next) => ensureColumn('municipio', 'VARCHAR(120) NULL', 'departamento', next),
        (next) => ensureColumn('fecha_programada', 'DATE NULL', 'fecha_solicitud', next),
        (next) => ensureColumn('lote_codigo', 'VARCHAR(120) NULL', 'lote_id', next),
        (next) => ensureColumn('lugar_nombre', 'VARCHAR(255) NULL', 'lugar_produccion_id', next),
        (next) => ensureColumn('predio_nombre', 'VARCHAR(255) NULL', 'municipio', next),
        (next) => ensureColumn('porcentaje_infeccion_total', 'DECIMAL(8,2) NULL', 'concepto_tecnico', next),
        (next) => ensureColumn('nivel_riesgo', 'VARCHAR(30) NULL', 'porcentaje_infeccion_total', next),
        (next) => ensureColumn('informe_json', 'LONGTEXT NULL', 'nivel_riesgo', next),
        (next) => ensureTable(
            `CREATE TABLE IF NOT EXISTS inspeccion_lotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inspeccion_id INT NOT NULL,
                lote_id INT NOT NULL,
                lote_codigo VARCHAR(120) NULL,
                predio_nombre VARCHAR(255) NULL,
                total_plantas_inspeccionadas INT NOT NULL DEFAULT 0,
                observaciones_lote TEXT NULL,
                evaluado TINYINT(1) NOT NULL DEFAULT 0,
                fecha_evaluacion DATETIME NULL,
                fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_insp_lote (inspeccion_id, lote_id),
                INDEX idx_insp_lote_inspeccion (inspeccion_id)
            )`,
            next
        ),
        (next) => ensureTable(
            `CREATE TABLE IF NOT EXISTS inspeccion_lote_plagas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inspeccion_lote_id INT NOT NULL,
                plaga_id INT NULL,
                plaga_nombre VARCHAR(180) NOT NULL,
                plantas_afectadas INT NOT NULL DEFAULT 0,
                fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_lote_plagas_lote (inspeccion_lote_id)
            )`,
            next
        ),
        (next) => ensureTable(
            `CREATE TABLE IF NOT EXISTS plagas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre_comun VARCHAR(180) NOT NULL,
                nombre_cientifico VARCHAR(180) NOT NULL,
                descripcion TEXT NULL,
                nivel_riesgo ENUM('bajo','medio','alto') NOT NULL DEFAULT 'medio',
                estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
                fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_plaga_nombre_cientifico (nombre_cientifico)
            )`,
            next
        ),
        (next) => ensureTable(
            `CREATE TABLE IF NOT EXISTS plaga_cultivos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plaga_id INT NOT NULL,
                cultivo_id INT NOT NULL,
                cultivo_nombre VARCHAR(180) NOT NULL,
                fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_plaga_cultivo (plaga_id, cultivo_id),
                INDEX idx_plaga_cultivo_plaga (plaga_id),
                INDEX idx_plaga_cultivo_cultivo (cultivo_id)
            )`,
            next
        ),
        (next) => ensureColumnInTable('plagas', 'especie_id', 'INT NULL', 'nivel_riesgo', next),
        (next) => ensureTable(
            `INSERT IGNORE INTO plagas (nombre_comun, nombre_cientifico, descripcion, nivel_riesgo, especie_id, estado)
             VALUES
             ('Mosca blanca', 'Bemisia tabaci', 'Plaga chupadora que reduce vigor del cultivo', 'medio', 1, 'activo'),
             ('Trips', 'Frankliniella occidentalis', 'Plaga que causa danos en hojas y flores', 'medio', 3, 'activo'),
             ('Roya del cafe', 'Hemileia vastatrix', 'Enfermedad fungica frecuente en cafe', 'alto', 55, 'activo'),
             ('Antracnosis', 'Colletotrichum gloeosporioides', 'Enfermedad fungica con lesiones y pudricion', 'alto', 32, 'activo')`,
            next
        ),
        (next) => ensureStatement(
            `UPDATE plagas
             SET especie_id = CASE
                WHEN LOWER(nombre_cientifico) = LOWER('Bemisia tabaci') THEN 1
                WHEN LOWER(nombre_cientifico) = LOWER('Frankliniella occidentalis') THEN 3
                WHEN LOWER(nombre_cientifico) = LOWER('Hemileia vastatrix') THEN 55
                WHEN LOWER(nombre_cientifico) = LOWER('Colletotrichum gloeosporioides') THEN 32
                ELSE especie_id
             END
             WHERE especie_id IS NULL`,
            '✅ Plagas semilla asociadas con especie_id',
            next
        ),
        (next) => ensureStatement(
            `INSERT IGNORE INTO plaga_cultivos (plaga_id, cultivo_id, cultivo_nombre)
             SELECT id, especie_id, CONCAT('Cultivo #', especie_id)
             FROM plagas
             WHERE especie_id IS NOT NULL`,
            '✅ Relaciones plaga-cultivo sincronizadas desde especie_id',
            next
        ),
        (next) => ensureColumnInTable('inspeccion_lote_plagas', 'plaga_id', 'INT NULL', 'inspeccion_lote_id', next),
        (next) => ensureColumnInTable('inspeccion_lotes', 'fecha_evaluacion', 'DATETIME NULL', 'observaciones_lote', next),
        (next) => ensureColumnInTable('inspeccion_lotes', 'lote_codigo', 'VARCHAR(120) NULL', 'lote_id', next),
        (next) => ensureColumnInTable('inspeccion_lotes', 'predio_nombre', 'VARCHAR(255) NULL', 'lote_codigo', next),
        () => console.log('✅ Esquema inspection-service verificado'),
    ]);
});

module.exports = connection;