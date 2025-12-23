import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function toggleModoHeroe() {
  const args = process.argv.slice(2);
  const modo = args[0]; // 'heroe' o 'catalogo'

  if (!modo || !['heroe', 'catalogo'].includes(modo)) {
    console.log('❌ Uso: npm run toggle-modo [heroe|catalogo]');
    console.log('');
    console.log('Ejemplos:');
    console.log('  npm run toggle-modo heroe     → Solo Roberto (Modo Héroe)');
    console.log('  npm run toggle-modo catalogo  → 3 mentores (Modo Catálogo)');
    process.exit(1);
  }

  try {
    if (modo === 'heroe') {
      // Modo Héroe: Solo dejar disponible a Roberto
      console.log('🦸 Activando Modo Héroe...');
      
      await prisma.perfilMentor.updateMany({
        where: {
          Usuario: {
            nombre: { not: 'Roberto Martínez' }
          }
        },
        data: {
          disponible: false
        }
      });

      await prisma.perfilMentor.updateMany({
        where: {
          Usuario: {
            nombre: 'Roberto Martínez'
          }
        },
        data: {
          disponible: true
        }
      });

      console.log('✅ Modo Héroe activado!');
      console.log('   Solo Roberto Martínez está disponible');
      console.log('   Vista: Perfil expandido directo (sin catálogo)');
      
    } else {
      // Modo Catálogo: Activar todos los mentores
      console.log('📚 Activando Modo Catálogo...');
      
      await prisma.perfilMentor.updateMany({
        data: {
          disponible: true
        }
      });

      console.log('✅ Modo Catálogo activado!');
      console.log('   Todos los mentores están disponibles');
      console.log('   Vista: Grid de tarjetas con filtros');
    }

    console.log('');
    console.log('🔗 Recarga http://localhost:3000/dashboard/mentorias para ver cambios');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

toggleModoHeroe();
