const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuarios de prueba para cada rol
  const usuarios = [
    {
      email: 'participante@frutos.com',
      password: 'participante123',
      nombre: 'María Participante',
      rol: 'PARTICIPANTE',
      sede: 'Sede Norte',
      vision: 'Crecer y aprender cada día',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 100
    },
    {
      email: 'gamechanger@frutos.com',
      password: 'gamechanger123',
      nombre: 'Juan Game Changer',
      rol: 'GAMECHANGER',
      sede: 'Sede Sur',
      vision: 'Cambiar el juego y marcar la diferencia',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 500
    },
    {
      email: 'mentor@frutos.com',
      password: 'mentor123',
      nombre: 'Ana Mentor',
      rol: 'MENTOR',
      sede: 'Sede Centro',
      vision: 'Guiar y desarrollar futuros líderes',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 1000
    },
    {
      email: 'coordinador@frutos.com',
      password: 'coordinador123',
      nombre: 'Carlos Coordinador',
      rol: 'COORDINADOR',
      sede: 'Sede Principal',
      vision: 'Coordinar equipos de alto rendimiento',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 2000
    },
    {
      email: 'admin@frutos.com',
      password: 'admin123',
      nombre: 'Laura Administrador',
      rol: 'ADMINISTRADOR',
      sede: 'Sede Central',
      vision: 'Administrar y optimizar el sistema',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 5000
    },
    {
      email: 'admin@impactovia.com',
      password: 'admin123',
      nombre: 'Líder Supremo',
      rol: 'ADMINISTRADOR',
      sede: 'Sede ImpactoVía',
      vision: 'Liderar la transformación global',
      suscripcion: 'ACTIVO',
      puntosCuanticos: 10000
    }
  ];

  console.log('\n📝 Creando usuarios...\n');

  for (const userData of usuarios) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const usuario = await prisma.usuario.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        nombre: userData.nombre,
        rol: userData.rol,
        sede: userData.sede,
        vision: userData.vision,
        isActive: true,
        llamadasPerdidas: 0,
        puntosCuanticos: userData.puntosCuanticos,
        suscripcion: userData.suscripcion,
      },
    });

    console.log(`✅ ${userData.rol}: ${userData.email} / ${userData.password}`);
  }

  console.log('\n🎉 Todos los usuarios han sido creados exitosamente!\n');
  console.log('📋 RESUMEN DE ACCESOS:\n');
  console.log('PARTICIPANTE:');
  console.log('  Email: participante@frutos.com');
  console.log('  Password: participante123\n');
  console.log('GAME CHANGER:');
  console.log('  Email: gamechanger@frutos.com');
  console.log('  Password: gamechanger123\n');
  console.log('MENTOR:');
  console.log('  Email: mentor@frutos.com');
  console.log('  Password: mentor123\n');
  console.log('COORDINADOR:');
  console.log('  Email: coordinador@frutos.com');
  console.log('  Password: coordinador123\n');
  console.log('ADMINISTRADOR:');
  console.log('  Email: admin@frutos.com');
  console.log('  Password: admin123\n');
  console.log('LÍDER SUPREMO (ImpactoVía):');
  console.log('  Email: admin@impactovia.com');
  console.log('  Password: admin123');
  console.log('  Puntos Cuánticos: 10000 ⚡\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
