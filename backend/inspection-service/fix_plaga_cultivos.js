const mysql = require('mysql2');
require('dotenv').config({ path: '../../.env' });

// Conexión a inspection-service (donde viven plagas y plaga_cultivos)
const inspConn = mysql.createConnection({
    host:     process.env.INSP_DB_HOST,
    user:     process.env.INSP_DB_USER,
    password: process.env.INSP_DB_PASSWORD,
    database: process.env.INSP_DB_NAME,
    port:     process.env.INSP_DB_PORT,
});

// Mapa de IDs REALES de especies (obtenidos directamente de la DB de producción):
// 1=Tomate, 2=Papa, 3=Pimenton, 4=Cebolla cabezona, 5=Cebolla larga,
// 6=Zanahoria, 7=Lechuga, 8=Espinaca, 9=Repollo, 10=Brocoli,
// 11=Coliflor, 12=Acelga, 13=Apio, 14=Rabano, 15=Habichuela,
// 16=Pepino cohombro, 17=Calabaza, 18=Ahuyama, 19=Berenjena, 20=Arveja,
// 21=Maiz, 22=Frijol, 23=Lenteja, 24=Garbanzo, 25=Sorgo,
// 26=Trigo, 27=Arroz, 28=Avena, 29=Cebada, 30=Banano,
// 31=Platano, 32=Mango, 33=Papaya, 34=Pina, 35=Maracuya,
// 36=Lulo, 37=Feijoa, 38=Guanabana, 39=Curuba, 40=Tomate de arbol,
// 41=Aguacate, 42=Limon Tahiti, 43=Naranja, 44=Mandarina, 45=Fresa,
// 46=Mora, 47=Uva, 48=Melon, 49=Sandia, 50=Clavel,
// 51=Rosa, 52=Crisantemo, 53=Lirio, 54=Alstroemeria, 55=Cafe,
// 56=Cacao, 57=Cana de azucar, 58=Palma africana, 59=Yuca, 60=Name,
// 61=Platano topocho, 62=Ajonjoli, 63=Girasol, 64=Soya, 65=Algodon,
// 66=Tabaco, 67=Ajo, 68=Jengibre, 69=Curcuma, 70=Hierbabuena,
// 71=Cilantro, 72=Perejil, 73=Albahaca

const especiesMap = {
    1:  'Tomate',        2:  'Papa',             3:  'Pimenton',
    4:  'Cebolla cabezona', 5: 'Cebolla larga',  6:  'Zanahoria',
    7:  'Lechuga',       8:  'Espinaca',          9:  'Repollo',
    10: 'Brocoli',       11: 'Coliflor',          12: 'Acelga',
    13: 'Apio',          14: 'Rabano',             15: 'Habichuela',
    16: 'Pepino cohombro',17:'Calabaza',           18: 'Ahuyama',
    19: 'Berenjena',     20: 'Arveja',             21: 'Maiz',
    22: 'Frijol',        23: 'Lenteja',            24: 'Garbanzo',
    25: 'Sorgo',         26: 'Trigo',              27: 'Arroz',
    28: 'Avena',         29: 'Cebada',             30: 'Banano',
    31: 'Platano',       32: 'Mango',              33: 'Papaya',
    34: 'Pina',          35: 'Maracuya',           36: 'Lulo',
    37: 'Feijoa',        38: 'Guanabana',          39: 'Curuba',
    40: 'Tomate de arbol',41:'Aguacate',           42: 'Limon Tahiti',
    43: 'Naranja',       44: 'Mandarina',          45: 'Fresa',
    46: 'Mora',          47: 'Uva',                48: 'Melon',
    49: 'Sandia',        50: 'Clavel',             51: 'Rosa',
    52: 'Crisantemo',    53: 'Lirio',              54: 'Alstroemeria',
    55: 'Cafe',          56: 'Cacao',              57: 'Cana de azucar',
    58: 'Palma africana',59: 'Yuca',               60: 'Name',
    61: 'Platano topocho',62:'Ajonjoli',           63: 'Girasol',
    64: 'Soya',          65: 'Algodon',            66: 'Tabaco',
    67: 'Ajo',           68: 'Jengibre',           69: 'Curcuma',
    70: 'Hierbabuena',   71: 'Cilantro',           72: 'Perejil',
    73: 'Albahaca'
};

