const mysql = require('mysql2');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

let connection;

function createConnection() {
    connection = mysql.createConnection(DB_CONFIG);

    connection.connect((err) => {
        if (err) {
            console.error('❌ Error DB:', err);
            setTimeout(createConnection, 5000);
            return;
        }
        console.log('✅ DB production-service conectada');
        ensureLotesPredioColumn(() => ensureSchema());
    });

    connection.on('error', (err) => {
        console.error('❌ DB error:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.fatal) {
            console.log('🔄 Reconectando DB...');
            createConnection();
        }
    });
}

// Proxy para que los módulos que importan este archivo sigan funcionando
const handler = {
    get(_, prop) { return typeof connection[prop] === 'function' ? connection[prop].bind(connection) : connection[prop]; },
    set(_, prop, value) { connection[prop] = value; return true; }
};
const connectionProxy = new Proxy({}, handler);

// ── Municipios de Colombia (fuente: colombiaMunicipios.js del frontend) ──────
const MUNICIPIOS_COLOMBIA = [
    { departamento: 'Amazonas',            municipios: ['Leticia','Puerto Nariño','El Encanto','La Chorrera','La Pedrera','Mirití-Paraná','Puerto Alegría','Puerto Arica','Puerto Santander','Tarapacá'] },
    { departamento: 'Antioquia',           municipios: ['Medellín','Bello','Itagüí','Envigado','Apartadó','Turbo','Rionegro','Caucasia','Marinilla','La Estrella','Sabaneta','Copacabana','Girardota','Barbosa','Caldas','La Ceja','El Retiro','El Carmen de Viboral','Santa Fe de Antioquia','Yarumal','Andes','Ciudad Bolívar','Urrao','Montería (Antioquia)','Necoclí','San Juan de Urabá','Chigorodó','Carepa','Mutatá','Frontino','Dabeiba','Peque','Buriticá','Anzá','Armenia (Antioquia)','Olaya','Liborina','Sabanalarga','Abriaquí','Giraldo','Sopetrán'] },
    { departamento: 'Arauca',              municipios: ['Arauca','Arauquita','Saravena','Tame','Fortul','Puerto Rondón','Cravo Norte'] },
    { departamento: 'Atlántico',           municipios: ['Barranquilla','Soledad','Malambo','Sabanalarga','Baranoa','Santo Tomás','Palmar de Varela','Ponedera','Juan de Acosta','Usiacurí','Piojó','Tubará','Puerto Colombia','Galapa','Polonuevo','Repelón','Luruaco','Campo de la Cruz','Candelaria','Manatí','Suán'] },
    { departamento: 'Bogotá D.C.',         municipios: ['Bogotá D.C.'] },
    { departamento: 'Bolívar',             municipios: ['Cartagena','Magangué','Mompox','El Carmen de Bolívar','Turbaco','Arjona','San Estanislao','Santa Rosa','Margarita','Simití','Rioviejo','Pinillos','Barranco de Loba','Tiquisio','Achí','San Jacinto','El Guamo','Córdoba','Cicuco'] },
    { departamento: 'Boyacá',              municipios: ['Tunja','Duitama','Sogamoso','Chiquinquirá','Paipa','Villa de Leyva','Moniquirá','Soatá','Nobsa','Tibasosa','Firavitoba','Iza','Tuta','Combita','Motavita','Cómbita','Samacá','Ráquira','Sáchica','Sutamarchán','Tinjacá','Arcabuco','Chitaraque','Güicán','El Cocuy','Chiscas','Socha','Paz de Río','Belén','Cerinza','Tutazá','Betéitiva','Santa Rosa de Viterbo'] },
    { departamento: 'Caldas',              municipios: ['Manizales','La Dorada','Chinchiná','Villamaría','Anserma','Aranzazu','Belalcázar','Filadelfia','La Merced','Manzanares','Marmato','Marquetalia','Marulanda','Neira','Norcasia','Pácora','Palestina','Pensilvania','Riosucio','Risaralda','Salamina','Samaná','San José','Supía','Victoria','Viterbo'] },
    { departamento: 'Caquetá',             municipios: ['Florencia','San Vicente del Caguán','El Paujil','Puerto Rico','Belén de los Andaquíes','Cartagena del Chairá','Curillo','El Doncello','La Montañita','Milán','Morelia','Solano','Solita','Valparaíso','Albania'] },
    { departamento: 'Casanare',            municipios: ['Yopal','Aguazul','Villanueva','Paz de Ariporo','Trinidad','Hato Corozal','Nunchía','Orocué','Recetor','Sácama','San Luis de Palenque','Támara','Tauramena','Monterrey','Chámeza','Maní','Pore'] },
    { departamento: 'Cauca',               municipios: ['Popayán','Santander de Quilichao','Puerto Tejada','Patía','Timbío','Piendamó','El Tambo','La Vega','Silvia','Cajibío','Bolívar','Almaguer','Argelia','Balboa','Buenos Aires','Caldono','Caloto','Corinto','Florencia','Guachené','Guapí','Inzá','Jambaló','La Sierra','Mercaderes','Miranda','Morales','Padilla','Páez','Puracé','Rosas','San Sebastián','Santa Rosa','Sotará','Suárez','Sucre','Timbiquí','Toribío','Totoró','Villa Rica'] },
    { departamento: 'Cesar',               municipios: ['Valledupar','Aguachica','Bosconia','La Jagua de Ibirico','Codazzi','El Copey','Chimichagua','Chiriguaná','Curumaní','El Paso','Gamarra','González','La Gloria','La Paz','Manaure Balcón del Cesar','Pailitas','Pelaya','Pueblo Bello','Río de Oro','San Alberto','San Diego','San Martín','Tamalameque'] },
    { departamento: 'Chocó',               municipios: ['Quibdó','Istmina','Riosucio','Acandí','Alto Baudó','Atrato','Bagadó','Bahía Solano','Bajo Baudó','Bojayá','Carmen del Darien','Cértegui','Condoto','El Carmen de Atrato','Juradó','Litoral del San Juan','Lloró','Medio Atrato','Medio Baudó','Medio San Juan','Nóvita','Nuquí','Río Iro','Río Quito','Sipi','Tadó','Unguía','Unión Panamericana'] },
    { departamento: 'Córdoba',             municipios: ['Montería','Lorica','Sahagún','Cereté','Planeta Rica','Tierralta','Montelíbano','Chinú','San Pelayo','Ciénaga de Oro','Moñitos','Los Córdobas','Puerto Escondido','San Antero','San Bernardo del Viento','San Carlos','San José de Uré','Ayapel','Buenavista','Canalete','Cotorra','La Apartada','Momil','Montos','Purísima','Tuchín','Valencia'] },
    { departamento: 'Cundinamarca',        municipios: ['Soacha','Fusagasugá','Zipaquirá','Facatativá','Chía','Cajicá','Mosquera','Madrid','Funza','Girardot','Arbeláez','La Mesa','Tocancipá','Gachancipá','Sopó','Briceño','Cogua','Cucunubá','El Rosal','Guasca','Guatavita','La Calera','La Vega (Cundinamarca)','Machetá','Manta','Nemocón','Nimaima','Nocaima','Pacho','Paime','Pasca','San Bernardo','Silvania','Simijaca','Suesca','Sutatausa','Tabio','Tausa','Tenjo','Ubaté','Une','Venecia','Villa de San Diego de Ubaté','Villeta','Viota','Yacopí','Nilo','Ricaurte','Agua de Dios','Beltrán','Gutiérrez'] },
    { departamento: 'Guainía',             municipios: ['Inírida','Barrancominas','Cacahual','La Guadalupe','Mapiripana','Morichal','Pana Pana','Puerto Colombia','San Felipe'] },
    { departamento: 'Guaviare',            municipios: ['San José del Guaviare','El Retorno','Calamar','Miraflores'] },
    { departamento: 'Huila',               municipios: ['Neiva','Pitalito','Garzón','La Plata','Campoalegre','Rivera','Palermo','San Agustín','Isnos','Acevedo','Aipe','Algeciras','Altamira','Baraya','Colombia','Elías','Gigante','Guadalupe','Hobo','Iquira','Íquira','La Argentina','La Salina (Huila)','Nátaga','Oporapa','Paicol','Palestina','Saladoblanco','Santa María','Suaza','Tarqui','Tello','Teruel','Tesalia','Timana','Villagorgona','Villavieja','Yaguará'] },
    { departamento: 'La Guajira',          municipios: ['Riohacha','Maicao','Uribia','Manaure','San Juan del Cesar','Albania','Barrancas','Dibulla','Distracción','El Molino','Fonseca','Hatonuevo','La Jagua del Pilar','Villanueva','Urumita'] },
    { departamento: 'Magdalena',           municipios: ['Santa Marta','Ciénaga','Fundación','El Banco','Plato','Ariguaní','Zona Bananera','Aracataca','Pivijay','El Piñón','Remolino','Salamina','Concordia','Nueva Granada','Pedraza','San Zenón','Santa Bárbara de Pinto','Sitio Nuevo','Tenerife','Guamal','Zapayán'] },
    { departamento: 'Meta',                municipios: ['Villavicencio','Acacías','Granada','San Martín','Puerto López','Restrepo','Cumaral','El Dorado','El Castillo','Fuente de Oro','La Macarena','La Uribe','Lejanías','Mapiripán','Mesetas','Puerto Concordia','Puerto Gaitán','Puerto Lleras','Puerto Rico','San Carlos de Guaroa','San Juan de Arama','San Juanito','Vista Hermosa','Barranca de Upía'] },
    { departamento: 'Nariño',              municipios: ['Pasto','Ipiales','Tumaco','La Unión','Túquerres','Samaniego','Buesaco','Chachagüí','Consacá','Contadero','Córdoba','Cuaspud','Cumbal','Cumbitara','El Charco','El Peñol','El Rosario','El Tablón de Gómez','El Tambo','Francisco Pizarro','Guachucal','Guaitarilla','Gualmatán','Iles','Imués','La Cruz','La Florida','La Llanada','La Tola','Leiva','Linares','Los Andes','Magüí','Mallama','Mosquera','Nariño','Olaya Herrera','Ospina','Policarpa','Potosí','Providencia','Puerres','Pupiales','Ricaurte','Roberto Payán','Salahonda','San Bernardo','San Lorenzo','San Pablo','San Pedro de Cartago','Santa Bárbara','Santacruz','Sapuyes','Taminango','Tangua'] },
    { departamento: 'Norte de Santander',  municipios: ['Cúcuta','Ocaña','Pamplona','Villa del Rosario','Los Patios','Tibú','Chinácota','Convención','Durania','El Carmen','El Tarra','El Zulia','Gramalote','Hacarí','Herrán','La Esperanza','La Playa','Labateca','Lourdes','Mutiscua','Pamplonita','Puerto Santander','Ragonvalia','Salazar','San Calixto','San Cayetano','Santiago','Sardinata','Silos','Teorama','Toledo','Villacaro'] },
    { departamento: 'Putumayo',            municipios: ['Mocoa','Puerto Asís','Orito','Valle del Guamuez','Sibundoy','Colón','San Francisco','San Miguel','Santiago','Villagarzón','Puerto Guzmán','Puerto Leguízamo','Puerto Caicedo'] },
    { departamento: 'Quindío',             municipios: ['Armenia','Calarcá','Montenegro','Quimbaya','La Tebaida','Circasia','Buenavista','Córdoba','Filandia','Génova','Pijao','Salento'] },
    { departamento: 'Risaralda',           municipios: ['Pereira','Dosquebradas','Santa Rosa de Cabal','La Virginia','Marsella','Apía','Balboa','Belén de Umbría','Guática','La Celia','Mistrató','Pueblo Rico','Quinchía','Santuario'] },
    { departamento: 'San Andrés y Providencia', municipios: ['San Andrés','Providencia'] },
    { departamento: 'Santander',           municipios: ['Bucaramanga','Floridablanca','Girón','Piedecuesta','Barrancabermeja','San Gil','Socorro','Vélez','Barbosa','Lebrija','Málaga','Charalá','Concepción','Contratación','Cuití','El Guacamayo','El Playón','Encino','Galán','Gámbita','Guaca','Guadalupe','Guapotá','Guavatá','Güepsa','Hato','Jesús María','La Belleza','Landázuri','La Paz','Matanza','Mogotes','Molagavita','Ocamonte','Oiba','Onzaga','Palmar','Palmas del Socorro','Páramo','Pinchote','Puente Nacional','Puerto Parra','Puerto Wilches','Rionegro','Sabana de Torres','San Andrés','San Benito','San Joaquín','San José de Miranda','San Miguel','San Vicente de Chucurí','Santa Bárbara (Santander)','Santa Helena del Opón','Simacota','Suaita','Sucre','Suratá','Tona','Valle de San José','Vetas','Villanueva','Zapatoca'] },
    { departamento: 'Sucre',               municipios: ['Sincelejo','Corozal','Sampués','San Marcos','Tolú','San Onofre','Coveñas','Santiago de Tolú','Ovejas','Sincé','El Roble','Galeras','Los Palmitos','Majagual','Morroa','San Benito Abad','San Juan de Betulia','San Luis de Sincé','San Pedro','Sucre','Tolú Viejo'] },
    { departamento: 'Tolima',              municipios: ['Ibagué','Espinal','Melgar','Honda','Líbano','Chaparral','Mariquita','Fresno','Ambalema','Anzoátegui','Armero-Guayabal','Ataco','Cajamarca','Carmen de Apicalá','Casabianca','Coello','Coyaima','Cunday','Dolores','El Guamo','Falan','Flandes','Guamo','Herveo','Icononzo','Lérida','Murillo','Natagaima','Ortega','Palocabildo','Piedras','Planadas','Prado','Purificación','Rio Blanco','Roncesvalles','Rovira','Saldaña','San Antonio','San Luis','Santa Isabel','Suárez','Valle de San Juan','Venadillo','Villahermosa','Villarrica'] },
    { departamento: 'Valle del Cauca',     municipios: ['Cali','Buenaventura','Palmira','Buga','Tuluá','Cartago','Jamundí','Candelaria','Yumbo','Florida','Pradera','Zarzal','La Unión','Roldanillo','Ansermanuevo','Alcalá','Andalucía','Argelia','Bolívar','Bugalagrande','Caicedonia','Calima','Dagua','El Águila','El Cairo','El Cerrito','El Dovio','Ginebra','Guacarí','La Cumbre','La Victoria','Obando','Restrepo','Riofrío','San Pedro','Sevilla','Toro','Trujillo','Ulloa','Versalles','Vijes','Yotoco'] },
    { departamento: 'Vaupés',              municipios: ['Mitú','Carurú','Pacoa','Papunaua','Taraira','Yavaraté'] },
    { departamento: 'Vichada',             municipios: ['Puerto Carreño','Cumaribo','La Primavera','Santa Rosalía'] },
];

