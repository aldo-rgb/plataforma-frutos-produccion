const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🔄 Iniciando limpieza de base de datos...\n');

    // 1. Obtener todos los administradores y super administradores
    const admins = await prisma.usuario.findMany({
      where: {
        rol: {
          in: ['ADMINISTRADOR', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true
      }
    });

    console.log(`✅ Administradores encontrados (${admins.length}):`);
    admins.forEach(admin => {
      console.log(`   - ${admin.nombre} (${admin.email}) - ${admin.rol}`);
    });
    console.log('');

    const adminIds = admins.map(admin => admin.id);

    // 2. ELIMINAR DATOS EN ORDEN (respetando dependencias)
    
    console.log('🗑️  Eliminando datos de usuarios no-admin...\n');

    // Evidencias - Filtrar por usuarioId directamente
    const deletedEvidencias = await prisma.evidencia.deleteMany({
      where: {
        usuarioId: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Evidencias eliminadas: ${deletedEvidencias.count}`);

    // Tareas - Necesitamos obtener IDs de cartas de no-admins primero
    const nonAdminCartas = await prisma.cartaFrutos.findMany({
      where: {
        usuarioId: {
          notIn: adminIds
        }
      },
      select: { id: true }
    });
    const nonAdminCartaIds = nonAdminCartas.map(c => c.id);

    const deletedTareas = await prisma.tarea.deleteMany({
      where: {
        cartaId: {
          in: nonAdminCartaIds
        }
      }
    });
    console.log(`   ✓ Tareas eliminadas: ${deletedTareas.count}`);

    // Metas de no-admins
    const nonAdminMetas = await prisma.meta.findMany({
      where: {
        cartaId: {
          in: nonAdminCartaIds
        }
      },
      select: { id: true }
    });
    const nonAdminMetaIds = nonAdminMetas.map(m => m.id);

    // Acciones
    const deletedAcciones = await prisma.accion.deleteMany({
      where: {
        metaId: {
          in: nonAdminMetaIds
        }
      }
    });
    console.log(`   ✓ Acciones eliminadas: ${deletedAcciones.count}`);

    // Metas
    const deletedMetas = await prisma.meta.deleteMany({
      where: {
        cartaId: {
          in: nonAdminCartaIds
        }
      }
    });
    console.log(`   ✓ Metas eliminadas: ${deletedMetas.count}`);

    // CartasFrutos
    const deletedCartas = await prisma.cartaFrutos.deleteMany({
      where: {
        usuarioId: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Cartas eliminadas: ${deletedCartas.count}`);

    // Phoenix Sessions
    const deletedPhoenixSessions = await prisma.phoenixSession.deleteMany({
      where: {
        usuarioId: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Phoenix Sessions eliminadas: ${deletedPhoenixSessions.count}`);

    // Solicitudes de Mentoría (eliminar todas)
    const deletedSolicitudes = await prisma.solicitudMentoria.deleteMany({});
    console.log(`   ✓ Solicitudes de mentoría eliminadas: ${deletedSolicitudes.count}`);

    // Aplicaciones de Mentor
    const deletedApplications = await prisma.mentorApplication.deleteMany({
      where: {
        usuarioId: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Aplicaciones de mentor eliminadas: ${deletedApplications.count}`);

    // Reseñas de Mentoría (eliminar todas)
    const deletedResenas = await prisma.resenasMentoria.deleteMany({});
    console.log(`   ✓ Reseñas eliminadas: ${deletedResenas.count}`);

    // Mentor Alerts (eliminar todas)
    const deletedAlerts = await prisma.mentorAlert.deleteMany({});
    console.log(`   ✓ Alertas de mentor eliminadas: ${deletedAlerts.count}`);

    // Notificaciones
    const deletedNotificaciones = await prisma.notification.deleteMany({
      where: {
        userId: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Notificaciones eliminadas: ${deletedNotificaciones.count}`);

    // Configuración de Áreas (eliminar todas)
    const deletedAreasConfig = await prisma.areaConfig.deleteMany({});
    console.log(`   ✓ Configuraciones de áreas eliminadas: ${deletedAreasConfig.count}`);

    // Vision relacionados (primero lo que depende)
    const deletedVisionGameChangers = await prisma.visionGameChanger.deleteMany({});
    console.log(`   ✓ Vision GameChangers eliminados: ${deletedVisionGameChangers.count}`);

    const deletedVisionMentors = await prisma.visionMentor.deleteMany({});
    console.log(`   ✓ Vision Mentors eliminados: ${deletedVisionMentors.count}`);

    const deletedVisionParticipantes = await prisma.visionParticipante.deleteMany({});
    console.log(`   ✓ Vision Participantes eliminados: ${deletedVisionParticipantes.count}`);

    const deletedVisionEscrow = await prisma.visionEscrow.deleteMany({});
    console.log(`   ✓ Vision Escrows eliminados: ${deletedVisionEscrow.count}`);

    const deletedVisionRefunds = await prisma.visionRefund.deleteMany({});
    console.log(`   ✓ Vision Refunds eliminados: ${deletedVisionRefunds.count}`);

    // LicenseOrder (depende de Organization)
    const deletedLicenseOrders = await prisma.licenseOrder.deleteMany({});
    console.log(`   ✓ License Orders eliminadas: ${deletedLicenseOrders.count}`);

    // Organizaciones y Visiones (principales)
    const deletedOrganizaciones = await prisma.organization.deleteMany({});
    console.log(`   ✓ Organizaciones eliminadas: ${deletedOrganizaciones.count}`);

    const deletedOrganizationWallets = await prisma.organizationWallet.deleteMany({});
    console.log(`   ✓ Organization Wallets eliminados: ${deletedOrganizationWallets.count}`);

    const deletedVisiones = await prisma.vision.deleteMany({});
    console.log(`   ✓ Visiones eliminadas: ${deletedVisiones.count}`);

    // Usuarios no-admin
    const deletedUsuarios = await prisma.usuario.deleteMany({
      where: {
        id: {
          notIn: adminIds
        }
      }
    });
    console.log(`   ✓ Usuarios eliminados: ${deletedUsuarios.count}\n`);

    // 3. Resetear datos de administradores (opcional - mantener sus cartas pero limpiar datos temporales)
    console.log('🔧 Limpiando datos temporales de administradores...\n');

    // Limpiar evidencias de admins (completado=false)
    const adminEvidencias = await prisma.evidencia.deleteMany({
      where: {
        usuarioId: {
          in: adminIds
        },
        completado: false
      }
    });
    console.log(`   ✓ Evidencias no completadas de admin eliminadas: ${adminEvidencias.count}`);

    // Limpiar notificaciones de admins
    const adminNotificaciones = await prisma.notification.deleteMany({
      where: {
        userId: {
          in: adminIds
        }
      }
    });
    console.log(`   ✓ Notificaciones de admin eliminadas: ${adminNotificaciones.count}`);

    console.log('\n✅ ¡Base de datos limpiada exitosamente!');
    console.log(`\n📊 Resumen:`);
    console.log(`   • Administradores conservados: ${admins.length}`);
    console.log(`   • Usuarios eliminados: ${deletedUsuarios.count}`);
    console.log(`   • Organizaciones eliminadas: ${deletedOrganizaciones.count}`);
    console.log(`   • Visiones eliminadas: ${deletedVisiones.count}`);
    console.log(`   • Total de registros eliminados: ${
      deletedEvidencias.count +
      deletedTareas.count +
      deletedAcciones.count +
      deletedMetas.count +
      deletedCartas.count +
      deletedPhoenixSessions.count +
      deletedSolicitudes.count +
      deletedApplications.count +
      deletedResenas.count +
      deletedAlerts.count +
      deletedNotificaciones.count +
      deletedAreasConfig.count +
      deletedVisionGameChangers.count +
      deletedVisionMentors.count +
      deletedVisionParticipantes.count +
      deletedVisionEscrow.count +
      deletedVisionRefunds.count +
      deletedLicenseOrders.count +
      deletedOrganizaciones.count +
      deletedOrganizationWallets.count +
      deletedVisiones.count +
      deletedUsuarios.count
    }`);
    console.log('\n🎯 La plataforma está lista para usuarios reales!\n');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar con confirmación
console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los usuarios excepto ADMINISTRADOR y SUPER_ADMIN.\n');
console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');

setTimeout(() => {
  resetDatabase()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}, 5000);
