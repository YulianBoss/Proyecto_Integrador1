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
        ensureLotesPredioColumn(() => ensureCultivosEspecieColumn(() => ensureSchema()));
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

const ESPECIES_CATALOGO = [
    { id: 1, nombre: 'Tomate', nombre_cientifico: 'Solanum lycopersicum', descripcion: 'Fruto rojo de amplio consumo, sensible a hongos y plagas.' },
    { id: 2, nombre: 'Papa', nombre_cientifico: 'Solanum tuberosum', descripcion: 'Tuberculo andino, cultivo principal en zonas de altura.' },
    { id: 3, nombre: 'Pimenton', nombre_cientifico: 'Capsicum annuum', descripcion: 'Fruto del genero Capsicum, exportacion frecuente.' },
    { id: 4, nombre: 'Cebolla cabezona', nombre_cientifico: 'Allium cepa', descripcion: 'Bulbo de amplio uso culinario y exportacion.' },
    { id: 5, nombre: 'Cebolla larga', nombre_cientifico: 'Allium fistulosum', descripcion: 'Variedad de cebolla de tallo largo, comun en Colombia.' },
    { id: 6, nombre: 'Zanahoria', nombre_cientifico: 'Daucus carota', descripcion: 'Raiz comestible naranja, alto contenido en betacaroteno.' },
    { id: 7, nombre: 'Lechuga', nombre_cientifico: 'Lactuca sativa', descripcion: 'Hortaliza de hoja, produccion intensiva bajo invernadero.' },
    { id: 8, nombre: 'Espinaca', nombre_cientifico: 'Spinacia oleracea', descripcion: 'Planta de hoja verde rica en hierro, ciclo corto.' },
    { id: 9, nombre: 'Repollo', nombre_cientifico: 'Brassica oleracea capitata', descripcion: 'Hortaliza de cabeza compacta, resistente al frio.' },
    { id: 10, nombre: 'Brocoli', nombre_cientifico: 'Brassica oleracea italica', descripcion: 'Vegetal crucifero de alto valor nutricional.' },
    { id: 11, nombre: 'Coliflor', nombre_cientifico: 'Brassica oleracea botrytis', descripcion: 'Vegetal crucifero de cabeza blanca compacta.' },
    { id: 12, nombre: 'Acelga', nombre_cientifico: 'Beta vulgaris var. cicla', descripcion: 'Planta de hojas grandes, tolerante a temperaturas variadas.' },
    { id: 13, nombre: 'Apio', nombre_cientifico: 'Apium graveolens', descripcion: 'Planta aromatica de tallo firme, uso culinario y medicinal.' },
    { id: 14, nombre: 'Rabano', nombre_cientifico: 'Raphanus sativus', descripcion: 'Raiz de ciclo muy corto, cultivo rapido.' },
    { id: 15, nombre: 'Habichuela', nombre_cientifico: 'Phaseolus vulgaris', descripcion: 'Leguminosa de vaina verde, produccion en climas medios.' },
    { id: 16, nombre: 'Pepino cohombro', nombre_cientifico: 'Cucumis sativus', descripcion: 'Fruto alargado de alta demanda en mercados frescos.' },
    { id: 17, nombre: 'Calabaza', nombre_cientifico: 'Cucurbita maxima', descripcion: 'Fruto grande, pulpa naranja, versatil en gastronomia.' },
    { id: 18, nombre: 'Ahuyama', nombre_cientifico: 'Cucurbita moschata', descripcion: 'Variedad de zapallo muy comun en Colombia.' },
    { id: 19, nombre: 'Berenjena', nombre_cientifico: 'Solanum melongena', descripcion: 'Fruto de piel morada, muy usada en cocina mediterranea.' },
    { id: 20, nombre: 'Arveja', nombre_cientifico: 'Pisum sativum', descripcion: 'Leguminosa de vaina, rica en proteinas vegetales.' },
    { id: 21, nombre: 'Maiz', nombre_cientifico: 'Zea mays', descripcion: 'Cereal base de la alimentacion latinoamericana.' },
    { id: 22, nombre: 'Frijol', nombre_cientifico: 'Phaseolus vulgaris', descripcion: 'Leguminosa de grano, cultivo tradicional colombiano.' },
    { id: 23, nombre: 'Lenteja', nombre_cientifico: 'Lens culinaris', descripcion: 'Leguminosa de grano pequeno, alto valor proteico.' },
    { id: 24, nombre: 'Garbanzo', nombre_cientifico: 'Cicer arietinum', descripcion: 'Leguminosa de grano redondo, uso culinario amplio.' },
    { id: 25, nombre: 'Sorgo', nombre_cientifico: 'Sorghum bicolor', descripcion: 'Cereal resistente a sequia, uso forrajero y alimentario.' },
    { id: 26, nombre: 'Trigo', nombre_cientifico: 'Triticum aestivum', descripcion: 'Cereal base para harinas, cultivos en zonas frias.' },
    { id: 27, nombre: 'Arroz', nombre_cientifico: 'Oryza sativa', descripcion: 'Cereal de mayor produccion mundial, requiere humedad.' },
    { id: 28, nombre: 'Avena', nombre_cientifico: 'Avena sativa', descripcion: 'Cereal de clima frio, alto contenido en fibra.' },
    { id: 29, nombre: 'Cebada', nombre_cientifico: 'Hordeum vulgare', descripcion: 'Cereal usado en alimentacion animal e industria cervecera.' },
    { id: 30, nombre: 'Banano', nombre_cientifico: 'Musa acuminata', descripcion: 'Fruta tropical de exportacion masiva desde Colombia.' },
    { id: 31, nombre: 'Platano', nombre_cientifico: 'Musa paradisiaca', descripcion: 'Fruta basica en la dieta colombiana, varios climas.' },
    { id: 32, nombre: 'Mango', nombre_cientifico: 'Mangifera indica', descripcion: 'Fruta tropical dulce, alta demanda internacional.' },
    { id: 33, nombre: 'Papaya', nombre_cientifico: 'Carica papaya', descripcion: 'Fruta tropical de ciclo corto, exportacion frecuente.' },
    { id: 34, nombre: 'Pina', nombre_cientifico: 'Ananas comosus', descripcion: 'Fruta tropical de exportacion, requiere clima calido.' },
    { id: 35, nombre: 'Maracuya', nombre_cientifico: 'Passiflora edulis', descripcion: 'Fruta tropical acida, gran demanda en jugos y exportacion.' },
    { id: 36, nombre: 'Lulo', nombre_cientifico: 'Solanum quitoense', descripcion: 'Fruta andina exclusiva de Colombia y Ecuador.' },
    { id: 37, nombre: 'Feijoa', nombre_cientifico: 'Acca sellowiana', descripcion: 'Fruta aromatica de clima frio moderado.' },
    { id: 38, nombre: 'Guanabana', nombre_cientifico: 'Annona muricata', descripcion: 'Fruta tropical de pulpa blanca y sabor acido-dulce.' },
    { id: 39, nombre: 'Curuba', nombre_cientifico: 'Passiflora tarminiana', descripcion: 'Fruta andina colombiana, uso en jugos y reposteria.' },
    { id: 40, nombre: 'Tomate de arbol', nombre_cientifico: 'Solanum betaceum', descripcion: 'Fruta andina de piel roja o amarilla, uso en jugos.' },
    { id: 41, nombre: 'Aguacate', nombre_cientifico: 'Persea americana', descripcion: 'Fruta de alto valor graso, exportacion en crecimiento.' },
    { id: 42, nombre: 'Limon Tahiti', nombre_cientifico: 'Citrus latifolia', descripcion: 'Citrico de alta demanda internacional, clima calido.' },
    { id: 43, nombre: 'Naranja', nombre_cientifico: 'Citrus sinensis', descripcion: 'Citrico de mayor consumo mundial.' },
    { id: 44, nombre: 'Mandarina', nombre_cientifico: 'Citrus reticulata', descripcion: 'Citrico de facil pelado, alta demanda en mercados frescos.' },
    { id: 45, nombre: 'Fresa', nombre_cientifico: 'Fragaria x ananassa', descripcion: 'Fruta de clima frio, produccion bajo invernadero en Colombia.' },
    { id: 46, nombre: 'Mora', nombre_cientifico: 'Rubus glaucus', descripcion: 'Fruta andina colombiana, exportacion en crecimiento.' },
    { id: 47, nombre: 'Uva', nombre_cientifico: 'Vitis vinifera', descripcion: 'Fruta de vid, produccion limitada en zonas calidas de Colombia.' },
    { id: 48, nombre: 'Melon', nombre_cientifico: 'Cucumis melo', descripcion: 'Fruta de clima calido, exportacion a mercados europeos.' },
    { id: 49, nombre: 'Sandia', nombre_cientifico: 'Citrullus lanatus', descripcion: 'Fruta de gran tamano, clima calido, alta demanda en verano.' },
    { id: 50, nombre: 'Clavel', nombre_cientifico: 'Dianthus caryophyllus', descripcion: 'Flor de exportacion principal de Colombia.' },
    { id: 51, nombre: 'Rosa', nombre_cientifico: 'Rosa hybrida', descripcion: 'Flor de mayor exportacion colombiana, diversas variedades.' },
    { id: 52, nombre: 'Crisantemo', nombre_cientifico: 'Chrysanthemum morifolium', descripcion: 'Flor de exportacion de alto volumen.' },
    { id: 53, nombre: 'Lirio', nombre_cientifico: 'Lilium sp.', descripcion: 'Flor ornamental de exportacion, requiere clima frio.' },
    { id: 54, nombre: 'Alstroemeria', nombre_cientifico: 'Alstroemeria sp.', descripcion: 'Flor de larga vida util, exportacion frecuente.' },
    { id: 55, nombre: 'Cafe', nombre_cientifico: 'Coffea arabica', descripcion: 'Principal producto de exportacion historica de Colombia.' },
    { id: 56, nombre: 'Cacao', nombre_cientifico: 'Theobroma cacao', descripcion: 'Materia prima del chocolate, exportacion en crecimiento.' },
    { id: 57, nombre: 'Cana de azucar', nombre_cientifico: 'Saccharum officinarum', descripcion: 'Cultivo industrial, produccion de azucar y etanol.' },
    { id: 58, nombre: 'Palma africana', nombre_cientifico: 'Elaeis guineensis', descripcion: 'Cultivo de aceite vegetal, extensas plantaciones en Colombia.' },
    { id: 59, nombre: 'Yuca', nombre_cientifico: 'Manihot esculenta', descripcion: 'Tuberculo resistente, uso alimentario e industrial.' },
    { id: 60, nombre: 'Name', nombre_cientifico: 'Dioscorea alata', descripcion: 'Tuberculo tropical, consumo local y exportacion.' },
    { id: 61, nombre: 'Platano topocho', nombre_cientifico: 'Musa balbisiana', descripcion: 'Variedad de platano resistente a sequia.' },
    { id: 62, nombre: 'Ajonjoli', nombre_cientifico: 'Sesamum indicum', descripcion: 'Semilla oleaginosa, exportacion en aumento.' },
    { id: 63, nombre: 'Girasol', nombre_cientifico: 'Helianthus annuus', descripcion: 'Planta oleaginosa, produccion de aceite y ornamental.' },
    { id: 64, nombre: 'Soya', nombre_cientifico: 'Glycine max', descripcion: 'Leguminosa oleaginosa de alta demanda industrial.' },
    { id: 65, nombre: 'Algodon', nombre_cientifico: 'Gossypium hirsutum', descripcion: 'Fibra natural de importancia industrial.' },
    { id: 66, nombre: 'Tabaco', nombre_cientifico: 'Nicotiana tabacum', descripcion: 'Cultivo comercial regulado, exportacion limitada.' },
    { id: 67, nombre: 'Ajo', nombre_cientifico: 'Allium sativum', descripcion: 'Bulbo aromatico de uso culinario y medicinal.' },
    { id: 68, nombre: 'Jengibre', nombre_cientifico: 'Zingiber officinale', descripcion: 'Raiz aromatica medicinal, exportacion en crecimiento.' },
    { id: 69, nombre: 'Curcuma', nombre_cientifico: 'Curcuma longa', descripcion: 'Especia de raiz amarilla, alto valor medicinal.' },
    { id: 70, nombre: 'Hierbabuena', nombre_cientifico: 'Mentha spicata', descripcion: 'Planta aromatica de uso culinario y medicinal.' },
    { id: 71, nombre: 'Cilantro', nombre_cientifico: 'Coriandrum sativum', descripcion: 'Hierba aromatica de ciclo corto, alta rotacion.' },
    { id: 72, nombre: 'Perejil', nombre_cientifico: 'Petroselinum crispum', descripcion: 'Hierba aromatica de uso culinario frecuente.' },
    { id: 73, nombre: 'Albahaca', nombre_cientifico: 'Ocimum basilicum', descripcion: 'Planta aromatica de exportacion y uso culinario.' },
];

