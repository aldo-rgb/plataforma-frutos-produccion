const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Creando usuario administrador...');

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear organización primero
    const organization = await prisma.organization.create({
      data: {
        name: 'Frutos Platform',
        slug: 'frutos-platform',
        contactEmail: 'admin@frutos.com',
        brandColor: '#6366F1',
        totalLicenses: 1000,
        activeLicenses: 0,
        totalStudents: 0,
        schoolAdminId: 1, // Temporal, lo actualizaremos
        updatedAt: new Date()
      }
    });

    console.log('✅ Organización creada:', organization.id);

    // Crear usuario administrador
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@frutos.com',
        password: hashedPassword,
        rol: 'SCHOOL_ADMIN',
        tier: 'PREMIUM',
        organizationId: organization.id,
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0,
        updatedAt: new Date()
      }
    });

    console.log('✅ Usuario administrador creado:', admin.id);

    // Actualizar la organización con el schoolAdminId correcto
    await prisma.organization.update({
      where: { id: organization.id },
      data: { schoolAdminId: admin.id }
    });

    console.log('✅ Organización actualizada con schoolAdminId:', admin.id);

    // Crear una visión de prueba
    const vision = await prisma.vision.create({
      data: {
        nombre: 'Visión Demo 2026',
        descripcion: 'Visión de prueba para la plataforma',
        coordinadorId: admin.id,
        organizationId: organization.id,
        isActive: true,
        maxParticipantes: 50,
        enabledLevels: ['BASIC', 'ADVANCED', 'PL'],
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-07-31'),
        updatedAt: new Date(),
        forceCommunityServiceArea: true,
        forceTransformationArea: true,
        forceFinanzasArea: true,
        forceOcioArea: true,
        forcePazMentalArea: true,
        forceRelacionesArea: true,
        forceSaludArea: true,
        forceTalentosArea: true
      }
    });

    console.log('✅ Visión creada:', vision.id);

    console.log('\n🎉 ¡Todo listo!');
    console.log('📧 Email: admin@frutos.com');
    console.log('🔑 Contraseña: admin123');
    console.log('🏢 Organización ID:', organization.id);
    console.log('👤 Usuario ID:', admin.id);
    console.log('🎯 Visión ID:', vision.id);
    console.log('\n🔗 Accede en: http://localhost:3000/auth/signin');
    console.log('🔗 Signup con org: http://localhost:3000/auth/signup?org=' + organization.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
