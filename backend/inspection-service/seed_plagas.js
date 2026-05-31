const mysql = require('mysql2');
require('dotenv').config({ path: '../../.env' }); // Apuntar al .env de la raíz

const connection = mysql.createConnection({
    host:     process.env.INSP_DB_HOST || process.env.DB_HOST,
    user:     process.env.INSP_DB_USER || process.env.DB_USER,
    password: process.env.INSP_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.INSP_DB_NAME || process.env.DB_NAME,
    port:     process.env.INSP_DB_PORT || process.env.DB_PORT,
});

const plagas = [
    {
        nombre_comun: 'Polilla del tomate',
        nombre_cientifico: 'Tuta absoluta',
        descripcion: 'Microlepidóptero que ataca agresivamente las hojas y frutos del tomate, formando minas.',
        nivel_riesgo: 'alto',
        especie_id: 1, // primary host
        especies_afectadas: [1, 2, 3, 4, 5]
    },
    {
        nombre_comun: 'Gusano Cogollero',
        nombre_cientifico: 'Spodoptera frugiperda',
        descripcion: 'Plaga polífaga y devoradora, principal amenaza de cultivos como el maíz.',
        nivel_riesgo: 'alto',
        especie_id: 2,
        especies_afectadas: [2, 5, 6, 7, 8]
    },
    {
        nombre_comun: 'Pulgón del algodón',
        nombre_cientifico: 'Aphis gossypii',
        descripcion: 'Insecto chupador que debilita la planta y es vector de diversos virus agrícolas.',
        nivel_riesgo: 'medio',
        especie_id: 3,
        especies_afectadas: [3, 9, 10, 11, 12]
    },
    {
        nombre_comun: 'Arañita roja',
        nombre_cientifico: 'Tetranychus urticae',
        descripcion: 'Ácaro que produce decoloración y desecamiento en hojas bajo condiciones cálidas.',
        nivel_riesgo: 'medio',
        especie_id: 1,
        especies_afectadas: [1, 13, 14, 15, 16]
    },
    {
        nombre_comun: 'Minador de las hojas',
        nombre_cientifico: 'Liriomyza spp.',
        descripcion: 'La larva crea galerías en las hojas, reduciendo drásticamente la capacidad fotosintética.',
        nivel_riesgo: 'bajo',
        especie_id: 4,
        especies_afectadas: [4, 17, 18, 19, 20]
    },
    {
        nombre_comun: 'Picudo del ají',
        nombre_cientifico: 'Anthonomus eugenii',
        descripcion: 'Coleóptero que destruye los botones florales y los frutos en formación.',
        nivel_riesgo: 'alto',
        especie_id: 5,
        especies_afectadas: [5, 21, 22, 23, 24]
    },
    {
        nombre_comun: 'Mosca de la fruta',
        nombre_cientifico: 'Ceratitis capitata',
        descripcion: 'Causa la pudrición temprana de los frutos por el desarrollo de larvas en su interior.',
        nivel_riesgo: 'alto',
        especie_id: 10,
        especies_afectadas: [10, 25, 26, 27, 28]
    },
    {
        nombre_comun: 'Barrenador del tallo',
        nombre_cientifico: 'Diatraea saccharalis',
        descripcion: 'Las larvas perforan los tallos provocando quiebres y muerte de la planta joven.',
        nivel_riesgo: 'alto',
        especie_id: 2,
        especies_afectadas: [2, 29, 30, 31, 32]
    },
    {
        nombre_comun: 'Gorgojo del maíz',
        nombre_cientifico: 'Sitophilus zeamais',
        descripcion: 'Plaga severa en la etapa de almacenamiento y maduración del grano.',
        nivel_riesgo: 'medio',
        especie_id: 2,
        especies_afectadas: [2, 33, 34, 35, 36]
    },
    {
        nombre_comun: 'Babosa gris',
        nombre_cientifico: 'Deroceras reticulatum',
        descripcion: 'Molusco terrestre que devora plántulas enteras durante la noche o en alta humedad.',
        nivel_riesgo: 'bajo',
        especie_id: 3,
        especies_afectadas: [3, 37, 38, 39, 40]
    },
    {
        nombre_comun: 'Roya del café',
        nombre_cientifico: 'Hemileia vastatrix',
        descripcion: 'Enfermedad fúngica que afecta a las hojas del cafeto, reduciendo la fotosíntesis.',
        nivel_riesgo: 'alto',
        especie_id: 55,
        especies_afectadas: [55, 1, 2, 3, 4]
    },
    {
        nombre_comun: 'Mildiu del repollo',
        nombre_cientifico: 'Peronospora brassicae',
        descripcion: 'Causante de manchas amarillas y caída prematura de hojas en cultivos de crucíferas.',
        nivel_riesgo: 'medio',
        especie_id: 9,
        especies_afectadas: [9, 11, 13, 15, 17]
    },
    {
        nombre_comun: 'Brote bacteriano del arroz',
        nombre_cientifico: 'Xanthomonas oryzae',
        descripcion: 'Bacteria que causa manchas amarillas y necrosis en hojas y tallos de arroz.',
        nivel_riesgo: 'alto',
        especie_id: 21,
        especies_afectadas: [21, 22, 23, 24, 25]
    },
    {
        nombre_comun: 'Mosaico del plátano',
        nombre_cientifico: 'Banana streak virus',
        descripcion: 'Virus que genera manchas cloróticas y retardo en crecimiento del banano.',
        nivel_riesgo: 'medio',
        especie_id: 30,
        especies_afectadas: [30, 31, 32, 33, 34]
    },
    {
        nombre_comun: 'Quemadura de la papa',
        nombre_cientifico: 'Phytophthora infestans',
        descripcion: 'Oomiceto que produce lesiones acuosas y marchitez en hojas y tubérculos.',
        nivel_riesgo: 'alto',
        especie_id: 2,
        especies_afectadas: [2, 5, 6, 7, 8]
    },
    {
        nombre_comun: 'Tuna del cacao',
        nombre_cientifico: 'Moniliophthora roreri',
        descripcion: 'Hongo que afecta la mazorca del cacao provocando podredumbre y pérdida de granos.',
        nivel_riesgo: 'alto',
        especie_id: 55,
        especies_afectadas: [55, 1, 12, 13, 14]
    },
    {
        nombre_comun: 'Antracnosis del tomate',
        nombre_cientifico: 'Colletotrichum gloeosporioides',
        descripcion: 'Hongo que produce manchas necróticas en frutos y hojas de tomate.',
        nivel_riesgo: 'medio',
        especie_id: 1,
        especies_afectadas: [1, 2, 3, 9, 15]
    }
];

