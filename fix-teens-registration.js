// Script para arreglar el registro de teens que pagó por MercadoPago pero no se procesó
// Ejecutar con: node fix-teens-registration.js

const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixRegistration() {
  try {
    console.log('🔍 Buscando registros pendientes para el evento 73 (teens) con MercadoPago...\n');

    // Buscar registros que pagaron por MercadoPago pero están pendientes
    const pendingRegistrations = await prisma.eventRegistration.findMany({
      where: {
        productId: 73,
        paymentProvider: 'mercadopago',
        status: { not: 'REGISTERED' }
      },
      include: {
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            basePrice: true,
            promoPrice: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Encontrados ${pendingRegistrations.length} registros pendientes:\n`);

    for (const reg of pendingRegistrations) {
      console.log(`ID: ${reg.id}`);
      console.log(`  Nombre: ${reg.nombre}`);
      console.log(`  Email: ${reg.email}`);
      console.log(`  Teléfono: ${reg.telefono || 'N/A'}`);
      console.log(`  Estado: ${reg.status}`);
      console.log(`  PaymentStatus: ${reg.paymentStatus}`);
      console.log(`  SessionId: ${reg.paymentSessionId}`);
      console.log(`  Creado: ${reg.createdAt}`);
      console.log('---');
    }

    if (pendingRegistrations.length === 0) {
      console.log('✅ No hay registros pendientes de MercadoPago para el evento 73');
      return;
    }

    // Para procesar automáticamente, descomenta el siguiente código:
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n¿Quieres procesar estos registros? (ingresa el ID o "todos" o "n" para cancelar): ', async (answer) => {
      if (answer.toLowerCase() === 'n') {
        console.log('Cancelado.');
        rl.close();
        await prisma.$disconnect();
        return;
      }

      let registrationsToProcess = [];
      
      if (answer.toLowerCase() === 'todos') {
        registrationsToProcess = pendingRegistrations;
      } else {
        const id = parseInt(answer);
        const reg = pendingRegistrations.find(r => r.id === id);
        if (reg) {
          registrationsToProcess = [reg];
        } else {
          console.log('ID no encontrado');
          rl.close();
          await prisma.$disconnect();
          return;
        }
      }

      for (const registration of registrationsToProcess) {
        console.log(`\n🔧 Procesando registro ${registration.id} - ${registration.nombre}...`);
        
        // Calcular monto
        const amountPaid = registration.SchoolProduct.promoPrice 
          ? Number(registration.SchoolProduct.promoPrice) 
          : Number(registration.SchoolProduct.basePrice);

        // Buscar o crear usuario
        let payerUser = await prisma.usuario.findUnique({
          where: { email: registration.email.toLowerCase() },
          select: { id: true, nombre: true, referralCode: true }
        });

        if (!payerUser) {
          console.log('👤 Creando nuevo usuario...');
          const defaultPassword = 'Quantum123.';
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          
          // Generar referralCode único
          const timestamp = Date.now().toString(36).toUpperCase();
          const random = Math.random().toString(36).substring(2, 6).toUpperCase();
          const namePrefix = registration.nombre.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
          const referralCode = `${namePrefix}${timestamp}${random}`;

          payerUser = await prisma.usuario.create({
            data: {
              nombre: registration.nombre,
              email: registration.email.toLowerCase(),
              telefono: registration.telefono || null,
              password: hashedPassword,
              organizationId: registration.organizationId,
              isActive: true,
              rol: 'PARTICIPANTE',
              referralCode,
            },
            select: { id: true, nombre: true, referralCode: true }
          });
          console.log(`✅ Usuario creado: ID ${payerUser.id}`);
        } else {
          console.log(`✅ Usuario existente: ID ${payerUser.id}`);
        }

        // Generar ticket code
        const ticketCode = `TKT-${registration.id}-${Date.now().toString(36).toUpperCase()}`;

        // Actualizar registro
        await prisma.eventRegistration.update({
          where: { id: registration.id },
          data: {
            status: 'REGISTERED',
            paymentStatus: 'PAID',
            amountPaid: new Decimal(amountPaid),
            paidAt: new Date(),
            ticketCode,
            userId: payerUser.id,
          }
        });

        // Incrementar contador
        await prisma.schoolProduct.update({
          where: { id: registration.productId },
          data: {
            currentEnrollment: { increment: 1 },
          }
        });

        console.log(`🎫 Registro completado! Ticket: ${ticketCode}`);
        console.log(`   Email: ${registration.email}`);
        console.log(`   Monto: $${amountPaid}`);
      }

      console.log('\n✅ Proceso completado!');
      rl.close();
      await prisma.$disconnect();
    });

  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

fixRegistration();