const INSERT_ESPECIES_CATALOGO = `INSERT IGNORE INTO especies
     (id, nombre, nombre_cientifico, descripcion, estado)
     VALUES
     ${ESPECIES_CATALOGO.map((especie) => {
         const esc = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
         return `(${especie.id}, '${esc(especie.nombre)}', '${esc(especie.nombre_cientifico)}', '${esc(especie.descripcion)}', 'activo')`;
     }).join(',\n     ')}`;

const schemaStatements = [
    `ALTER TABLE lugares_produccion
     MODIFY COLUMN estado VARCHAR(40) NOT NULL DEFAULT 'activo'`,
    `UPDATE lugares_produccion
     SET estado = 'activo'
     WHERE estado IN ('pendiente_validacion', 'rechazado')`,
    `CREATE TABLE IF NOT EXISTS especies (
        id INT PRIMARY KEY,
        nombre VARCHAR(180) NOT NULL,
        nombre_cientifico VARCHAR(220) NOT NULL,
        descripcion TEXT NULL,
        estado VARCHAR(40) NOT NULL DEFAULT 'activo',
        UNIQUE KEY uq_especies_nombre (nombre),
        UNIQUE KEY uq_especies_nombre_cientifico (nombre_cientifico)
    )`,
    INSERT_ESPECIES_CATALOGO,
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
    `CREATE TABLE IF NOT EXISTS historial_estado_lote (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lote_id INT NOT NULL,
        estado_anterior VARCHAR(40) NULL,
        estado_nuevo VARCHAR(40) NOT NULL,
        fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        observacion TEXT NULL,
        INDEX idx_historial_lote_id (lote_id)
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

const ensureCultivosEspecieColumn = (done) => {
    connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'cultivos'
           AND COLUMN_NAME = 'especie_id'`,
        (err, rows) => {
            if (err) {
                console.error('❌ Error validando columna especie_id en cultivos:', err.message);
                done();
                return;
            }

            const exists = Number(rows?.[0]?.total || 0) > 0;
            if (exists) {
                done();
                return;
            }

            connection.query(
                `ALTER TABLE cultivos
                 ADD COLUMN especie_id INT NULL AFTER lote_id`,
                (alterErr) => {
                    if (alterErr) {
                        console.error('❌ Error agregando columna especie_id en cultivos:', alterErr.message);
                    }
                    done();
                }
            );
        }
    );
};

createConnection();

module.exports = connectionProxy;