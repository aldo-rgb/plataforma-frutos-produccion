import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'aldo1.club5am@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
        isActive: true
      }
    });

    console.log('\n═══════════════════════════════════════');
    console.log('🔍 VERIFICACIÓN DE USUARIO');
    console.log('═══════════════════════════════════════\n');

    if (!user) {
      console.log('❌ Usuario NO encontrado en la base de datos');
      console.log('Email buscado: aldo1.club5am@frutos.com\n');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('ID:', user.id);
    console.log('Nombre:', user.nombre);
    console.log('Email:', user.email);
    console.log('Rol:', user.rol);
    console.log('Activo:', user.isActive);
    console.log('Password hash:', user.password ? user.password.substring(0, 60) + '...' : 'NULL');
    
    if (user.password) {
      // Probar contraseñas comunes
      const passwords = ['aldo123', 'Aldo123', 'aldo1', 'password'];
      
      console.log('\n🔐 Probando contraseñas:');
      for (const pwd of passwords) {
        const match = await bcrypt.compare(pwd, user.password);
        if (match) {
          console.log(`✅ "${pwd}" - ¡CORRECTA!`);
        } else {
          console.log(`❌ "${pwd}" - incorrecta`);
        }
      }
    } else {
      console.log('\n⚠️ El usuario NO tiene contraseña configurada');
    }

    console.log('\n═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
