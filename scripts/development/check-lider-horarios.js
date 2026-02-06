const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLiderHorarios() {
  try {
    console.log('🔍 Verificando horarios del LIDER "Juan Mentor Prueba"...\n');

    // Buscar el LIDER
    const lider = await prisma.usuario.findUnique({
      where: { email: 'mentor@wer.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        organizationId: true,
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          },
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            type: true,
            isActive: true
          }
        }
      }
    });

    if (!lider) {
      console.log('❌ LIDER no encontrado');
      return;
    }

    console.log('👤 LIDER:', lider.nombre, `(${lider.email})`);
    console.log('📍 OrganizationId:', lider.organizationId);
    console.log('✅ Activo:', lider.isActive);
    console.log('📅 Horarios DISCIPLINE activos:', lider.CallAvailability.length);

    if (lider.CallAvailability.length === 0) {
      console.log('\n⚠️  NO TIENE horarios de tipo DISCIPLINE activos');
      
      // Buscar TODOS los horarios
      const todosHorarios = await prisma.callAvailability.findMany({
        where: { userId: lider.id },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          type: true,
          isActive: true
        }
      });
      
      console.log('\n📋 Todos los horarios del LIDER:', todosHorarios.length);
      todosHorarios.forEach(h => {
        console.log(`  - ${h.dayOfWeek}: ${h.startTime} - ${h.endTime} [${h.type}] ${h.isActive ? '✅' : '❌'}`);
      });
    } else {
      console.log('\n✅ Horarios DISCIPLINE activos:');
      lider.CallAvailability.forEach(h => {
        const startHour = parseInt(h.startTime.split(':')[0]);
        const endHour = parseInt(h.endTime.split(':')[0]);
        const esValido = startHour >= 5 && endHour <= 8;
        console.log(`  - ${h.dayOfWeek}: ${h.startTime} - ${h.endTime} ${esValido ? '✅ VÁLIDO' : '❌ FUERA DE RANGO (05:00-08:00)'}`);
      });
    }

    // Verificar paquetes completados para esta visión
    console.log('\n\n💼 Verificando mentores CONTRATADOS para Vision ID: 1...');
    const paquetes = await prisma.mentorPackageOrder.findMany({
      where: {
        visionId: 1,
        status: 'COMPLETED'
      },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            CallAvailability: {
              where: {
                type: 'DISCIPLINE',
                isActive: true
              }
            }
          }
        }
      }
    });

    console.log('📦 Paquetes COMPLETED encontrados:', paquetes.length);
    paquetes.forEach(p => {
      console.log(`\n  Mentor: ${p.Mentor.nombre} (${p.Mentor.email})`);
      console.log(`  Rol: ${p.Mentor.rol}`);
      console.log(`  Cantidad: ${p.cantidad} llamadas`);
      console.log(`  Horarios DISCIPLINE: ${p.Mentor.CallAvailability.length}`);
      if (p.Mentor.CallAvailability.length > 0) {
        p.Mentor.CallAvailability.forEach(h => {
          console.log(`    - ${h.dayOfWeek}: ${h.startTime} - ${h.endTime}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLiderHorarios();
