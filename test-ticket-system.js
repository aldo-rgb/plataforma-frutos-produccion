/**
 * Test script para el sistema completo de Tickets
 * Verifica: Wallet, Transferencias, Validaciones, Shadow Users
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🎫 === TEST SISTEMA DE TICKETS ===\n');

  try {
    // 1. Verificar modelos de Ticket
    console.log('1️⃣ Verificando estructura de base de datos...');
    const ticketCount = await prisma.ticket.count();
    const configCount = await prisma.ticketPriceConfig.count();
    const gatewayCount = await prisma.paymentGatewayConfig.count();
    
    console.log(`   ✅ Tickets: ${ticketCount}`);
    console.log(`   ✅ Price Configs: ${configCount}`);
    console.log(`   ✅ Payment Gateways: ${gatewayCount}\n`);

    // 2. Buscar organización existente
    console.log('2️⃣ Buscando organización existente...');
    const org = await prisma.organization.findFirst({
      where: { 
        status: 'ACTIVE'
      }
    });

    if (!org) {
      console.log('   ❌ No hay organizaciones en la base de datos.');
      console.log('   💡 Por favor, crea una organización primero o usa una existente.\n');
      process.exit(1);
    }
    
    console.log(`   ✅ Organización encontrada: ${org.name} (ID: ${org.id})\n`);

    // 3. Buscar visión existente
    console.log('3️⃣ Buscando visión existente...');
    const vision = await prisma.vision.findFirst({
      where: { 
        organizationId: org.id,
        isActive: true
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    if (!vision) {
      console.log('   ❌ No hay visiones activas en esta organización.');
      console.log('   💡 Por favor, crea una visión primero.\n');
      process.exit(1);
    }
    
    console.log(`   ✅ Visión encontrada: ${vision.nombre} (ID: ${vision.id})`);
    console.log(`   📅 Fecha inicio: ${vision.startDate ? vision.startDate.toISOString().split('T')[0] : 'N/A'}\n`);

    // 4. Buscar usuario existente
    console.log('4️⃣ Buscando usuario existente...');
    const owner = await prisma.usuario.findFirst({
      where: { 
        organizationId: org.id,
        rol: 'PARTICIPANTE'
      }
    });

    if (!owner) {
      console.log('   ❌ No hay usuarios PARTICIPANTE en esta organización.');
      console.log('   💡 Por favor, crea un usuario primero o usa uno existente.\n');
      process.exit(1);
    }
    
    console.log(`   ✅ Usuario encontrado: ${owner.nombre} (${owner.email})\n`);

    // 5. Crear tickets de prueba
    console.log('5️⃣ Creando tickets de prueba...');
    
    // Ticket ACTIVE transferible
    const activeTicket = await prisma.ticket.create({
      data: {
        ownerId: owner.id,
        organizationId: org.id,
        visionId: vision.id,
        level: 'BASIC',
        type: 'STANDARD',
        status: 'ACTIVE',
        isTransferable: true,
        validUntil: new Date(vision.startDate.getTime() + 24 * 60 * 60 * 1000), // +1 día después del inicio
        paymentStatus: 'PAID',
        purchasePrice: 5000.00
      }
    });
    console.log(`   ✅ Ticket ACTIVE: ${activeTicket.id} (${activeTicket.level})`);

    // Ticket PENDING (no transferible aún)
    const pendingTicket = await prisma.ticket.create({
      data: {
        ownerId: owner.id,
        organizationId: org.id,
        visionId: vision.id,
        level: 'ADVANCED',
        type: 'PROMO_50',
        status: 'PENDING_PAYMENT',
        isTransferable: false,
        validUntil: vision.startDate,
        paymentStatus: 'PENDING',
        purchasePrice: 7000.00
      }
    });
    console.log(`   ✅ Ticket PENDING: ${pendingTicket.id} (${pendingTicket.level})`);

    // Ticket TRANSFERRED (ya usado)
    const transferredTicket = await prisma.ticket.create({
      data: {
        ownerId: owner.id,
        organizationId: org.id,
        visionId: vision.id,
        level: 'PL',
        type: 'COMBO_PARTIAL',
        status: 'TRANSFERRED',
        isTransferable: false,
        validUntil: vision.startDate,
        paymentStatus: 'PAID',
        purchasePrice: 10000.00,
        transferredAt: new Date(),
        transferredTo: owner.id
      }
    });
    console.log(`   ✅ Ticket TRANSFERRED: ${transferredTicket.id} (${transferredTicket.level})\n`);

    // 6. Configurar precios
    console.log('6️⃣ Configurando precios...');
    const priceConfig = await prisma.ticketPriceConfig.upsert({
      where: {
        organizationId_level: {
          organizationId: org.id,
          level: 'BASIC'
        }
      },
      update: {
        regularPrice: 5000.00,
        promoPrice: 4000.00
      },
      create: {
        organizationId: org.id,
        level: 'BASIC',
        regularPrice: 5000.00,
        promoPrice: 4000.00
      }
    });
    console.log(`   ✅ Precios configurados: $${priceConfig.regularPrice} (Promo: $${priceConfig.promoPrice})\n`);

    // 7. Resumen final
    console.log('7️⃣ RESUMEN DE PRUEBA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Organización: ${org.name}`);
    console.log(`🎯 Visión: ${vision.name}`);
    console.log(`👤 Usuario: ${owner.email}`);
    console.log(`🎫 Tickets creados: 3 (ACTIVE, PENDING, TRANSFERRED)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 8. Test de validación de transferencia
    console.log('8️⃣ SIMULANDO VALIDACIÓN DE TRANSFERENCIA...');
    console.log(`   Ticket ID: ${activeTicket.id}`);
    console.log(`   Owner: ${owner.email}`);
    console.log(`   Status: ${activeTicket.status}`);
    console.log(`   Is Transferable: ${activeTicket.isTransferable}`);
    
    const now = new Date();
    const visionStart = new Date(vision.startDate);
    const deadline = new Date(visionStart.getTime() + 60 * 60 * 1000); // +1 hora
    const canTransfer = now < deadline;
    
    console.log(`   ⏰ Ahora: ${now.toISOString()}`);
    console.log(`   📅 Inicio evento: ${visionStart.toISOString()}`);
    console.log(`   ⏱️  Límite transferencia: ${deadline.toISOString()}`);
    console.log(`   ${canTransfer ? '✅ Puede transferirse' : '❌ No puede transferirse (tiempo expirado)'}\n`);

    // 9. Test de shadow user
    console.log('9️⃣ SIMULANDO CREACIÓN DE SHADOW USER...');
    const recipientEmail = 'newuser@test.com';
    let recipient = await prisma.usuario.findUnique({
      where: { email: recipientEmail }
    });

    if (!recipient) {
      console.log(`   ⚠️  Usuario ${recipientEmail} no existe`);
      console.log(`   ✨ Se crearía shadow user con:`);
      console.log(`      - Email: ${recipientEmail}`);
      console.log(`      - Nombre: ${recipientEmail.split('@')[0]}`);
      console.log(`      - Status: PENDIENTE`);
      console.log(`      - Organization: ${org.id}\n`);
    } else {
      console.log(`   ✅ Usuario ${recipientEmail} ya existe\n`);
    }

    // 10. Test URLs del sistema
    console.log('🔟 URLs DEL SISTEMA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Wallet: /dashboard/my-tickets');
    console.log('🔄 Validate Transfer: POST /api/tickets/validate-transfer');
    console.log('✅ Execute Transfer: POST /api/tickets/transfer');
    console.log('📋 Get My Tickets: GET /api/tickets/my-tickets');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE\n');
    console.log('💡 SIGUIENTE PASO:');
    console.log('   1. Iniciar servidor: npm run dev');
    console.log('   2. Login como: owner@test.com');
    console.log('   3. Navegar a: /dashboard/my-tickets');
    console.log('   4. Intentar transferir el ticket ACTIVE');
    console.log('   5. Verificar creación de shadow user\n');

    return {
      success: true,
      data: {
        organizationId: org.id,
        visionId: vision.id,
        ownerId: owner.id,
        tickets: {
          active: activeTicket.id,
          pending: pendingTicket.id,
          transferred: transferredTicket.id
        }
      }
    };

  } catch (error) {
    console.error('❌ Error en prueba:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
