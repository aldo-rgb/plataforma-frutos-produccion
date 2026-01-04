const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookings() {
  try {
    console.log('🔍 Probando query de bookings...\n');
    
    const bookings = await prisma.callBooking.findMany({
      take: 2,
      include: {
        Usuario_CallBooking_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true
          }
        },
        Usuario_CallBooking_studentIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'desc'
      }
    });

    console.log(`✅ Encontrados ${bookings.length} bookings`);
    
    if (bookings.length > 0) {
      const b = bookings[0];
      console.log('\n📋 Primer booking:');
      console.log('ID:', b.id);
      console.log('Fecha:', b.scheduledAt);
      console.log('Type:', b.type);
      console.log('Status:', b.status);
      console.log('Mentor:', b.Usuario_CallBooking_mentorIdToUsuario?.nombre);
      console.log('Student:', b.Usuario_CallBooking_studentIdToUsuario?.nombre);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testBookings();
