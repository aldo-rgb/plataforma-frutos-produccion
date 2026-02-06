const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('🔍 Diagnóstico de Sistema de Notificaciones de Aprobación\n');
    console.log('='.repeat(70) + '\n');

    // 1. Verificar todos los líderes
    const allLeaders = await prisma.usuario.findMany({
      where: { rol: 'LIDER' },
      include: {
        PerfilMentor: { select: { biografia: true } },
        Organization: { select: { name: true, schoolAdminId: true } }
      }
    });

    console.log(`📊 LÍDERES EN EL SISTEMA: ${allLeaders.length}\n`);
    
    if (allLeaders.length === 0) {
      console.log('⚠️  NO HAY LÍDERES en el sistema. No aparecerá ninguna notificación.\n');
      return;
    }

    allLeaders.forEach((leader, i) => {
      const bioLength = leader.PerfilMentor?.biografia?.length || 0;
      const hasOrg = !!leader.organizationId;
      const canRequest = bioLength >= 50 && !leader.mentorMarketplaceApproved;
      
      console.log(`${i + 1}. ${leader.nombre} (${leader.email})`);
      console.log(`   Organización: ${hasOrg ? leader.Organization?.name : '❌ SIN ORGANIZACIÓN'}`);
      console.log(`   Biografía: ${bioLength > 0 ? `${bioLength} caracteres` : '❌ NO TIENE'}`);
      console.log(`   Aprobado: ${leader.mentorMarketplaceApproved ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   Estado: ${canRequest ? '🔔 PENDIENTE - DEBE APARECER NOTIFICACIÓN' : bioLength >= 50 ? '✅ Ya aprobado' : '⏳ Biografía incompleta (min 50 chars)'}`);
      console.log('');
    });

    // 2. Contar pendientes
    const pendingCount = await prisma.usuario.count({
      where: {
        rol: 'LIDER',
        mentorMarketplaceApproved: false,
        PerfilMentor: {
          biografia: {
            not: null
          }
        }
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n📋 RESUMEN: ${pendingCount} líder(es) pendiente(s) de aprobación\n`);

    if (pendingCount === 0) {
      console.log('❌ NO HAY LÍDERES PENDIENTES DE APROBACIÓN');
      console.log('\nPara que aparezcan las notificaciones:');
      console.log('1. Un líder debe completar su biografía (mínimo 50 caracteres)');
      console.log('2. El líder debe hacer clic en "Solicitar Aprobación"');
      console.log('3. El campo mentorMarketplaceApproved debe estar en false');
      console.log('4. El líder debe tener PerfilMentor con biografía\n');
    } else {
      console.log('✅ Las notificaciones DEBERÍAN aparecer:\n');
      console.log(`   • Para el LÍDER: Banner "Perfil en Revisión" en /dashboard/lider`);
      console.log(`   • Para SCHOOL-ADMIN: Banner con contador en /dashboard/school-admin\n`);
    }

    // 3. Verificar organizaciones y admins
    console.log('='.repeat(70));
    console.log('\n🏢 VERIFICACIÓN DE ORGANIZACIONES\n');
    
    const orgs = await prisma.organization.findMany({
      include: {
        SchoolAdmin: { select: { nombre: true, email: true, rol: true } }
      }
    });

    orgs.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name}`);
      console.log(`   Admin: ${org.SchoolAdmin?.nombre} (${org.SchoolAdmin?.email})`);
      console.log(`   Rol Admin: ${org.SchoolAdmin?.rol}`);
      console.log('');
    });

    // 4. Verificar school admins
    console.log('='.repeat(70));
    console.log('\n👤 USUARIOS SCHOOL_ADMIN\n');
    
    const admins = await prisma.usuario.findMany({
      where: { rol: 'SCHOOL_ADMIN' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true
      }
    });

    if (admins.length === 0) {
      console.log('⚠️  NO HAY USUARIOS CON ROL SCHOOL_ADMIN');
    } else {
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.nombre} (${admin.email})`);
        console.log(`   Organization ID: ${admin.organizationId || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
