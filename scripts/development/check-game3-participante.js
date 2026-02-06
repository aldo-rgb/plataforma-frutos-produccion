const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGame3VisionParticipante() {
  try {
    console.log('🔍 Investigando asignaciones de game3@quanter.com en VisionParticipante...\n');
    
    const participaciones = await prisma.visionParticipante.findMany({
      where: { participanteId: 31 },
      include: {
        Vision: {
          select: { 
            id: true,
            nombre: true, 
            organizationId: true,
            coordinadorId: true,
            Coordinador: {
              select: {
                nombre: true,
                email: true,
                organizationId: true
              }
            }
          }
        },
        AsignadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            organizationId: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (participaciones.length === 0) {
      console.log('❌ No se encontraron asignaciones en VisionParticipante');
      return;
    }

    console.log(`📋 Encontradas ${participaciones.length} asignación(es):\n`);
    
    participaciones.forEach((part, i) => {
      console.log(`━━━ Asignación ${i + 1} ━━━`);
      console.log('Visión:', part.Vision.nombre);
      console.log('  Visión ID:', part.visionId);
      console.log('  Visión Org ID:', part.Vision.organizationId);
      console.log('');
      console.log('Coordinador de la visión:');
      console.log('  Nombre:', part.Vision.Coordinador?.nombre || 'N/A');
      console.log('  Email:', part.Vision.Coordinador?.email || 'N/A');
      console.log('  Org ID:', part.Vision.Coordinador?.organizationId || 'N/A');
      console.log('');
      console.log('Asignado por:');
      console.log('  ID:', part.asignadoPorId);
      console.log('  Nombre:', part.AsignadoPor?.nombre || 'Desconocido');
      console.log('  Email:', part.AsignadoPor?.email || 'Desconocido');
      console.log('  Rol:', part.AsignadoPor?.rol || 'Desconocido');
      console.log('  Org ID:', part.AsignadoPor?.organizationId || 'Desconocido');
      console.log('');
      console.log('Fechas:');
      console.log('  Creado:', part.createdAt);
      console.log('  Actualizado:', part.updatedAt);
      console.log('');
    });

    // ANÁLISIS
    console.log('\n━━━ ANÁLISIS ━━━');
    const primeraAsignacion = participaciones[0];
    
    if (primeraAsignacion.Vision.organizationId !== primeraAsignacion.AsignadoPor?.organizationId) {
      console.log('🚨 ALERTA: La visión y quien asignó NO pertenecen a la misma organización');
      console.log(`   Visión: Org ${primeraAsignacion.Vision.organizationId}`);
      console.log(`   Asignador: Org ${primeraAsignacion.AsignadoPor?.organizationId}`);
    } else {
      console.log('✅ La visión y quien asignó pertenecen a la misma organización');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame3VisionParticipante();
