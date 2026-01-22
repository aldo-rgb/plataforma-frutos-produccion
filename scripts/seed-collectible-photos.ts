// Script para poblar las 50 fotos coleccionables del Álbum Cuántico
// Ejecutar con: npx ts-node scripts/seed-collectible-photos.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Las 50 fotos coleccionables organizadas por categoría
const COLLECTIBLE_PHOTOS = [
  // =============================================
  // CATEGORÍA I: LA TRIBU (Conexiones Humanas) - Slots 1-10
  // =============================================
  {
    slot: 1,
    name: 'El Guardián',
    description: 'Tu Game Changer es tu guía en este viaje. Esta foto captura el vínculo de confianza que han construido.',
    category: 'TRIBU',
    emoji: '🛡️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 1
  },
  {
    slot: 2,
    name: 'El Espejo',
    description: 'Tu Buddy refleja lo mejor de ti. Esta foto sella el pacto de acompañamiento mutuo.',
    category: 'TRIBU',
    emoji: '🪞',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 2
  },
  {
    slot: 3,
    name: 'El Clan',
    description: 'Tu Mini Grupo (Squad) completo. Los guerreros que caminan contigo hacia la transformación.',
    category: 'TRIBU',
    emoji: '⚔️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75, // Más difícil coordinar grupo
    validationRule: 'AI_GROUP',
    sortOrder: 3
  },
  {
    slot: 4,
    name: 'El Guía',
    description: 'El Trainer que lidera el entrenamiento. Captura un momento con quien dirige tu transformación.',
    category: 'TRIBU',
    emoji: '🎯',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 4
  },
  {
    slot: 5,
    name: 'El Líder',
    description: 'El Coordinador que hace posible todo esto. Un momento con el arquitecto del evento.',
    category: 'TRIBU',
    emoji: '👑',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 5
  },
  {
    slot: 6,
    name: 'El Ángel',
    description: 'Tu "amigo secreto" si hubo dinámica de ángeles. Un vínculo invisible hecho visible.',
    category: 'TRIBU',
    emoji: '😇',
    requiredLevels: ['ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 6
  },
  {
    slot: 7,
    name: 'El Nuevo Amigo',
    description: 'Alguien que conociste en la fila, en el break, o en el pasillo. Una conexión inesperada.',
    category: 'TRIBU',
    emoji: '🤝',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 7
  },
  {
    slot: 8,
    name: 'El Veterano',
    description: 'Alguien que ya es PL o Staff de apoyo. Conecta con quienes ya recorrieron el camino.',
    category: 'TRIBU',
    emoji: '🎖️',
    requiredLevels: ['BASIC', 'ADVANCED'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 8
  },
  {
    slot: 9,
    name: 'Duelo de Titanes',
    description: 'Foto haciendo "fuercitas" o una pose de poder con otro participante. ¡Muestra tu fuerza!',
    category: 'TRIBU',
    emoji: '💪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 9
  },
  {
    slot: 10,
    name: 'Abrazo Grupal',
    description: 'Selfie donde salgan más de 10 cabezas. La energía colectiva capturada en un instante.',
    category: 'TRIBU',
    emoji: '🫂',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 100, // Muy difícil coordinar
    validationRule: 'AI_GROUP',
    sortOrder: 10
  },

  // =============================================
  // CATEGORÍA II: LOS ARTEFACTOS (Símbolos) - Slots 11-20
  // =============================================
  {
    slot: 11,
    name: 'Mi Identidad',
    description: 'Tu Gafete (Badge) desgastado por el uso. La prueba de que estuviste ahí.',
    category: 'ARTEFACTOS',
    emoji: '🏷️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_BADGE',
    sortOrder: 11
  },
  {
    slot: 12,
    name: 'El Manual',
    description: 'Tu cuaderno de trabajo abierto en tu página favorita. Tus notas son tu tesoro.',
    category: 'ARTEFACTOS',
    emoji: '📓',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_OBJECT',
    sortOrder: 12
  },
  {
    slot: 13,
    name: 'La Herramienta',
    description: 'Tu bolígrafo (pluma) sobre el cuaderno. El arma con la que escribes tu nueva historia.',
    category: 'ARTEFACTOS',
    emoji: '🖊️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 13
  },
  {
    slot: 14,
    name: 'El Trono',
    description: 'Tu silla vacía. El símbolo de tu lugar en el mundo, esperando por ti.',
    category: 'ARTEFACTOS',
    emoji: '🪑',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 14
  },
  {
    slot: 15,
    name: 'La Armadura',
    description: 'La playera oficial del evento (si la hay). Tu uniforme de guerrero.',
    category: 'ARTEFACTOS',
    emoji: '👕',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 15
  },
  {
    slot: 16,
    name: 'El Combustible',
    description: 'Tu café o botella de agua en el break. Lo que te mantuvo con energía.',
    category: 'ARTEFACTOS',
    emoji: '☕',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 16
  },
  {
    slot: 17,
    name: 'El Pañuelo',
    description: 'La caja de Kleenex. Símbolo de las emociones que soltaste.',
    category: 'ARTEFACTOS',
    emoji: '🧻',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 17
  },
  {
    slot: 18,
    name: 'El Tótem',
    description: 'El podio o escenario desde tu silla. El centro de poder del evento.',
    category: 'ARTEFACTOS',
    emoji: '🎭',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 18
  },
  {
    slot: 19,
    name: 'La Entrada',
    description: 'La puerta del salón. El umbral que cruzaste hacia tu transformación.',
    category: 'ARTEFACTOS',
    emoji: '🚪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 19
  },
  {
    slot: 20,
    name: 'El Contrato Físico',
    description: 'Tu hoja de contrato firmada. Tu compromiso materializado.',
    category: 'ARTEFACTOS',
    emoji: '📜',
    requiredLevels: ['ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'AI_BADGE', // Detectar documento
    sortOrder: 20
  },

  // =============================================
  // CATEGORÍA III: MOMENTOS DE PODER (Acción) - Slots 21-30
  // =============================================
  {
    slot: 21,
    name: 'Salto Cuántico',
    description: 'Una foto en el aire brincando. Tu energía desafiando la gravedad.',
    category: 'MOMENTOS',
    emoji: '🦘',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75, // Difícil capturar
    validationRule: 'MANUAL',
    sortOrder: 21
  },
  {
    slot: 22,
    name: 'La Pared Azul',
    description: 'La foto oficial en el backdrop del evento. El retrato icónico.',
    category: 'MOMENTOS',
    emoji: '🖼️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 100, // Foto especial
    validationRule: 'AI_PERSON',
    sortOrder: 22
  },
  {
    slot: 23,
    name: 'Modo Zen',
    description: 'Foto meditando o en silencio profundo. Tu paz interior capturada.',
    category: 'MOMENTOS',
    emoji: '🧘',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 23
  },
  {
    slot: 24,
    name: 'High Five',
    description: 'Foto chocando las manos con alguien. La conexión instantánea.',
    category: 'MOMENTOS',
    emoji: '✋',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 24
  },
  {
    slot: 25,
    name: 'La Fila',
    description: 'Foto esperando entrar al salón. La expectativa antes de la batalla.',
    category: 'MOMENTOS',
    emoji: '🚶',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 25
  },
  {
    slot: 26,
    name: 'Break Time',
    description: 'Foto relajados en los sillones o pasillos. El descanso del guerrero.',
    category: 'MOMENTOS',
    emoji: '😌',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 26
  },
  {
    slot: 27,
    name: 'Celebración',
    description: 'Foto con las manos arriba en señal de victoria. ¡Lo lograste!',
    category: 'MOMENTOS',
    emoji: '🙌',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 27
  },
  {
    slot: 28,
    name: 'El Círculo',
    description: 'Foto de los zapatos de todos los del Squad formando un círculo. Unidad.',
    category: 'MOMENTOS',
    emoji: '⭕',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'MANUAL',
    sortOrder: 28
  },
  {
    slot: 29,
    name: 'Working Hard',
    description: 'Foto escribiendo concentrado (tomada por alguien más). En plena batalla.',
    category: 'MOMENTOS',
    emoji: '✍️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 29
  },
  {
    slot: 30,
    name: 'La Graduación',
    description: 'Foto con tu diploma o reconocimiento final. La victoria materializada.',
    category: 'MOMENTOS',
    emoji: '🎓',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 100,
    validationRule: 'AI_PERSON',
    sortOrder: 30
  },

  // =============================================
  // CATEGORÍA IV: REFLEJOS DEL SER (Introspección) - Slots 31-40
  // =============================================
  {
    slot: 31,
    name: 'El "Antes"',
    description: 'Selfie tomada el Día 1 antes de entrar. Tu cara de expectativa o miedo.',
    category: 'REFLEJOS',
    emoji: '😰',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'AI_PERSON',
    sortOrder: 31
  },
  {
    slot: 32,
    name: 'El "Después"',
    description: 'Selfie tomada el último día al salir. Tu cara de brillo y paz.',
    category: 'REFLEJOS',
    emoji: '✨',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'AI_PERSON',
    sortOrder: 32
  },
  {
    slot: 33,
    name: 'Mis Raíces',
    description: 'Foto de tus pies bien plantados en el suelo. Conectado a la tierra.',
    category: 'REFLEJOS',
    emoji: '🦶',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 33
  },
  {
    slot: 34,
    name: 'Mi Visión',
    description: 'Foto de tu tablero de visión o carta de metas. Tu futuro visualizado.',
    category: 'REFLEJOS',
    emoji: '🎯',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 34
  },
  {
    slot: 35,
    name: 'La Sombra',
    description: 'Una foto artística de tu sombra en el piso. Lo que dejas atrás.',
    category: 'REFLEJOS',
    emoji: '👤',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 35
  },
  {
    slot: 36,
    name: 'La Luz',
    description: 'Una foto hacia las luces del escenario o el sol afuera. Lo que te ilumina.',
    category: 'REFLEJOS',
    emoji: '☀️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 36
  },
  {
    slot: 37,
    name: 'Crazy Face',
    description: 'Una selfie haciendo la mueca más divertida posible. Rompe la imagen seria.',
    category: 'REFLEJOS',
    emoji: '🤪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 37
  },
  {
    slot: 38,
    name: 'Mirada Fija',
    description: 'Una selfie muy cerca de tus ojos. La ventana del alma.',
    category: 'REFLEJOS',
    emoji: '👁️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 38
  },
  {
    slot: 39,
    name: 'Libertad',
    description: 'Foto de espaldas caminando hacia la salida. Avanzando hacia tu nuevo yo.',
    category: 'REFLEJOS',
    emoji: '🚶‍♂️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 39
  },
  {
    slot: 40,
    name: 'Gratitud',
    description: 'Foto con las manos en el pecho. El gesto universal de agradecimiento.',
    category: 'REFLEJOS',
    emoji: '🙏',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'AI_PERSON',
    sortOrder: 40
  },

  // =============================================
  // CATEGORÍA V: EL ENTORNO (Easter Eggs) - Slots 41-50
  // =============================================
  {
    slot: 41,
    name: 'El Reloj',
    description: 'Foto de la hora en que terminó tu sesión más difícil. Marcando el tiempo.',
    category: 'ENTORNO',
    emoji: '⏰',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 41
  },
  {
    slot: 42,
    name: 'El Snack',
    description: 'Foto de la galleta o fruta que te salvó la vida en el break. Combustible vital.',
    category: 'ENTORNO',
    emoji: '🍪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 42
  },
  {
    slot: 43,
    name: 'La Música',
    description: 'Foto de la cabina de audio/DJ. Los magos del sonido que crean la atmósfera.',
    category: 'ENTORNO',
    emoji: '🎧',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 43
  },
  {
    slot: 44,
    name: 'Staff en Acción',
    description: 'Foto "robada" de un staff corriendo o trabajando. Los héroes invisibles.',
    category: 'ENTORNO',
    emoji: '🏃',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'AI_PERSON',
    sortOrder: 44
  },
  {
    slot: 45,
    name: 'El Mensaje',
    description: 'Foto de alguna frase escrita en el pizarrón o pantalla. Sabiduría capturada.',
    category: 'ENTORNO',
    emoji: '📝',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 45
  },
  {
    slot: 46,
    name: 'La Salida de Emergencia',
    description: 'Metafórica o literal. El recordatorio de que siempre hay una salida.',
    category: 'ENTORNO',
    emoji: '🚪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 46
  },
  {
    slot: 47,
    name: 'El Pasillo',
    description: 'Perspectiva del pasillo del hotel/venue. El camino recorrido.',
    category: 'ENTORNO',
    emoji: '🛤️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 47
  },
  {
    slot: 48,
    name: 'La Carpeta',
    description: 'Foto de la pila de materiales de registro. El inicio de todo.',
    category: 'ENTORNO',
    emoji: '📁',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 50,
    validationRule: 'MANUAL',
    sortOrder: 48
  },
  {
    slot: 49,
    name: 'Full House',
    description: 'Foto panorámica del salón lleno. La energía colectiva en su máxima expresión.',
    category: 'ENTORNO',
    emoji: '🎪',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 100,
    validationRule: 'AI_GROUP',
    sortOrder: 49
  },
  {
    slot: 50,
    name: 'Empty House',
    description: 'Foto del salón vacío al final. Melancolía y satisfacción mezcladas.',
    category: 'ENTORNO',
    emoji: '🏚️',
    requiredLevels: ['BASIC', 'ADVANCED', 'PL'],
    pointsReward: 75,
    validationRule: 'MANUAL',
    sortOrder: 50
  }
];

async function main() {
  console.log('🎴 Iniciando seed de fotos coleccionables...\n');

  for (const photo of COLLECTIBLE_PHOTOS) {
    try {
      const result = await prisma.collectiblePhotoTemplate.upsert({
        where: { slot: photo.slot },
        update: {
          name: photo.name,
          description: photo.description,
          category: photo.category as any,
          emoji: photo.emoji,
          requiredLevels: photo.requiredLevels as any,
          pointsReward: photo.pointsReward,
          validationRule: photo.validationRule as any,
          sortOrder: photo.sortOrder,
          isActive: true
        },
        create: {
          slot: photo.slot,
          name: photo.name,
          description: photo.description,
          category: photo.category as any,
          emoji: photo.emoji,
          requiredLevels: photo.requiredLevels as any,
          pointsReward: photo.pointsReward,
          validationRule: photo.validationRule as any,
          sortOrder: photo.sortOrder,
          isActive: true
        }
      });
      console.log(`✅ Slot ${photo.slot}: ${photo.emoji} ${photo.name}`);
    } catch (error) {
      console.error(`❌ Error en slot ${photo.slot}:`, error);
    }
  }

  // Resumen por categoría
  const summary = await prisma.collectiblePhotoTemplate.groupBy({
    by: ['category'],
    _count: { id: true },
    _sum: { pointsReward: true }
  });

  console.log('\n📊 Resumen por categoría:');
  console.log('─'.repeat(50));
  for (const cat of summary) {
    console.log(`${cat.category}: ${cat._count.id} fotos | ${cat._sum.pointsReward} PC totales`);
  }

  const totalPhotos = await prisma.collectiblePhotoTemplate.count();
  const totalPoints = await prisma.collectiblePhotoTemplate.aggregate({
    _sum: { pointsReward: true }
  });

  console.log('─'.repeat(50));
  console.log(`📸 Total: ${totalPhotos} fotos coleccionables`);
  console.log(`💰 Puntos máximos posibles: ${totalPoints._sum.pointsReward} PC`);
  console.log('\n✨ Seed completado!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
