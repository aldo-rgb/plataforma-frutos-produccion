// test-socket-notification.js - Script para probar las notificaciones en tiempo real
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNotifications() {
  try {
    console.log('\n🧪 INICIANDO PRUEBA DE NOTIFICACIONES SOCKET.IO\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Buscar un participante con evidencias pendientes
    const evidenciasPendientes = await prisma.evidenciaAccion.findMany({
      where: {
        estado: 'PENDIENTE'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Accion: {
          select: {
            texto: true
          }
        }
      },
      take: 1
    });

    if (evidenciasPendientes.length === 0) {
      console.log('⚠️  No hay evidencias pendientes para probar.');
      console.log('   Creando evidencia de prueba...\n');

      // Buscar un participante
      const participante = await prisma.usuario.findFirst({
        where: {
          rol: 'PARTICIPANTE',
          isActive: true
        }
      });

      if (!participante) {
        console.log('❌ No hay participantes en la base de datos');
        return;
      }

      // Buscar una acción del participante
      const carta = await prisma.cartaFrutos.findFirst({
        where: {
          usuarioId: participante.id
        },
        include: {
          Meta: {
            include: {
              Accion: true
            }
          }
        }
      });

      if (!carta || !carta.Meta || carta.Meta.length === 0 || !carta.Meta[0].Accion || carta.Meta[0].Accion.length === 0) {
        console.log('❌ El participante no tiene acciones configuradas');
        return;
      }

      const accion = carta.Meta[0].Accion[0];

      // Crear evidencia de prueba
      const nuevaEvidencia = await prisma.evidenciaAccion.create({
        data: {
          usuarioId: participante.id,
          accionId: accion.id,
          metaId: carta.Meta[0].id,
          fotoUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
          descripcion: 'Evidencia de prueba para Socket.IO',
          estado: 'PENDIENTE',
          fechaSubida: new Date()
        },
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          Accion: {
            select: {
              texto: true
            }
          }
        }
      });

      evidenciasPendientes.push(nuevaEvidencia);
      console.log(`✅ Evidencia de prueba creada (ID: ${nuevaEvidencia.id})\n`);
    }

    const evidencia = evidenciasPendientes[0];

    console.log('📋 DATOS DE LA PRUEBA:');
    console.log(`   Evidencia ID: ${evidencia.id}`);
    console.log(`   Usuario: ${evidencia.Usuario.nombre} (ID: ${evidencia.Usuario.id})`);
    console.log(`   Email: ${evidencia.Usuario.email}`);
    console.log(`   Acción: ${evidencia.Accion?.texto || 'Sin descripción'}`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 INSTRUCCIONES PARA PROBAR:\n');
    console.log('1. Abre el navegador en: http://localhost:3000');
    console.log(`2. Inicia sesión con: ${evidencia.Usuario.email}`);
    console.log('3. Verás el indicador de conexión Socket.IO en la esquina');
    console.log('4. En otra pestaña, inicia sesión como MENTOR');
    console.log('5. Ve a "Revisión de Evidencias" en el dashboard del mentor');
    console.log(`6. Aprueba o rechaza la evidencia ID: ${evidencia.id}`);
    console.log('7. Vuelve a la pestaña del participante');
    console.log('8. Deberías ver aparecer una notificación en tiempo real!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 TAMBIÉN PUEDES PROBAR CON CURL:\n');
    console.log('Para aprobar:');
    console.log(`curl -X PUT http://localhost:3000/api/mentor/evidencia/${evidencia.id}/aprobar \\`);
    console.log(`  -H "Content-Type: application/json"`);
    console.log('');
    console.log('Para rechazar:');
    console.log(`curl -X PUT http://localhost:3000/api/mentor/evidencia/${evidencia.id}/rechazar \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"comentario":"Por favor agrega más detalles"}'`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
