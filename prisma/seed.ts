import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario de prueba (ID 1)
  const usuario = await prisma.usuario.upsert({
    where: { email: 'admin@frutos.com' },
    update: {},
    create: {
      email: 'admin@frutos.com',
      nombre: 'Coordinador Principal',
      rol: 'COORDINADOR',
      isActive: true,
      llamadasPerdidas: 0,
      puntosCuanticos: 0,
      sede: 'Central',
      vision: 'Transformar vidas a través del compromiso cuántico',
    },
  });

  console.log('✅ Usuario creado:', usuario);
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