// Asociaciones plaga -> cultivos reales
// Cada nombre de plaga mapea a los IDs de especies reales que afecta
const plagaRelaciones = [
    {
        nombre_comun: 'Polilla del tomate',
        cultivos: [1,2,3,16,19,40] // Tomate, Papa, Pimenton, Pepino, Berenjena, Tomate de arbol
    },
    {
        nombre_comun: 'Gusano Cogollero',
        cultivos: [21,27,25,26,22,57,63,64] // Maiz, Arroz, Sorgo, Trigo, Frijol, Cana, Girasol, Soya
    },
    {
        nombre_comun: 'Pulgon del algodon',
        cultivos: [65,62,1,3,45,27,9] // Algodon, Ajonjoli, Tomate, Pimenton, Fresa, Arroz, Repollo
    },
    {
        nombre_comun: 'Pulgón del algodón',
        cultivos: [65,62,1,3,45,27,9]
    },
    {
        nombre_comun: 'Aranita roja',
        cultivos: [1,3,45,16,32,33,35,47,51] // Tomate, Pimenton, Fresa, Pepino, Mango, Papaya, Maracuya, Uva, Rosa
    },
    {
        nombre_comun: 'Arañita roja',
        cultivos: [1,3,45,16,32,33,35,47,51]
    },
    {
        nombre_comun: 'Minador de las hojas',
        cultivos: [1,7,8,9,13,71,72,73,12] // Tomate, Lechuga, Espinaca, Repollo, Apio, Cilantro, Perejil, Albahaca, Acelga
    },
    {
        nombre_comun: 'Picudo del aji',
        cultivos: [3,1,16,19,67,4,5] // Pimenton, Tomate, Pepino, Berenjena, Ajo, Cebolla
    },
    {
        nombre_comun: 'Picudo del ají',
        cultivos: [3,1,16,19,67,4,5]
    },
    {
        nombre_comun: 'Mosca de la fruta',
        cultivos: [32,33,34,35,36,37,38,39,40,41,42,43,44] // Frutas tropicales y citricos
    },
    {
        nombre_comun: 'Barrenador del tallo',
        cultivos: [21,57,27,25,30,31,61,29] // Maiz, Cana, Arroz, Sorgo, Banano, Platano, Platano topocho, Cebada
    },
    {
        nombre_comun: 'Gorgojo del maiz',
        cultivos: [21,22,23,24,25,26,27,28,29] // Granos: Maiz, Frijol, Lenteja, Garbanzo, Sorgo, Trigo, Arroz, Avena, Cebada
    },
    {
        nombre_comun: 'Gorgojo del maíz',
        cultivos: [21,22,23,24,25,26,27,28,29]
    },
    {
        nombre_comun: 'Babosa gris',
        cultivos: [7,8,9,10,11,12,1,45,71] // Lechuga, Espinaca, Repollo, Brocoli, Coliflor, Acelga, Tomate, Fresa, Cilantro
    },
    {
        nombre_comun: 'Roya del cafe',
        cultivos: [55,56,66,63,68] // Cafe, Cacao, Tabaco, Girasol, Jengibre
    },
    {
        nombre_comun: 'Roya del café',
        cultivos: [55,56,66,63,68]
    },
    {
        nombre_comun: 'Mildiu del repollo',
        cultivos: [9,10,11,7,8,14,6,12] // Repollo, Brocoli, Coliflor, Lechuga, Espinaca, Rabano, Zanahoria, Acelga
    },
    {
        nombre_comun: 'Brote bacteriano del arroz',
        cultivos: [27,21,25,26,28,29,22] // Arroz, Maiz, Sorgo, Trigo, Avena, Cebada, Frijol
    },
    {
        nombre_comun: 'Mosaico del platano',
        cultivos: [30,31,61,33,34] // Banano, Platano, Platano topocho, Papaya, Pina
    },
    {
        nombre_comun: 'Mosaico del plátano',
        cultivos: [30,31,61,33,34]
    },
    {
        nombre_comun: 'Quemadura de la papa',
        cultivos: [2,1,3,16,19,40,59] // Papa, Tomate, Pimenton, Pepino, Berenjena, Tomate de arbol, Yuca
    },
    {
        nombre_comun: 'Tuna del cacao',
        cultivos: [56,55,66,58,64] // Cacao, Cafe, Tabaco, Palma africana, Soya
    },
    {
        nombre_comun: 'Antracnosis del tomate',
        cultivos: [1,2,3,16,19,32,33,36,45] // Tomate, Papa, Pimenton, Pepino, Berenjena, Mango, Papaya, Lulo, Fresa
    },
    {
        nombre_comun: 'Trips',
        cultivos: [3,1,16,45,50,51,52,53,54] // Pimenton, Tomate, Pepino, Fresa, Clavel, Rosa, Crisantemo, Lirio, Alstroemeria
    },
    {
        nombre_comun: 'Mosca blanca',
        cultivos: [1,3,2,7,9,16,19,45,65] // Tomate, Pimenton, Papa, Lechuga, Repollo, Pepino, Berenjena, Fresa, Algodon
    },
    {
        nombre_comun: 'Antracnosis',
        cultivos: [1,3,32,33,36,45,46,56,40] // Tomate, Pimenton, Mango, Papaya, Lulo, Fresa, Mora, Cacao, Tomate de arbol
    },
    {
        nombre_comun: 'Helicobacter pylori',
        cultivos: [71,72,73,70,68,69,67,4,5] // Cilantro, Perejil, Albahaca, Hierbabuena, Jengibre, Curcuma, Ajo, Cebollas
    },
    {
        nombre_comun: 'Gusano cachon',
        cultivos: [1,3,16,19,40,2,33,18,17] // Tomate, Pimenton, Pepino, Berenjena, Tomate de arbol, Papa, Papaya, Ahuyama, Calabaza
    },
    {
        nombre_comun: 'Gusano cachón',
        cultivos: [1,3,16,19,40,2,33,18,17]
    },
];

