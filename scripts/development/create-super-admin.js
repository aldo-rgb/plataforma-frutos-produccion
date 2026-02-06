const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔐 Creando ADMINISTRADOR...');

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Paso 1: Crear usuario sin organización primero
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@frutos.com',
        password: hashedPassword,
        rol: 'ADMINISTRADOR',
        tier: 'PREMIUM',
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0,
        nivelActual: 1,
        suscripcion: 'ACTIVO',
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      }
    });

    console.log('✅ Usuario ADMINISTRADOR creado:', admin.id);

    // Paso 2: Crear organización y vincularla al admin
    const organization = await prisma.organization.create({
      data: {
        name: 'Frutos Admin',
        slug: 'admin-org',
        contactEmail: 'admin@frutos.com',
        brandColor: '#6366F1',
        status: 'ACTIVE',
        totalLicenses: 100,
        activeLicenses: 0,
        totalStudents: 0,
        licenseBasicPrice: 1000,
        licenseAdvancedPrice: 2000,
        licensePLPrice: 3000,
        geofenceEnabled: false,
        schoolAdminId: admin.id,
        updatedAt: new Date()
      }
    });

    console.log('✅ Organización creada:', organization.id);

    // Paso 3: Actualizar usuario con la organización
    await prisma.usuario.update({
      where: { id: admin.id },
      data: { organizationId: organization.id }
    });

    console.log('✅ Organización actualizada con schoolAdminId');

    console.log('\n🎉 ¡Usuario ADMINISTRADOR creado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@frutos.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Rol:      ADMINISTRADOR');
    console.log('🏢 Org ID:  ', organization.id);
    console.log('👤 User ID: ', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Ahora puedes iniciar sesión en: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
