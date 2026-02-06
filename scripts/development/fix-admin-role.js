const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuarios administradores...\n');

  // Buscar usuario por ID 1 (el que está logueado según los logs)
  const usuario = await prisma.usuario.findUnique({
    where: { id: 1 },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      isActive: true
    }
  });

  if (!usuario) {
    console.log('❌ No se encontró usuario con ID 1');
    return;
  }

  console.log('👤 Usuario encontrado:');
  console.log(`   ID: ${usuario.id}`);
  console.log(`   Nombre: ${usuario.nombre}`);
  console.log(`   Email: ${usuario.email}`);
  console.log(`   Rol: ${usuario.rol}`);
  console.log(`   Activo: ${usuario.isActive}`);
  console.log('');

  // Verificar si el rol es correcto
  const rolesAutorizados = ['ADMIN', 'DIRECTOR', 'COORDINADOR'];
  if (!rolesAutorizados.includes(usuario.rol)) {
    console.log(`⚠️  El rol actual "${usuario.rol}" NO tiene permisos de administrador`);
    console.log('');
    
    // Preguntar si se debe actualizar
    console.log('💡 Para acceder al dashboard de admin, el rol debe ser:');
    console.log('   - ADMIN');
    console.log('   - DIRECTOR');
    console.log('   - COORDINADOR');
    console.log('');
    console.log('🔧 Actualizando rol a ADMIN...');
    
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { rol: 'ADMIN' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    console.log('');
    console.log('✅ Rol actualizado exitosamente:');
    console.log(`   Nombre: ${usuarioActualizado.nombre}`);
    console.log(`   Email: ${usuarioActualizado.email}`);
    console.log(`   Rol: ${usuarioActualizado.rol}`);
    console.log('');
    console.log('🔄 Por favor, cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto.');
  } else {
    console.log(`✅ El usuario ya tiene rol autorizado: ${usuario.rol}`);
    console.log('');
    console.log('🔍 Si el dashboard aún no muestra los mentores, verifica:');
    console.log('   1. Que hayas cerrado sesión y vuelto a iniciar');
    console.log('   2. Que existan usuarios con rol MENTOR o LIDER activos');
  }

  // Buscar usuarios con rol MENTOR o LIDER
  console.log('');
  console.log('📊 Mentores en la base de datos:');
  const mentores = await prisma.usuario.findMany({
    where: {
      rol: { in: ['MENTOR', 'LIDER'] },
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true
    }
  });

  if (mentores.length === 0) {
    console.log('   ⚠️  No hay mentores activos en la base de datos');
  } else {
    console.log(`   ✅ ${mentores.length} mentores encontrados:`);
    mentores.forEach(mentor => {
      console.log(`      - ${mentor.nombre} (${mentor.email}) - ${mentor.rol}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
