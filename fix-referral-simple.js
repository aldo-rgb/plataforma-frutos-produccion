// Script simple para actualizar usuarios sin código de referido
// Ejecutar con: node fix-referral-simple.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando usuarios sin código de referido...');
  
  const users = await prisma.usuario.findMany({
    where: {
      referralCode: null,
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true
    }
  });

  console.log(`📊 Encontrados ${users.length} usuarios sin código\n`);

  let updated = 0;
  
  for (const user of users) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nombre = user.nombre || 'USR';
    const code = `${nombre.substring(0, 3).toUpperCase()}${timestamp}${random}`;

    try {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { referralCode: code }
      });
      updated++;
      console.log(`✅ ${user.nombre} -> ${code}`);
    } catch (err) {
      // Si el código existe, intentar otro
      const newCode = `${nombre.substring(0, 3).toUpperCase()}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      try {
        await prisma.usuario.update({
          where: { id: user.id },
          data: { referralCode: newCode }
        });
        updated++;
        console.log(`✅ ${user.nombre} -> ${newCode} (retry)`);
      } catch (e) {
        console.log(`❌ ${user.nombre}: Error`);
      }
    }
  }

  console.log(`\n✅ Actualizados: ${updated} de ${users.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