inspConn.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a DB inspection:', err);
        process.exit(1);
    }
    console.log('✅ Conectado. Iniciando corrección de plaga_cultivos...\n');

    // Obtener todas las plagas
    inspConn.query('SELECT id, nombre_comun FROM plagas', (err, plagas) => {
        if (err) { console.error(err); process.exit(1); }

        console.log(`📋 Total de plagas en DB: ${plagas.length}\n`);

        let pendientes = plagas.length;
        let corregidas = 0;

        plagas.forEach((plaga) => {
            // Buscar qué cultivos reales deben asociarse a esta plaga
            const rel = plagaRelaciones.find(r =>
                r.nombre_comun.toLowerCase().trim() === plaga.nombre_comun.toLowerCase().trim()
            );

            if (!rel) {
                console.log(`⚠️  Sin mapeo definido para: "${plaga.nombre_comun}" (id=${plaga.id}) — se omite.`);
                pendientes--;
                if (pendientes === 0) finalizar(corregidas);
                return;
            }

            // 1. Borrar relaciones antiguas (que pueden tener IDs incorrectos)
            inspConn.query('DELETE FROM plaga_cultivos WHERE plaga_id = ?', [plaga.id], (delErr) => {
                if (delErr) {
                    console.error(`❌ Error borrando relaciones de "${plaga.nombre_comun}":`, delErr.message);
                    pendientes--;
                    if (pendientes === 0) finalizar(corregidas);
                    return;
                }

                // 2. Insertar las relaciones correctas
                const values = rel.cultivos.map(cid => [plaga.id, cid, especiesMap[cid] || `Cultivo #${cid}`]);
                const sql = 'INSERT INTO plaga_cultivos (plaga_id, cultivo_id, cultivo_nombre) VALUES ?';

                inspConn.query(sql, [values], (insErr) => {
                    if (insErr) {
                        console.error(`❌ Error insertando relaciones de "${plaga.nombre_comun}":`, insErr.message);
                    } else {
                        const nombres = rel.cultivos.map(id => especiesMap[id]).join(', ');
                        console.log(`✅ "${plaga.nombre_comun}" → ${rel.cultivos.length} cultivos: ${nombres}`);
                        corregidas++;
                    }
                    pendientes--;
                    if (pendientes === 0) finalizar(corregidas);
                });
            });
        });
    });
});

function finalizar(corregidas) {
    inspConn.query(
        'SELECT p.nombre_comun, COUNT(pc.cultivo_id) as cnt FROM plagas p LEFT JOIN plaga_cultivos pc ON p.id=pc.plaga_id GROUP BY p.id ORDER BY p.id',
        (err, rows) => {
            console.log('\n══════════════════════════════════════════');
            console.log('RESUMEN FINAL — Cultivos por plaga:');
            console.log('══════════════════════════════════════════');
            if (!err) rows.forEach(r => console.log(`  ${r.nombre_comun}: ${r.cnt} cultivos`));
            console.log(`\n🎉 Corrección finalizada. ${corregidas} plagas actualizadas.`);
            inspConn.end();
            process.exit(0);
        }
    );
}