connection.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos de Inspecciones:', err);
        process.exit(1);
    }
    console.log('✅ Conexión exitosa a la DB. Iniciando registro de plagas...\n');

// Helper to create relations between a plaga and its affected crops
const handleRelations = (plagaId, especiesAfectadas) => {
    const sqlRel = `
        INSERT IGNORE INTO plaga_cultivos (plaga_id, cultivo_id, cultivo_nombre)
        VALUES (?, ?, ?)
    `;
    especiesAfectadas.forEach((especieId) => {
        connection.query(sqlRel, [plagaId, especieId, `Cultivo #${especieId}`]);
    });
};

    let insertadas = 0;
    let errores = 0;

    plagas.forEach((plaga, index) => {
        const sql = `
            INSERT IGNORE INTO plagas 
            (nombre_comun, nombre_cientifico, descripcion, nivel_riesgo, especie_id, estado, fecha_registro) 
            VALUES (?, ?, ?, ?, ?, 'activo', NOW())
        `;
        const params = [
            plaga.nombre_comun,
            plaga.nombre_cientifico,
            plaga.descripcion,
            plaga.nivel_riesgo,
            plaga.especie_id
        ];

        connection.query(sql, params, (err, results) => {
            if (err) {
                console.error(`❌ Error insertando ${plaga.nombre_comun}:`, err.message);
                errores++;
            } else if (results.affectedRows === 0) {
                // Ya existía la plaga, obtener su id
                connection.query(`SELECT id FROM plagas WHERE nombre_comun = ? LIMIT 1`, [plaga.nombre_comun], (selErr, selRows) => {
                    if (selErr) {
                        console.error(`❌ Error obteniendo id de ${plaga.nombre_comun}:`, selErr.message);
                        errores++;
                    } else {
                        const existingId = selRows[0].id;
                        console.log(`⚠️  Plaga existente: ${plaga.nombre_comun} (id=${existingId}) – añadiendo relaciones.`);
                        handleRelations(existingId, plaga.especies_afectadas);
                    }
                });
            } else {
                console.log(`✅ Registrada: ${plaga.nombre_comun} (${plaga.nombre_cientifico}) - Riesgo: ${plaga.nivel_riesgo}`);
                const plagaId = results.insertId;
                handleRelations(plagaId, plaga.especies_afectadas);
                insertadas++;
            }

            if (index === plagas.length - 1) {
                setTimeout(() => {
                    console.log(`\n🎉 Proceso finalizado: ${insertadas} nuevas plagas registradas, ${errores} errores.`);
                    connection.end();
                    process.exit(0);
                }, 1000);
            }
        });
    });
});
