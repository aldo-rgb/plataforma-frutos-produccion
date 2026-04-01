import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.usuario.findMany({
    where: {
      OR: [
        { rol: 'ADMIN' },
        { rol: 'SCHOOL_ADMIN' },
        { rol: 'SUPER_ADMIN' },
        { email: { contains: 'director' } }
      ]
    },
    select: { id: true, nombre: true, email: true, rol: true }
  });
  
  console.log('Usuarios Admin:');
  admins.forEach(a => console.log(`  - ${a.nombre} (${a.email}) - Rol: ${a.rol}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
