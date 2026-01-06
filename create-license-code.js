// Script para crear códigos de licencia de prueba
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestLicenseCode() {
  try {
    // Buscar un usuario admin
    const adminUser = await prisma.usuario.findFirst({
      where: {
        rol: { in: ['SUPER_ADMIN', 'ADMINISTRADOR', 'SCHOOL_ADMIN'] }
      }
    });

    if (!adminUser) {
      console.log('❌ No se encontró un usuario admin');
      return;
    }

    console.log('✅ Usando admin:', adminUser.nombre);

    // Crear código de prueba
    const code = await prisma.licenseCode.create({
      data: {
        code: 'MENTORANTFHA', // Sin guiones
        type: 'MENTOR_MEMBERSHIP',
        createdBy: adminUser.id,
        notes: 'Código de prueba para membresía de mentor (sin guiones)',
        // Expira en 1 año
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    console.log('✅ Código creado exitosamente:');
    console.log(`   📋 Código: ${code.code}`);
    console.log(`   🏷️  Tipo: ${code.type}`);
    console.log(`   ⏰ Expira: ${code.expiresAt.toLocaleDateString()}`);
    console.log('');
    console.log('🎉 Ahora puedes usar este código en el modal!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLicenseCode();
