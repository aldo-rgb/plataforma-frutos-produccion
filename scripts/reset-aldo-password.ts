import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const newPassword = 'aldo123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.usuario.update({
      where: { email: 'aldo1.club5am@frutos.com' },
      data: { password: hashedPassword },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    console.log('\n═══════════════════════════════════════');
    console.log('✅ CONTRASEÑA ACTUALIZADA');
    console.log('═══════════════════════════════════════\n');
    console.log('Usuario:', updated.nombre);
    console.log('Email:', updated.email);
    console.log('Rol:', updated.rol);
    console.log('\n🔑 Nueva contraseña: aldo123');
    console.log('\n═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
