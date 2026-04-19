const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const schemaStatements = [
    `ALTER TABLE lugares_produccion
     MODIFY COLUMN estado VARCHAR(40) NOT NULL DEFAULT 'activo'`,
    `UPDATE lugares_produccion
     SET estado = 'activo'
     WHERE estado IN ('pendiente_validacion', 'rechazado')`,
    `CREATE TABLE IF NOT EXISTS predios_produccion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productor_id INT NOT NULL,
        nombre_identificacion VARCHAR(255) NOT NULL,
        departamento VARCHAR(120) NOT NULL,
        municipio VARCHAR(120) NOT NULL,
        vereda_direccion VARCHAR(255) NOT NULL,
        area_ha DECIMAL(10,2) NOT NULL,
        coordenadas_lat DECIMAL(10,8) NULL,
        coordenadas_lng DECIMAL(11,8) NULL,
        fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_predio_productor_nombre (productor_id, nombre_identificacion)
    )`,
    `CREATE TABLE IF NOT EXISTS lugar_predios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lugar_produccion_id INT NOT NULL,
        predio_id INT NOT NULL,
        es_principal TINYINT(1) NOT NULL DEFAULT 0,
        fecha_asociacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_lugar_predio (lugar_produccion_id, predio_id)
    )`,
    `UPDATE lugar_predios lp
     JOIN (
        SELECT MIN(id) AS id
        FROM lugar_predios
        GROUP BY lugar_produccion_id
        HAVING SUM(es_principal = 1) = 0
     ) faltantes ON faltantes.id = lp.id
        SET lp.es_principal = 1`,
    `INSERT IGNORE INTO predios_produccion
         (productor_id, nombre_identificacion, departamento, municipio, vereda_direccion, area_ha)
         VALUES
         (1, 'Finca Brisa Serena',      'Santander',          'Piedecuesta',             'Vereda El Volador',          14.30),
         (1, 'Predio Monte Claro',      'Cundinamarca',       'La Mesa',                 'Vereda El Ocaso',            11.75),
         (1, 'Hacienda Valle Azul',     'Valle del Cauca',    'Palmira',                 'Vereda Bolo San Isidro',     36.90),
         (1, 'Lote La Ceiba',           'Tolima',             'Melgar',                  'Vereda La Palmara',           8.45),
         (1, 'Granja El Laurel',        'Boyaca',             'Paipa',                   'Vereda Canos',               19.80),
         (1, 'Finca Agua Nueva',        'Meta',               'Restrepo',                'Vereda Caney Alto',          27.10),
         (1, 'Predio Camino Real',      'Antioquia',          'La Ceja',                 'Vereda San Rafael',          10.25),
         (1, 'Campo Altamira',          'Cesar',              'La Paz',                  'Vereda Varas Blancas',       41.60),
         (1, 'Parcela Sol del Este',    'Narino',             'Ipiales',                 'Vereda Yaramal',             12.95),
         (1, 'Estancia La Rivera',      'Risaralda',          'Marsella',                'Vereda El Nivel',            23.40),
         (1, 'Finca Cerro Alto',        'Huila',              'Garzon',                  'Vereda El Meson',            17.35),
         (1, 'Predio Palma Real',       'Cordoba',            'Cerete',                  'Vereda Martinez',            29.70),
         (1, 'Granja Horizonte Vivo',   'Sucre',              'Corozal',                 'Vereda Hato Nuevo',          15.15),
         (1, 'Lote Tierra Noble',       'Quindio',            'Montenegro',              'Vereda Once Casas',           7.90),
         (1, 'Hacienda Prado Largo',    'Magdalena',          'Cienaga',                 'Vereda Sevillano',           52.20),
         (1, 'Finca Bosque Claro',      'Caldas',             'Neira',                   'Vereda Aguabonita',          21.85),
         (1, 'Predio Alto Cedro',       'Cauca',              'Santander de Quilichao',  'Vereda San Pedro',           18.10),
         (1, 'Campo El Trigal',         'Putumayo',           'Villagarzon',             'Vereda La Castellana',       33.25),
         (1, 'Parcela Nube Blanca',     'Arauca',             'Tame',                    'Vereda Botalon',             24.55),
         (1, 'Estancia Los Almendros',  'Bolivar',            'Turbaco',                 'Vereda Canaveral',           13.65),
         (1, 'Finca Viento Norte',      'La Guajira',         'Fonseca',                 'Vereda Conejo',              46.35),
         (1, 'Predio Fuente Clara',     'Atlantico',          'Sabanalarga',             'Vereda Cascajal',             9.85),
         (1, 'Granja La Arboleda',      'Norte de Santander', 'Ocana',                   'Vereda Aguas Claras',        16.45),
         (1, 'Lote Mirador del Sol',    'Caqueta',            'El Doncello',             'Vereda Bellavista',          20.70),
         (1, 'Hacienda Llano Verde',    'Casanare',           'Aguazul',                 'Vereda Cupiagua',            58.90),
         (1, 'Finca El Recuerdo',       'Santander',          'Barichara',               'Vereda El Bosque',           24.82),
         (1, 'Hacienda La Esperanza',   'Caldas',             'Manizales',               'Vereda Alto Bonito',         25.39),
         (1, 'Granja Los Naranjos',     'Meta',               'Villavicencio',           'Vereda La Unión',            25.96),
         (1, 'Lote San Gabriel',        'Nariño',             'Pasto',                   'Vereda El Porvenir',         26.53),
         (1, 'Finca El Diamante',       'Quindío',            'Armenia',                 'Vereda Buenavista',          27.1),
         (1, 'Hacienda La Primavera',   'Risaralda',          'Pereira',                 'Vereda La Bella',            27.67),
         (1, 'Granja El Paraíso',       'Valle del Cauca',    'Palmira',                 'Vereda La Reforma',          28.24),
         (1, 'Finca Monteverde',        'Cauca',              'Popayán',                 'Vereda Santa Rosa',          28.81),
         (1, 'Hacienda El Edén',        'Cesar',              'Valledupar',              'Vereda El Carmen',           29.38),
         (1, 'Finca La Ilusión',        'Magdalena',          'Santa Marta',             'Vereda Minca',               29.95),
         (1, 'Granja Los Alpes',        'Tolima',             'Espinal',                 'Vereda La Sierra',           30.52),
         (1, 'Finca El Encanto',        'Huila',              'Neiva',                   'Vereda San Luis',            31.09),
         (1, 'Finca Campo Alegre',      'Boyacá',             'Tunja',                   'Vereda La Esperanza',        31.66),
         (1, 'Hacienda Santa Helena',   'Antioquia',          'Rionegro',                'Vereda Galicia',             32.23),
         (1, 'Finca El Refugio',        'Cundinamarca',       'Zipaquirá',               'Vereda Barandillas',         32.8),
         (1, 'Hacienda Las Palmas',     'Atlántico',          'Barranquilla',            'Vereda La Playa',            33.37),
         (1, 'Finca La Rivera',         'Bolívar',            'Cartagena',               'Vereda Pasacaballos',        33.94),
         (1, 'Granja El Triunfo',       'Sucre',              'Sincelejo',               'Vereda La Arena',            34.51),
         (1, 'Finca Los Laureles',      'Córdoba',            'Montería',                'Vereda El Sabanal',          35.08),
         (1, 'Hacienda Villa Luz',      'La Guajira',         'Riohacha',                'Vereda Camarones',           35.65),
         (1, 'Finca El Porvenir',       'Amazonas',           'Leticia',                 'Vereda Kilómetro 6',         36.22),
         (1, 'Granja La Fortuna',       'Putumayo',           'Mocoa',                   'Vereda Rumiyaco',            36.79),
         (1, 'Hacienda El Progreso',    'Caquetá',            'Florencia',               'Vereda El Caraño',           37.36),
         (1, 'Finca Las Delicias',      'Guaviare',           'San José del Guaviare',   'Vereda El Retorno',          37.93),
         (1, 'Lote La Esperanza'    ,   'Vaupés',             'Mitú',                    'Vereda Monforth',            38.5),
         (1, 'Finca Nueva Vida',        'Guainía',            'Inírida',                 'Vereda Amanavén',            39.07),
         (1, 'Hacienda El Descanso',    'Arauca',             'Arauca',                  'Vereda Todos Los Santos',    39.64),
         (1, 'Granja El Horizonte',     'Casanare',           'Yopal',                   'Vereda Morichal',            40.21),
         (1, 'Finca El Oasis',          'Vichada',            'Puerto Carreño',          'Vereda Aceitico',            40.78),
         (1, 'Hacienda San Pedro',      'Chocó',              'Quibdó',                  'Vereda Tutunendo',           41.35),
         (1, 'Finca Brisas del Campo',  'Santander',          'Socorro',                 'Vereda Palmas',              57.47),
         (1, 'Hacienda La Cumbre',      'Boyacá',             'Duitama',                 'Vereda Higueras',            58.04),
         (1, 'Granja El Manantial',     'Huila',              'Garzón',                  'Vereda Jagual',              58.61),
         (1, 'Finca El Arrayán',        'Tolima',             'Honda',                   'Vereda Guayabal',            59.18),
         (1, 'Hacienda El Rosal',       'Cundinamarca',       'Facatativá',              'Vereda Mancilla',            59.75),
         (1, 'Granja El Nogal',         'Antioquia',          'La Ceja',                 'Vereda San José',            10.32),
         (1, 'Finca El Cedro',          'Meta',               'Acacías',                 'Vereda Dinamarca',           10.89),
         (1, 'Hacienda La Estrella',    'Caldas',             'Chinchiná',               'Vereda Guayabal',            11.46),
         (1, 'Finca La Campiña',        'Risaralda',          'Dosquebradas',            'Vereda Frailes',             12.03),
         (1, 'Granja Buenavista',       'Quindío',            'Montenegro',              'Vereda Pueblo Tapao',        12.6),
         (1, 'Finca El Retiro',         'Valle del Cauca',    'Buga',                    'Vereda Chambimbal',          13.17),
         (1, 'Hacienda El Vergel',      'Cauca',              'Santander de Quilichao',  'Vereda Dominguillo',         13.74),
         (1, 'Granja El Mirador',       'Cesar',              'Aguachica',               'Vereda Buturama',            14.31),
         (1, 'Finca La Esmeralda',      'Magdalena',          'Fundación',               'Vereda Santa Rosa',          14.88),
         (1, 'Hacienda Los Pinos',      'Tolima',             'Chaparral',               'Vereda Tuluní',              15.45),
         (1, 'Finca El Bosque Alto',    'Huila',              'La Plata',                'Vereda Panorama',            16.02),
         (1, 'Granja El Diamante Azul', 'Boyacá',             'Sogamoso',                'Vereda Morcá',               16.59),
         (1, 'Finca Santa Clara',       'Antioquia',          'Santa Fe de Antioquia',   'Vereda El Llano',            17.16),
         (1, 'Hacienda El Jardín',      'Cundinamarca',       'Girardot',                'Vereda Acapulco',            17.73),
         (1, 'Granja El Lago',          'Atlántico',          'Soledad',                 'Vereda Hipódromo',           18.3),
         (1, 'Finca La Colina',         'Bolívar',            'Turbaco',                 'Vereda Cañaveral',           18.87),
         (1, 'Hacienda El Puente',      'Sucre',              'Corozal',                 'Vereda Las Peñas',           19.44),
         (1, 'Granja El Descanso Verde','Córdoba',            'Lorica',                  'Vereda La Doctrina',         20.01),
         (1, 'Finca El Horizonte Azul', 'La Guajira',         'Maicao',                  'Vereda Paraguachón',         20.58),
         (1, 'Hacienda La Palma Real',  'Amazonas',           'Leticia',                 'Vereda Tacana',              21.15),
         (1, 'Finca Brisas del Campo',  'Santander',          'Socorro',                 'Vereda Palmas',              57.47),
         (1, 'Hacienda La Cumbre',      'Boyacá',             'Duitama',                 'Vereda Higueras',            58.04),
         (1, 'Granja El Manantial',     'Huila',              'Garzón',                  'Vereda Jagual',              58.61),
         (1, 'Finca El Arrayán',        'Tolima',             'Honda',                   'Vereda Guayabal',            59.18),
         (1, 'Hacienda El Rosal',       'Cundinamarca',       'Facatativá',              'Vereda Mancilla',            59.75),
         (1, 'Granja El Nogal',         'Antioquia',          'La Ceja',                 'Vereda San José',            10.32),
         (1, 'Finca El Cedro',          'Meta',               'Acacías',                 'Vereda Dinamarca',           10.89),
         (1, 'Hacienda La Estrella',    'Caldas',             'Chinchiná',               'Vereda Guayabal',            11.46),
         (1, 'Finca La Campiña',        'Risaralda',          'Dosquebradas',            'Vereda Frailes',             12.03),
         (1, 'Granja Buenavista',       'Quindío',            'Montenegro',              'Vereda Pueblo Tapao',        12.6),
         (1, 'Finca El Retiro',         'Valle del Cauca',    'Buga',                    'Vereda Chambimbal',          13.17),
         (1, 'Hacienda El Vergel',      'Cauca',              'Santander de Quilichao',  'Vereda Dominguillo',         13.74),
         (1, 'Granja El Mirador',       'Cesar',              'Aguachica',               'Vereda Buturama',            14.31),
         (1, 'Finca La Esmeralda',      'Magdalena',          'Fundación',               'Vereda Santa Rosa',          14.88),
         (1, 'Hacienda Los Pinos',      'Tolima',             'Chaparral',               'Vereda Tuluní',              15.45),
         (1, 'Finca El Bosque Alto',    'Huila',              'La Plata',                'Vereda Panorama',            16.02),
         (1, 'Granja El Diamante Azul', 'Boyacá',             'Sogamoso',                'Vereda Morcá',               16.59),
         (1, 'Finca Santa Clara',       'Antioquia',          'Santa Fe de Antioquia',   'Vereda El Llano',            17.16),
         (1, 'Hacienda El Jardín',      'Cundinamarca',       'Girardot',                'Vereda Acapulco',            17.73),
         (1, 'Granja El Lago',          'Atlántico',          'Soledad',                 'Vereda Hipódromo',           18.3),
         (1, 'Finca La Colina',         'Bolívar',            'Turbaco',                 'Vereda Cañaveral',           18.87),
         (1, 'Hacienda El Puente',      'Sucre',              'Corozal',                 'Vereda Las Peñas',           19.44),
         (1, 'Granja El Descanso Verde','Córdoba',            'Lorica',                  'Vereda La Doctrina',         20.01),
         (1, 'Finca El Horizonte Azul', 'La Guajira',         'Maicao',                  'Vereda Paraguachón',         20.58),
         (1, 'Hacienda La Palma Real',  'Amazonas',           'Leticia',                 'Vereda Tacana',              21.15),
         (1, 'Finca El Sendero',        'Putumayo',           'Puerto Asís',             'Vereda La Carmelita',        21.72),
         (1, 'Granja La Pradera',       'Caquetá',            'San Vicente del Caguán',  'Vereda Los Pozos',           22.29),
         (1, 'Hacienda El Roble',       'Guaviare',           'Calamar',                 'Vereda La Libertad',         22.86),
         (1, 'Finca El Silencio',       'Vichada',            'La Primavera',            'Vereda Santa Bárbara',       23.43),
         (1, 'Granja El Porvenir Verde','Arauca',             'Saravena',                'Vereda El Troncal',          24.00)`
];

