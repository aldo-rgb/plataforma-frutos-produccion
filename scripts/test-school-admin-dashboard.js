const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSchoolAdminDashboard() {
  try {
    console.log('🔍 Testing School Admin Dashboard API Logic...\n');

    // Simular la búsqueda del usuario director1@frutos.com (ID: 10)
    const fullUser = await prisma.usuario.findUnique({
      where: { id: 10 },
      select: { id: true, organizationId: true, nombre: true, email: true }
    });

    console.log('👤 Usuario encontrado:', fullUser);

    if (!fullUser?.organizationId) {
      console.error('❌ Usuario no tiene organización asignada');
      return;
    }

    console.log(`\n📊 Buscando organización ID: ${fullUser.organizationId}...\n`);

    // Obtener información de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: fullUser.organizationId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        logoUrl: true,
        brandColor: true,
        Users: {
          where: {
            isActive: true,
            rol: { in: ['PARTICIPANTE', 'ESTUDIANTE', 'MENTOR_IA', 'COORDINADOR', 'GAMECHANGER'] }
          },
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            experienciaXP: true,
            rol: true,
            isActive: true,
            createdAt: true,
          }
        }
      }
    });

    if (!organization) {
      console.error('❌ Organización no encontrada');
      return;
    }

    console.log('✅ Organización encontrada:');
    console.log(`   Nombre: ${organization.name}`);
    console.log(`   Email: ${organization.contactEmail}`);
    console.log(`   Logo: ${organization.logoUrl || '❌ Sin logo'}`);
    console.log(`   Brand Color: ${organization.brandColor || '❌ Sin color'}`);
    console.log(`   Total usuarios: ${organization.Users.length}\n`);

    // Mostrar usuarios
    console.log('👥 USUARIOS DE LA ORGANIZACIÓN:');
    organization.Users.forEach(u => {
      console.log(`   - ${u.nombre} (${u.email}) - ${u.rol} - ${u.tier || 'N/A'} - XP: ${u.experienciaXP || 0}`);
    });

    // Calcular estadísticas
    const totalStudents = organization.Users.filter(u => ['PARTICIPANTE', 'ESTUDIANTE'].includes(u.rol)).length;
    const totalMentors = organization.Users.filter(u => u.rol === 'MENTOR_IA').length;
    const totalUsers = organization.Users.length;

    console.log('\n📈 ESTADÍSTICAS:');
    console.log(`   Total estudiantes: ${totalStudents}`);
    console.log(`   Total mentores: ${totalMentors}`);
    console.log(`   Total usuarios: ${totalUsers}`);

    console.log('\n✅ El API debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchoolAdminDashboard();
