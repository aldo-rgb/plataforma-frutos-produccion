const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVision1License() {
  try {
    console.log('🔍 Buscando usuario vision1@frutos.com...\n');
    
    const user = await prisma.usuario.findUnique({
      where: { email: 'vision1@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
        licenseCode: true,
        subscriptionStatus: true,
        tier: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('👤 Usuario:', {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      organizationId: user.organizationId,
      organization: user.Organization?.name,
      licenseCode: user.licenseCode,
      subscriptionStatus: user.subscriptionStatus,
      tier: user.tier
    });

    // Buscar license assignment
    const licenseAssignment = await prisma.licenseAssignment.findFirst({
      where: { userId: user.id },
      include: {
        Organization: true,
        Vision: true
      }
    });

    console.log('\n📄 License Assignment:', licenseAssignment);

    // Buscar enrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    console.log('\n📋 Enrollment:', enrollment);

    // Verificar si tiene mentor asignado
    if (enrollment && enrollment.mentorId) {
      console.log('\n✅ Usuario tiene mentor asignado:', enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario);
    } else {
      console.log('\n❌ Usuario NO tiene mentor asignado en el enrollment');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVision1License();