// Genera 1 predio por cada municipio de Colombia con nombre, ubicación y área variada
const _PREFIJOS = ['Hacienda', 'Finca', 'Predio', 'Rancho', 'Parcela', 'El Campo de', 'La Granja de', 'Los Llanos de', 'Las Flores de', 'La Esperanza de'];
const _VEREDAS  = ['Vereda El Centro', 'Vereda La Palma', 'Vereda El Carmen', 'Vereda La Esperanza', 'Vereda San José',
                   'Vereda Las Brisas', 'Vereda El Porvenir', 'Vereda La Unión', 'Vereda El Progreso', 'Vereda La Paz'];
// Áreas en hectáreas realistas variadas por tipo de región (se ciclan)
const _AREAS = [15.50, 8.75, 22.00, 5.30, 45.80, 12.00, 30.25, 7.60, 18.40, 50.00,
                3.50,  60.00, 25.75, 9.20, 38.00, 11.50, 14.00, 100.00, 6.80, 28.50];

const _seen = new Set();
let _idx = 0;
const _predioRows = MUNICIPIOS_COLOMBIA.flatMap(({ departamento, municipios }) =>
    municipios.map(municipio => {
        const prefijo  = _PREFIJOS[_idx % _PREFIJOS.length];
        const vereda   = _VEREDAS[_idx % _VEREDAS.length];
        const area     = _AREAS[_idx % _AREAS.length].toFixed(2);
        const base     = _seen.has(municipio) ? `${municipio} (${departamento})` : municipio;
        const nombre   = `${prefijo} ${base}`;
        _seen.add(municipio);
        _idx++;
        const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `(1, '${esc(nombre)}', '${esc(departamento)}', '${esc(municipio)}', '${esc(vereda)}', ${area})`;
    })
);

const INSERT_PREDIOS_MUNICIPIOS = `INSERT IGNORE INTO predios_produccion
     (productor_id, nombre_identificacion, departamento, municipio, vereda_direccion, area_ha)
     VALUES
     ${_predioRows.join(',\n     ')}`;

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
    // Elimina registros semilla anteriores (nombre = ciudad, área = 10, vereda genérica)
    // para poder reemplazarlos con los datos mejorados
    `DELETE FROM predios_produccion
     WHERE productor_id = 1
       AND area_ha = 10.00
       AND vereda_direccion = 'Vereda Principal'`,
    INSERT_PREDIOS_MUNICIPIOS,
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

createConnection();

module.exports = connectionProxy;