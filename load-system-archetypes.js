// Script para cargar los arquetipos predefinidos del sistema
// Ejecutar con: node load-system-archetypes.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYSTEM_ARCHETYPES = [
  // GRUPO 1: LA MÁSCARA DE LA VÍCTIMA Y EL DRAMA
  {
    name: 'La Llorona',
    category: 'VICTIMA_DRAMA',
    maneraSerTag: 'VÍCTIMA',
    maneraSerLabel: 'Víctima / Sufrimiento Eterno',
    scriptFeedback: 'Vives lamentándote por lo que fue y ya no es. Tu conversación interna es un llanto eterno que drena la energía de tu entorno. Buscas quién te tenga lástima en lugar de quién te respete. Tu dolor es tu trofeo.',
    description: 'Mujer espectral con vestido blanco sucio, velo largo cubriendo media cara y lágrimas negras marcadas en las mejillas.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/la-llorona.png'
  },
  {
    name: 'Tristeza (Disney)',
    category: 'VICTIMA_DRAMA',
    maneraSerTag: 'VÍCTIMA',
    maneraSerLabel: 'Víctima / Parálisis Emocional',
    scriptFeedback: 'Te tiras al piso para que alguien más te levante. Usas tu estado emocional bajo como un mecanismo para no hacerte cargo. Te paralizas, caminas lento y esperas que el mundo se detenga a consolarte antes de avanzar.',
    description: 'Personaje azul, suéter de lana grande, lentes redondos, mirando hacia abajo, arrastrando los pies.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/tristeza.png'
  },
  {
    name: 'Chabelita',
    category: 'VICTIMA_DRAMA',
    maneraSerTag: 'VÍCTIMA / QUEJA',
    maneraSerLabel: 'Víctima / Queja Disfrazada',
    scriptFeedback: 'Disfrazas tu juicio de "pecado" y confesión. Te quejas de todo pidiendo perdón, pero en el fondo no te haces responsable. Tu "ay padre, ay padre" es una excusa para seguir fallando sin consecuencias reales.',
    description: 'Mujer con un pañuelo en la mano, un rosario y cara de angustia exagerada, como confesándose.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/chabelita.png'
  },
  {
    name: 'Bruja del 71',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'SOLEDAD',
    maneraSerLabel: 'Soledad / Mendigando Amor',
    scriptFeedback: 'Vives esperando y mendigando atención de quien no te la da (tu "Don Ramón"). Tu soledad te ha vuelto obsesiva. Te conformas con migajas de afecto y te has olvidado de tu propia valía por perseguir imposibles.',
    description: 'Vestido azul cielo anticuado, un tocado de plumas (fascinator) en la cabeza, postura de manos juntas esperando.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/bruja-del-71.png'
  },
  {
    name: 'Elsa de Frozen',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'SOLEDAD',
    maneraSerLabel: 'Soledad / Aislamiento',
    scriptFeedback: 'Te encierras en tu castillo de hielo. Dices que "el frío es parte de ti" para justificar tu aislamiento. Crees que eres peligrosa o incomprendida, así que congelas tus relaciones antes de que te lastimen.',
    description: 'Vestido azul brillante, una trenza larga de lado, dando la espalda o creando un muro de hielo con las manos.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/elsa.png'
  },

  // GRUPO 2: INSUFICIENCIA Y MIEDO
  {
    name: 'El Chavo del Ocho',
    category: 'NINO_BERRINCHUDO',
    maneraSerTag: 'INSUFICIENCIA',
    maneraSerLabel: 'Insuficiencia / Carencia',
    scriptFeedback: 'Siempre te falta algo. Vives desde la carencia ("la torta de jamón"). Te justificas constantemente con tu torpeza ("se me chispoteó") para que no te exijan resultados grandes. Prefieres esconderte en tu barril.',
    description: 'Gorra verde a cuadros con orejeras, ropa remendada, tirantes naranjas y pecas en la cara.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/chavo-del-ocho.png'
  },
  {
    name: 'Woody',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'INSUFICIENCIA',
    maneraSerLabel: 'Insuficiencia / Miedo a ser Reemplazado',
    scriptFeedback: 'Tu liderazgo nace del miedo a ser reemplazado. Te aterra que te guarden en el baúl o que llegue alguien "más nuevo" (Buzz). Controlas a tu entorno no por visión, sino por inseguridad de perder tu lugar.',
    description: 'Vaquero con chaleco de vaca, placa de sheriff, pero con cara de preocupación, mirando de reojo.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/woody.png'
  },
  {
    name: 'Muñeca de Trapo',
    category: 'VICTIMA_DRAMA',
    maneraSerTag: 'DEJADA',
    maneraSerLabel: 'Dejada / Sin Columna Vertebral',
    scriptFeedback: 'No tienes columna vertebral emocional. Permites que la vida te arrastre y que otros decidan por ti. Te dejas aventar en cualquier esquina porque "no quieres molestar". Estás floja ante tu propia existencia.',
    description: 'Muñeca con costuras visibles en la boca, cabello de estambre rojo desordenado, cuerpo desguanzado (sin fuerza).',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/muneca-trapo.png'
  },
  {
    name: 'Robin',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'EL SEGUNDO EN TURNO',
    maneraSerLabel: 'Segundo en Turno / Eterno Ayudante',
    scriptFeedback: 'Eterno ayudante, nunca protagonista. Te acomoda ser la sombra de alguien más para no tomar la responsabilidad final. Vives la gloria ajena y te escondes detrás de la capa de otro.',
    description: 'Antifaz negro, traje rojo con capa amarilla, parado un paso atrás de un reflector vacío.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/robin.png'
  },

  // GRUPO 3: BERRINCHES Y MADUREZ EMOCIONAL
  {
    name: 'Campanita (Disney)',
    category: 'NINO_BERRINCHUDO',
    maneraSerTag: 'BERRINCHES',
    maneraSerLabel: 'Berrinches / Celos',
    scriptFeedback: 'Si no eres el centro de atención, te apagas (literalmente). Eres pequeña pero ruidosa. Crees que el mundo debe girar a tu alrededor y si alguien más brilla, te llenas de celos e intentas sabotearlo.',
    description: 'Vestido verde corto, alas, cara roja de enojo, brazos cruzados y dando la espalda indignada.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/campanita.png'
  },
  {
    name: 'Kiko',
    category: 'NINO_BERRINCHUDO',
    maneraSerTag: 'BERRINCHES',
    maneraSerLabel: 'Berrinches / Inmadurez',
    scriptFeedback: '¡Cállate, cállate que me desesperas! No sabes escuchar. Cuando algo no sale como quieres, inflas los cachetes y te vas. Presumes lo que tienes (material) para tapar tu falta de madurez.',
    description: 'Traje de marinero negro con corbata roja, gorrito de colores, cachetes inflados exageradamente.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/kiko.png'
  },
  {
    name: 'La Chilindrina',
    category: 'NINO_BERRINCHUDO',
    maneraSerTag: 'BERRINCHES',
    maneraSerLabel: 'Berrinches / Manipulación',
    scriptFeedback: 'Usas el llanto manipulador ("Waaaa") para conseguir lo que quieres. Eres astuta, pero usas esa inteligencia para crear enredos, mentir y salirte con la tuya evadiendo las consecuencias.',
    description: 'Vestido verde, suéter rojo chueco, lentes, dos colitas disparejas y llorando falsamente.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/chilindrina.png'
  },

  // GRUPO 4: DUREZA, EGO Y CONTROL
  {
    name: 'Hulk',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'IRA',
    maneraSerLabel: 'Ira / Explosivo',
    scriptFeedback: 'No gestionas, rompes. Tu única herramienta es la fuerza bruta y el estallido. Crees que imponiendo miedo te van a respetar, pero solo logras que la gente camine sobre cáscaras de huevo a tu lado.',
    description: 'Piel verde, pantalones morados rotos, músculos tensos y boca abierta gritando.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/hulk.png'
  },
  {
    name: 'Hombre de Hojalata',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'DUREZA',
    maneraSerLabel: 'Dureza / Sin Corazón',
    scriptFeedback: 'Estás oxidado por dentro. Te has puesto una armadura de metal para no sentir. Eres funcional, trabajas y operas, pero no conectas. Te falta corazón y calidez humana en tu trato.',
    description: 'Todo plateado metálico, con un embudo en la cabeza y un hacha, golpeándose el pecho hueco.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/hombre-hojalata.png'
  },
  {
    name: 'Soldado G.I. Joe',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'DUREZA / EGO',
    maneraSerLabel: 'Dureza / Rigidez',
    scriptFeedback: 'Todo es una guerra para ti. Eres rígido, sigues órdenes o las das, pero no fluyes. Estás siempre a la defensiva, listo para disparar. Tu armadura es perfecta, pero dentro no hay nadie.',
    description: 'Soldado de plástico verde monocromático, rígido en pose de saludo militar o apuntando, base de plástico en los pies.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/gi-joe.png'
  },
  {
    name: 'La Mole',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'DUREZA',
    maneraSerLabel: 'Dureza / Impenetrable',
    scriptFeedback: 'Te has convencido de que eres una roca. Soportas todo el peso, aguantas todos los golpes, pero tu piel es impenetrable. Nada entra, nada sale. Eres fuerte, pero estás solo en tu fortaleza.',
    description: 'Cuerpo hecho de rocas naranjas, short azul, postura de guardia de boxeo, cara de pocos amigos.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/la-mole.png'
  },
  {
    name: 'María Félix',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'DUREZA',
    maneraSerLabel: 'Dureza / Arrogancia',
    scriptFeedback: 'Miras a todos por encima del hombro. Tu ceja levantada es tu defensa. Utilizas la arrogancia para que nadie vea tu vulnerabilidad. Crees que nadie está a tu nivel.',
    description: 'Joyas exageradas, sombrero elegante, cigarro en boquilla larga, ceja levantada con desdén.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/maria-felix.png'
  },
  {
    name: 'Buzz Lightyear',
    category: 'MASCARA_DUREZA_EGO',
    maneraSerTag: 'EGO',
    maneraSerLabel: 'Ego / Desconectado de la Realidad',
    scriptFeedback: 'Crees que vuelas, pero solo caes con estilo. Vives en una misión galáctica imaginaria para no aterrizar en tu realidad. Tu ego te impide ver que eres uno más, y eso te aterra.',
    description: 'Traje espacial blanco y verde, casco cerrado, barbilla en alto, pose heroica desconectada de la realidad.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/buzz-lightyear.png'
  },

  // GRUPO 5: EVASIÓN Y MÁSCARAS SOCIALES
  {
    name: 'Barbie',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'VIVIR DE APARIENCIAS',
    maneraSerLabel: 'Apariencias / Plástica',
    scriptFeedback: 'Todo es perfecto en tu caja, pero es de plástico. Sonríes aunque estés rota. Te importa más cómo te ves que cómo te sientes. Eres un accesorio en tu propia vida.',
    description: 'Dentro de una caja rosa, sonrisa congelada y rígida, pose de maniquí perfecta.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/barbie.png'
  },
  {
    name: 'Kung Fu Panda',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'PAYASITO',
    maneraSerLabel: 'Payasito / Escudo de Humor',
    scriptFeedback: 'Te ríes de todo para que no duela nada. Usas tu torpeza, tu peso y tus chistes como escudo. Prefieres que se rían de ti a que te tomen en serio. Eres el "gordito simpático" para no ser el hombre poderoso.',
    description: 'Panda con shorts de parches, comiendo dumplings o tropezándose, riendo con la boca llena.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/kung-fu-panda.png'
  },
  {
    name: 'Peter Pan',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'MUNDO DE FANTASÍA',
    maneraSerLabel: 'Fantasía / Eterno Niño',
    scriptFeedback: 'Te niegas a aterrizar. Vives en Nunca Jamás para no enfrentar las cuentas, los compromisos y la adultez. Quieres ser el niño eterno mientras otros pagan tus facturas emocionales.',
    description: 'Mallas verdes, sombrero con pluma roja, flotando un poco, actitud desafiante y juvenil.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/peter-pan.png'
  },
  {
    name: 'Ludoviquito P. Luche',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'VALE MADRISMO',
    maneraSerLabel: 'Vale Madrismo / Cinismo',
    scriptFeedback: 'Te da igual. "Ay, ya equis". Usas el cinismo y la indiferencia para que no te exijan excelencia. Si fallas, te ríes. No hay compromiso ni honor en tu palabra.',
    description: 'Traje de peluche amarillo o verde, gorra hacia atrás, rascándose la cabeza con desinterés.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/ludoviquito.png'
  },
  {
    name: 'Desagrado (Inside Out)',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'ANTIPÁTICO',
    maneraSerLabel: 'Antipático / Juicio',
    scriptFeedback: 'Todo te huele mal. Tu cara de "fuchi" es tu filtro con el mundo. Juzgas antes de conocer para protegerte. Eres sarcástica, cortante y alejas a la gente con tu actitud.',
    description: 'Piel verde, vestido verde, pañuelo en el cuello, mirada de asco hacia el espectador.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/desagrado.png'
  },
  {
    name: 'Fantasma',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'NO HAY QUE EXPLICAR',
    maneraSerLabel: 'Invisible / Sin Presencia',
    scriptFeedback: 'Estás, pero no estás. Pasas por la sala sin dejar huella, sin hacer ruido, sin impactar. Eres un espectro en tu propia historia. Nadie sabe qué piensas ni qué sientes.',
    description: 'Una sábana blanca clásica con dos agujeros negros para los ojos, flotando en un fondo oscuro.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/fantasma.png'
  },
  {
    name: 'Violeta (Elastic Girl)',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'QUIERE DESAPARECER / INVISIBLE',
    maneraSerLabel: 'Invisible / Esconderse',
    scriptFeedback: 'Tu poder es esconderte. Te pones el pelo en la cara y generas campos de fuerza para que nadie te toque. Te haces chiquita para no incomodar. Tu mayor miedo es ser vista.',
    description: 'Traje rojo de superhéroe, pero semitransparente (desvaneciéndose), escondida detrás de un mechón de pelo negro.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/violeta.png'
  },
  {
    name: 'León Cobarde (Mago de Oz)',
    category: 'INVISIBLES_SOLITARIOS',
    maneraSerTag: 'HOMBRE INVISIBLE',
    maneraSerLabel: 'Cobarde / Sin Valor',
    scriptFeedback: 'Tienes el tamaño de un rey, pero actúas como un ratón. Ruges bajito. Tienes miedo de tu propia sombra y buscas que otros te den el valor que ya tienes pero no usas.',
    description: 'León grande pero encogido de hombros, agarrándose la cola con miedo, temblando.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/leon-cobarde.png'
  },

  // GRUPO 6: LOS SALVADORES Y LOS AMARGADOS
  {
    name: 'Mirabel (Encanto)',
    category: 'SALVADORES_MARTIRES',
    maneraSerTag: 'SOSTENER FAMILIA A COSTA DEL BIENESTAR PROPIO',
    maneraSerLabel: 'Salvadora / Carga Familiar',
    scriptFeedback: 'Te desvives por resolverle la vida a tu familia (o tribu) a costa de ti misma. Buscas validación siendo la "útil", la que arregla las grietas, pero te olvidas de que tú también necesitas una puerta.',
    description: 'Vestido típico colombiano colorido, lentes verdes, cargando una casa pesada o una vela sobre la espalda.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/mirabel.png'
  },
  {
    name: 'Mr. Increíble',
    category: 'SALVADORES_MARTIRES',
    maneraSerTag: 'TODO LO PUEDE',
    maneraSerLabel: 'Salvador / Superhéroe Solitario',
    scriptFeedback: 'El síndrome del superhéroe solitario. Crees que si tú no lo haces, el mundo se cae. No sabes delegar, no sabes pedir ayuda. Estás agotado de cargar el mundo, pero tu ego no te deja soltar.',
    description: 'Traje rojo ajustado, pero con la panza un poco salida, cara de esfuerzo extremo sosteniendo algo pesado.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/mr-increible.png'
  },
  {
    name: 'Mujer Maravilla',
    category: 'SALVADORES_MARTIRES',
    maneraSerTag: 'TODAS LAS PUEDE',
    maneraSerLabel: 'Salvadora / Perfecta y Sola',
    scriptFeedback: 'Perfecta, fuerte, invencible... y sola. No te permites un momento de debilidad. Crees que ser mujer poderosa significa no necesitar a nadie. Tu lazo de la verdad te asfixia a ti misma.',
    description: 'Tiara dorada, brazaletes cruzados bloqueando un golpe, mirada intensa y perfecta.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/mujer-maravilla.png'
  },
  {
    name: 'Doña Florinda',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'AMARGURA',
    maneraSerLabel: 'Amargura / Chusma',
    scriptFeedback: 'Vives entre la "chusma" pero crees que no perteneces ahí. Estás amargada por tu realidad y culpas a tu entorno. Vives de glorias pasadas o estatus imaginario mientras tomas tu tacita de café.',
    description: 'Tubos en la cabeza, mandil, cacheteando el aire o mirando con desprecio, sosteniendo una taza.',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/dona-florinda.png'
  },
  {
    name: 'La Muerte (Catrina)',
    category: 'MASCARA_SOCIAL',
    maneraSerTag: 'ABANDONO DE LA EXP. DE VIDA',
    maneraSerLabel: 'Muerte en Vida / Renuncia',
    scriptFeedback: 'Ya te fuiste. Tu cuerpo está aquí en la sala, pero tu espíritu renunció hace tiempo. No hay brillo en tus ojos. Has decidido morir en vida antes de tiempo. Eres un cadáver caminando.',
    description: 'Una Catrina elegante pero sin colores vivos (gris y negro), con una guadaña en la mano y mirada vacía (cuencas oscuras).',
    imageUrl: 'https://plataforma-frutos.s3.us-east-2.amazonaws.com/arquetipos/la-muerte.png'
  }
];

async function loadSystemArchetypes() {
  console.log('🎭 Cargando arquetipos predefinidos del sistema...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const archetype of SYSTEM_ARCHETYPES) {
    try {
      // Verificar si ya existe
      const exists = await prisma.archetype.findFirst({
        where: {
          name: archetype.name,
          isSystemDefault: true
        }
      });

      if (exists) {
        console.log(`⏭️  ${archetype.name} - ya existe (ID: ${exists.id})`);
        skipped++;
        continue;
      }

      const created_arch = await prisma.archetype.create({
        data: {
          ...archetype,
          isSystemDefault: true,
          isActive: true
        }
      });

      console.log(`✅ ${archetype.name} - creado (ID: ${created_arch.id})`);
      created++;
    } catch (error) {
      console.error(`❌ Error creando ${archetype.name}:`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   ✅ Creados: ${created}`);
  console.log(`   ⏭️  Omitidos: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   📦 Total esperado: ${SYSTEM_ARCHETYPES.length}`);

  // Verificar total en BD
  const totalInDb = await prisma.archetype.count({ where: { isSystemDefault: true } });
  console.log(`   🗄️  Total en BD: ${totalInDb}`);

  await prisma.$disconnect();
}

loadSystemArchetypes().catch(console.error);
