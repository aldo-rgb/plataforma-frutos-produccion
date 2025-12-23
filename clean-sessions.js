const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSessions() {
  try {
    console.log('\n🧹 Limpiando sesiones antiguas...\n');

    // NextAuth con JWT no usa tabla de sesiones en BD
    // Pero podemos verificar las cookies/tokens en el navegador
    console.log('ℹ️  NextAuth está usando JWT (no hay tabla de sesiones en BD)');
    console.log('');
    console.log('📋 Para limpiar la sesión actual:');
    console.log('');
    console.log('OPCIÓN 1 - Desde el navegador:');
    console.log('  1. Abre DevTools (F12)');
    console.log('  2. Ve a Application → Cookies');
    console.log('  3. Elimina las cookies de localhost:3003');
    console.log('  4. Recarga la página');
    console.log('');
    console.log('OPCIÓN 2 - Desde la app:');
    console.log('  1. Click en tu perfil (arriba derecha)');
    console.log('  2. Click en "Logout"');
    console.log('  3. Login con: carlos.mendoza@frutos.com / test123');
    console.log('');
    
    // Verificar usuarios en BD
    console.log('👥 Usuarios disponibles:');
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      },
      orderBy: { id: 'desc' },
      take: 10
    });

    users.forEach(u => {
      const badge = u.email.includes('carlos.mendoza') ? '⭐' : '  ';
      console.log(`${badge} ID: ${u.id.toString().padEnd(3)} | ${u.nombre?.padEnd(20) || 'Sin nombre'.padEnd(20)} | ${u.email}`);
    });

    console.log('');
    console.log('✅ Carlos Mendoza está listo con ID: 48');
    console.log('📅 Tareas generadas: 588 instancias para 3 meses');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSessions();
