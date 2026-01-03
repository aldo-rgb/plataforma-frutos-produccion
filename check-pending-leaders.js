const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPendingLeaders() {
  try {
    console.log('🔍 Verificando líderes pendientes de aprobación...\n');

    // Buscar líderes con biografía pero sin aprobación
    const pendingLeaders = await prisma.usuario.findMany({
      where: {
        rol: 'LIDER',
        mentorMarketplaceApproved: false,
        PerfilMentor: {
          biografia: {
            not: null
          }
        }
      },
      include: {
        PerfilMentor: {
          select: {
            biografia: true
          }
        }
      }
    });

    console.log(`📊 Total de líderes pendientes: ${pendingLeaders.length}\n`);

    if (pendingLeaders.length > 0) {
      console.log('📋 Detalles de líderes pendientes:\n');
      pendingLeaders.forEach((leader, index) => {
        console.log(`${index + 1}. ${leader.nombre} (${leader.email})`);
        console.log(`   - Organización ID: ${leader.organizationId}`);
        console.log(`   - Biografía (primeros 100 chars): ${leader.PerfilMentor?.biografia?.substring(0, 100)}...`);
        console.log(`   - mentorMarketplaceApproved: ${leader.mentorMarketplaceApproved}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No hay líderes pendientes de aprobación en este momento.');
      console.log('');
      console.log('Para que aparezca la notificación, un líder debe:');
      console.log('1. Tener rol "LIDER"');
      console.log('2. Tener una biografía de al menos 50 caracteres en PerfilMentor');
      console.log('3. No estar aprobado (mentorMarketplaceApproved = false)');
    }

    // Verificar todos los líderes
    const allLeaders = await prisma.usuario.findMany({
      where: {
        rol: 'LIDER'
      },
      include: {
        PerfilMentor: {
          select: {
            biografia: true
          }
        }
      }
    });

    console.log(`\n\n📊 Total de líderes en el sistema: ${allLeaders.length}`);
    
    allLeaders.forEach((leader, index) => {
      const bioLength = leader.PerfilMentor?.biografia?.length || 0;
      console.log(`\n${index + 1}. ${leader.nombre} (${leader.email})`);
      console.log(`   - Biografía: ${bioLength > 0 ? `${bioLength} caracteres` : 'NO TIENE'}`);
      console.log(`   - Aprobado: ${leader.mentorMarketplaceApproved ? 'SÍ ✅' : 'NO ❌'}`);
      console.log(`   - Estado: ${bioLength >= 50 && !leader.mentorMarketplaceApproved ? '🔔 PENDIENTE DE APROBACIÓN' : bioLength >= 50 ? '✅ Ya aprobado' : '⏳ Aún no solicita aprobación'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingLeaders();
