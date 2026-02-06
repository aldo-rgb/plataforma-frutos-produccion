const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Creando usuario ADMINISTRADOR...');
    console.log('📧 Email: admin@frutos.com');
    console.log('🔑 Contraseña: admin123');
    console.log('👤 Rol: ADMINISTRADOR');
    console.log('');

    // Hash de la contraseña
    const hashedPassword = bcrypt.hashSync('admin123', 10);

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email: 'admin@frutos.com' }
    });

    if (existingUser) {
      console.log('⚠️  Usuario admin@frutos.com ya existe');
      console.log('🔄 Actualizando usuario existente...');
      
      const updatedAdmin = await prisma.usuario.update({
        where: { email: 'admin@frutos.com' },
        data: {
          nombre: 'Administrador',
          password: hashedPassword,
          rol: 'ADMINISTRADOR',
          isActive: true,
        }
      });

      console.log('');
      console.log('✅ Usuario ADMINISTRADOR actualizado exitosamente');
      console.log('🆔 ID:', updatedAdmin.id);
      console.log('👤 Nombre:', updatedAdmin.nombre);
      console.log('📧 Email:', updatedAdmin.email);
      console.log('🎭 Rol:', updatedAdmin.rol);
      console.log('');
      console.log('✅ Ya puedes iniciar sesión con:');
      console.log('   Email: admin@frutos.com');
      console.log('   Contraseña: admin123');
      return;
    }

    // Crear nuevo usuario administrador
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@frutos.com',
        password: hashedPassword,
        rol: 'ADMINISTRADOR',
        isActive: true,
      }
    });

    console.log('');
    console.log('✅ Usuario ADMINISTRADOR creado exitosamente');
    console.log('🆔 ID:', admin.id);
    console.log('👤 Nombre:', admin.nombre);
    console.log('📧 Email:', admin.email);
    console.log('🎭 Rol:', admin.rol);
    console.log('');
    console.log('✅ Ya puedes iniciar sesión con:');
    console.log('   Email: admin@frutos.com');
    console.log('   Contraseña: admin123');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error al crear usuario ADMINISTRADOR:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('');
    console.log('👋 Conexión cerrada');
  }
}

createAdmin();