const ensureSchema = (index = 0) => {
    if (index >= schemaStatements.length) {
        console.log('✅ Esquema production-service verificado');
        return;
    }

    connection.query(schemaStatements[index], (err) => {
        if (err) {
            console.error(`❌ Error aplicando esquema (${index + 1}/${schemaStatements.length}):`, err.message);
        }
        ensureSchema(index + 1);
    });
};

const ensureLotesPredioColumn = (done) => {
    connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'lotes'
           AND COLUMN_NAME = 'predio_id'`,
        (err, rows) => {
            if (err) {
                console.error('❌ Error validando columna predio_id en lotes:', err.message);
                done();
                return;
            }

            const exists = Number(rows?.[0]?.total || 0) > 0;
            if (exists) {
                done();
                return;
            }

            connection.query(
                `ALTER TABLE lotes
                 ADD COLUMN predio_id INT NULL AFTER lugar_produccion_id`,
                (alterErr) => {
                    if (alterErr) {
                        console.error('❌ Error agregando columna predio_id en lotes:', alterErr.message);
                    }
                    done();
                }
            );
        }
    );
};

connection.connect((err) => {
    if (err) {
        console.error('❌ Error DB:', err);
    } else {
        console.log('✅ DB production-service conectada');
        ensureLotesPredioColumn(() => ensureSchema());
    }
});

module.exports = connection;