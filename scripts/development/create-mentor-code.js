// Script para crear un código de mentor de prueba
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMentorCode() {
  try {
    // Generar código aleatorio
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const codigo = `MENTOR-${randomPart}`;

    console.log('🔧 Generando nuevo código de mentor...');
    console.log('');

    // Crear el código en CodigoAcceso
    const newCode = await prisma.codigoAcceso.create({
      data: {
        codigo: codigo,
        tipo: 'MEMBRESIA_MENTOR',
        descripcion: 'Código de prueba para membresía de mentor',
        estado: 'DISPONIBLE'
      }
    });

    console.log('✅ Código creado exitosamente:');
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log(`║  CÓDIGO: ${newCode.codigo.padEnd(27)}║`);
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Tipo: ${newCode.tipo.padEnd(30)}║`);
    console.log(`║  Estado: ${newCode.estado.padEnd(28)}║`);
    console.log(`║  Creado: ${newCode.createdAt.toLocaleString('es-MX').padEnd(27)}║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('🎉 Ahora puedes usar este código en el modal de solicitud de mentor!');
    console.log('');
    console.log('📋 Para copiar el código:');
    console.log(`   ${newCode.codigo}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createMentorCode();
