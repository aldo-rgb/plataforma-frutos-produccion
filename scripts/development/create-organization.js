const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOrganization() {
  try {
    // Verificar si existe el usuario 94 (Director)
    const director = await prisma.usuario.findUnique({
      where: { id: 94 },
      select: { id: true, nombre: true, email: true }
    });

    if (!director) {
      console.log('❌ Usuario 94 (Director) no encontrado');
      return;
    }

    console.log('✅ Director encontrado:', director);

    // Crear organización
    const organization = await prisma.organization.create({
      data: {
        name: 'Organización Demo',
        slug: 'organizacion-demo',
        contactEmail: director.email,
        schoolAdminId: director.id,
        brandColor: '#6366F1',
        totalLicenses: 100,
        activeLicenses: 0,
        totalStudents: 0,
        updatedAt: new Date()
      }
    });

    console.log('✅ Organización creada:', organization);

    // Actualizar el usuario para asociarlo con la organización
    await prisma.usuario.update({
      where: { id: director.id },
      data: { organizationId: organization.id }
    });

    console.log('✅ Usuario actualizado con organizationId:', organization.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createOrganization();
