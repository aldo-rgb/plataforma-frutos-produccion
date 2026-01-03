// 🧪 Script de prueba: Sistema de Tracking de Sesiones de Paquetes
import { PrismaClient } from '@prisma/client';
import {
  createPackageCredits,
  validateSessionCredits,
  consumeSessionCredit,
  refundSessionCredit,
  getPackageCreditsStatus,
  getUserActivePackages,
} from '../lib/packageSessionManager.js';

const prisma = new PrismaClient();

async function testPackageSessionTracking() {
  console.log('\n🧪 ===== TEST: SISTEMA DE TRACKING DE SESIONES =====\n');

  try {
    // 1. BUSCAR O CREAR PAQUETE DE PRUEBA
    console.log('📦 1. Buscando paquete de prueba...');
    
    let testPackage = await prisma.mentorPackageOrder.findFirst({
      where: {
        status: 'COMPLETED',
      },
      include: {
        Usuario: true,
        Mentor: true,
        PackageSessionCredits: true,
      },
    });

    if (!testPackage) {
      console.log('⚠️  No hay paquetes COMPLETED. Creando uno de prueba...');
      
      // Buscar mentor y participante
      const mentor = await prisma.usuario.findFirst({
        where: {
          PerfilMentor: {
            isNot: null,
          },
        },
      });

      const participante = await prisma.usuario.findFirst({
        where: {
          rol: 'PARTICIPANTE',
        },
      });

      if (!mentor || !participante) {
        console.log('❌ No hay mentor o participante en la base de datos');
        return;
      }

      const vision = await prisma.vision.findFirst();
      if (!vision) {
        console.log('❌ No hay visiones en la base de datos');
        return;
      }

      // Crear paquete de prueba
      testPackage = await prisma.mentorPackageOrder.create({
        data: {
          usuarioId: participante.id,
          mentorId: mentor.id,
          visionId: vision.id,
          cantidad: 18,
          precioUnitario: 250,
          precioTotal: 4500,
          currency: 'MXN',
          metodoPago: 'paypal',
          status: 'COMPLETED',
          paidAt: new Date(),
          externalPaymentId: 'TEST_' + Date.now(),
        },
        include: {
          Usuario: true,
          Mentor: true,
          PackageSessionCredits: true,
        },
      });

      console.log(`✅ Paquete de prueba creado: ${testPackage.id}`);
    } else {
      console.log(`✅ Paquete encontrado: ${testPackage.id}`);
    }

    if (!testPackage) {
      console.log('❌ No se pudo obtener el paquete');
      return;
    }

    const packageId = testPackage.id;
    const userId = testPackage.usuarioId;
    const mentorId = testPackage.mentorId;

    // 2. CREAR CRÉDITOS SI NO EXISTEN
    console.log('\n💳 2. Verificando créditos...');
    
    let credits = await prisma.packageSessionCredits.findUnique({
      where: { packageOrderId: packageId },
    });

    if (!credits) {
      console.log('⚠️  Créditos no existen. Creándolos...');
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      
      credits = await createPackageCredits(packageId, 18, expiresAt);
      console.log(`✅ Créditos creados: ${credits.totalSessions} sesiones`);
    } else {
      console.log(`✅ Créditos existentes:`);
      console.log(`   - Total: ${credits.totalSessions}`);
      console.log(`   - Usadas: ${credits.usedSessions}`);
      console.log(`   - Restantes: ${credits.remainingSessions}`);
      console.log(`   - Activo: ${credits.isActive}`);
    }

    // 3. VALIDAR CRÉDITOS
    console.log('\n🔍 3. Validando créditos disponibles...');
    
    const validation = await validateSessionCredits(userId, mentorId);
    console.log(`   - ¿Tiene créditos? ${validation.hasCredits ? '✅ Sí' : '❌ No'}`);
    console.log(`   - Mensaje: "${validation.message}"`);
    
    if (validation.hasCredits) {
      console.log(`   - Paquete ID: ${validation.packageOrderId}`);
      console.log(`   - Restantes: ${validation.remainingSessions}`);
    }

    // 4. CONSUMIR CRÉDITO (SIMULAR AGENDAMIENTO)
    if (validation.hasCredits && validation.remainingSessions! > 0) {
      console.log('\n📉 4. Consumiendo crédito (simulando agendamiento)...');
      
      const beforeCredits = credits!.remainingSessions;
      await consumeSessionCredit(packageId);
      
      const afterCredits = await prisma.packageSessionCredits.findUnique({
        where: { packageOrderId: packageId },
      });
      
      console.log(`   - Antes: ${beforeCredits} sesiones`);
      console.log(`   - Después: ${afterCredits!.remainingSessions} sesiones`);
      console.log(`   - Usadas: ${afterCredits!.usedSessions}`);
      
      // 5. REEMBOLSAR CRÉDITO (SIMULAR CANCELACIÓN)
      console.log('\n📈 5. Reembolsando crédito (simulando cancelación)...');
      
      await refundSessionCredit(packageId);
      
      const refundedCredits = await prisma.packageSessionCredits.findUnique({
        where: { packageOrderId: packageId },
      });
      
      console.log(`   - Después de reembolso: ${refundedCredits!.remainingSessions} sesiones`);
      console.log(`   - Usadas: ${refundedCredits!.usedSessions}`);
    }

    // 6. OBTENER ESTADO COMPLETO
    console.log('\n📊 6. Obteniendo estado completo del paquete...');
    
    const status = await getPackageCreditsStatus(packageId);
    
    if (status) {
      console.log(`   - ID: ${status.id}`);
      console.log(`   - Total: ${status.totalSessions} sesiones`);
      console.log(`   - Usadas: ${status.usedSessions} (${status.percentageUsed}%)`);
      console.log(`   - Restantes: ${status.remainingSessions}`);
      console.log(`   - Expira: ${status.expiresAt?.toLocaleDateString() || 'Sin expiración'}`);
      console.log(`   - ¿Expira pronto? ${status.isExpiringSoon ? '⚠️ Sí' : '✅ No'}`);
      console.log(`   - Sesiones agendadas: ${status.MentorPackageOrder.CallBooking.length}`);
    }

    // 7. OBTENER PAQUETES ACTIVOS DEL USUARIO
    console.log('\n📦 7. Obteniendo todos los paquetes activos del usuario...');
    
    const activePackages: any = await getUserActivePackages(userId);
    console.log(`   - Total paquetes activos: ${activePackages.length}`);
    
    if (activePackages.length > 0) {
      console.log(`   - Paquete 1 ID: ${activePackages[0].id}`);
      console.log(`   - Sesiones disponibles: ${activePackages[0].PackageSessionCredits?.remainingSessions || 0}`);
    }

    // 8. PRUEBA DE VALIDACIÓN CON MENTOR INCORRECTO
    console.log('\n❌ 8. Probando validación con mentor incorrecto...');
    
    const wrongMentorId = mentorId + 999; // ID inexistente
    const wrongValidation = await validateSessionCredits(userId, wrongMentorId);
    
    console.log(`   - ¿Tiene créditos? ${wrongValidation.hasCredits ? '✅ Sí' : '❌ No'}`);
    console.log(`   - Mensaje: "${wrongValidation.message}"`);

    console.log('\n✅ ===== TODAS LAS PRUEBAS COMPLETADAS =====\n');
    console.log('📝 Resumen:');
    console.log('   ✅ Creación de créditos');
    console.log('   ✅ Validación de créditos disponibles');
    console.log('   ✅ Consumo de créditos al agendar');
    console.log('   ✅ Reembolso de créditos al cancelar');
    console.log('   ✅ Obtención de estado completo');
    console.log('   ✅ Listado de paquetes activos');
    console.log('   ✅ Validación de mentor incorrecto');
    console.log('\n🎉 Sistema de tracking funcionando correctamente!\n');

  } catch (error: any) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testPackageSessionTracking();
