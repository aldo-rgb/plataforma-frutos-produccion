// Script para generar códigos de referido para usuarios que no lo tienen
// Ejecutar con: npx ts-node fix-missing-referral-codes.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Buscando usuarios sin código de referido...\n');
  
  // Buscar todos los usuarios que no tienen referralCode
  const usersWithoutCode = await prisma.usuario.findMany({
    where: {
      referralCode: null,
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Encontrados ${usersWithoutCode.length} usuarios sin código de referido\n`);

  if (usersWithoutCode.length === 0) {
    console.log('✅ Todos los usuarios ya tienen código de referido');
    return;
  }

  // Mostrar los primeros 20 para referencia
  console.log('Primeros 20 usuarios afectados:');
  console.log('─'.repeat(80));
  usersWithoutCode.slice(0, 20).forEach((u, i) => {
    console.log(`${i + 1}. ${u.nombre} | ${u.email} | ${u.createdAt.toISOString().split('T')[0]}`);
  });
  console.log('─'.repeat(80));
  console.log('');

  // Generar códigos únicos para cada usuario
  let updated = 0;
  let errors = 0;

  for (const user of usersWithoutCode) {
    try {
      // Generar código de referido único
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const nombre = user.nombre || 'USR';
      const referralCode = `${nombre.substring(0, 3).toUpperCase()}${timestamp}${random}`;

      await prisma.usuario.update({
        where: { id: user.id },
        data: { referralCode }
      });

      updated++;
      
      if (updated % 50 === 0) {
        console.log(`⏳ Procesados ${updated} de ${usersWithoutCode.length}...`);
      }
    } catch (error: any) {
      // Si el código ya existe (muy raro), generar otro
      if (error.code === 'P2002') {
        try {
          const newCode = `${user.nombre?.substring(0, 3).toUpperCase() || 'USR'}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          await prisma.usuario.update({
            where: { id: user.id },
            data: { referralCode: newCode }
          });
          updated++;
        } catch (retryError) {
          console.error(`❌ Error con usuario ${user.id} (${user.nombre}):`, retryError);
          errors++;
        }
      } else {
        console.error(`❌ Error con usuario ${user.id} (${user.nombre}):`, error);
        errors++;
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN:');
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log('═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
