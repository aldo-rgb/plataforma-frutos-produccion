const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function toggleLeaderApproval() {
  try {
    // Buscar el líder actual
    const leader = await prisma.usuario.findFirst({
      where: {
        email: 'mentor@next.com'
      },
      include: {
        PerfilMentor: {
          select: {
            biografia: true
          }
        }
      }
    });

    if (!leader) {
      console.log('❌ No se encontró el líder mentor@next.com');
      return;
    }

    console.log(`\n👤 Líder encontrado: ${leader.nombre}`);
    console.log(`Estado actual: ${leader.mentorMarketplaceApproved ? '✅ APROBADO' : '❌ NO APROBADO'}`);
    console.log(`Biografía: ${leader.PerfilMentor?.biografia ? 'Sí tiene (' + leader.PerfilMentor.biografia.length + ' caracteres)' : 'NO TIENE'}`);
    
    // Cambiar el estado
    const newStatus = !leader.mentorMarketplaceApproved;
    
    await prisma.usuario.update({
      where: { id: leader.id },
      data: {
        mentorMarketplaceApproved: newStatus
      }
    });

    console.log(`\n✅ Estado actualizado a: ${newStatus ? '✅ APROBADO' : '❌ NO APROBADO (PENDIENTE)'}`);
    
    if (!newStatus) {
      console.log('\n🔔 NOTIFICACIONES QUE DEBERÍAS VER AHORA:\n');
      console.log('1. Como LÍDER (mentor@next.com):');
      console.log('   👉 Ve a http://localhost:3000/dashboard/lider');
      console.log('   👉 Deberías ver un banner azul "📋 Perfil en Revisión"\n');
      
      console.log('2. Como SCHOOL_ADMIN (director@next.com):');
      console.log('   👉 Ve a http://localhost:3000/dashboard/school-admin');
      console.log('   👉 Deberías ver un banner cyan "🔔 1 Líder(es) Pendiente(s) de Autorización"\n');
      
      console.log('💡 IMPORTANTE: Recarga la página con Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)');
    } else {
      console.log('\n✅ El líder ya está aprobado. Las notificaciones NO aparecerán.');
      console.log('💡 Ejecuta este script de nuevo para desaprobar y ver las notificaciones.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

toggleLeaderApproval();
