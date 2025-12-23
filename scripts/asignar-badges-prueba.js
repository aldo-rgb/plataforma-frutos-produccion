/**
 * 🎭 SCRIPT: Asignación de Medallas de Prueba
 * 
 * Asigna medallas aleatorias a los mentores de prueba para demostración
 * del sistema de gamificación.
 * 
 * Ejecución:
 * node scripts/asignar-badges-prueba.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Todas las medallas disponibles
const TODAS_LAS_MEDALLAS = ['INQUEBRANTABLE', 'ERUDITO', 'FLASH', 'ZEN_MASTER', 'CLUB_5AM'];

// Configuración de probabilidad para cada medalla (0-100%)
const PROBABILIDADES = {
  'INQUEBRANTABLE': 70,  // 70% de probabilidad
  'ERUDITO': 60,         // 60% de probabilidad
  'FLASH': 50,           // 50% de probabilidad
  'ZEN_MASTER': 30,      // 30% de probabilidad (más exclusiva)
  'CLUB_5AM': 40         // 40% de probabilidad (club exclusivo)
};

function obtenerMedallasAleatorias() {
  const medallas = [];
  
  TODAS_LAS_MEDALLAS.forEach(medalla => {
    const probabilidad = PROBABILIDADES[medalla];
    const random = Math.random() * 100;
    
    if (random <= probabilidad) {
      medallas.push(medalla);
    }
  });
  
  return medallas;
}

async function asignarBadgesDePrueba() {
  try {
    // Obtener todos los mentores activos
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        PerfilMentor: { isNot: null }
      },
      select: { id: true, nombre: true, email: true }
    });

    console.log(`📊 Encontrados ${mentores.length} mentores para asignar badges\n`);

    let mentoresConBadges = 0;
    let totalBadgesAsignadas = 0;

    for (const mentor of mentores) {
      const badgesAleatorias = obtenerMedallasAleatorias();
      
      await prisma.usuario.update({
        where: { id: mentor.id },
        data: { badges: badgesAleatorias }
      });

      if (badgesAleatorias.length > 0) {
        mentoresConBadges++;
        totalBadgesAsignadas += badgesAleatorias.length;
        
        console.log(`✨ ${mentor.nombre} (${mentor.email})`);
        console.log(`   📛 Badges: ${badgesAleatorias.map(b => {
          const icons = {
            'INQUEBRANTABLE': '🛡️',
            'ERUDITO': '📚',
            'FLASH': '⚡',
            'ZEN_MASTER': '🧘',
            'CLUB_5AM': '🌅'
          };
          return `${icons[b]} ${b}`;
        }).join(', ')}`);
        console.log('');
      } else {
        console.log(`⚪ ${mentor.nombre} - Sin medallas esta vez`);
      }
    }

    console.log('\n📈 RESUMEN:');
    console.log(`   • Mentores evaluados: ${mentores.length}`);
    console.log(`   • Mentores con badges: ${mentoresConBadges}`);
    console.log(`   • Total de badges asignadas: ${totalBadgesAsignadas}`);
    console.log(`   • Promedio de badges por mentor: ${(totalBadgesAsignadas / mentores.length).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🎭 =============================================');
  console.log('🎭 ASIGNACIÓN DE BADGES DE PRUEBA');
  console.log('🎭 =============================================\n');
  
  console.log('⚙️  CONFIGURACIÓN DE PROBABILIDADES:');
  console.log('   🛡️  INQUEBRANTABLE: 70%');
  console.log('   📚 ERUDITO: 60%');
  console.log('   ⚡ FLASH: 50%');
  console.log('   🌅 CLUB_5AM: 40%');
  console.log('   🧘 ZEN_MASTER: 30%\n');

  try {
    await asignarBadgesDePrueba();
    
    console.log('\n✅ =============================================');
    console.log('✅ ASIGNACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ =============================================');
    console.log('\n💡 Tip: Visita el catálogo de mentores para ver las badges en acción!');
    console.log('   👉 http://localhost:3000/dashboard/student/catalogo\n');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ =============================================');
    console.error('❌ ERROR EN LA ASIGNACIÓN');
    console.error('❌ =============================================');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
