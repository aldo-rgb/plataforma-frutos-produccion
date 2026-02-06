const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
        isActive: true
      },
      orderBy: { id: 'asc' },
      take: 10
    });
    
    console.log('\n📋 Total usuarios encontrados:', users.length);
    console.log('\n');
    
    if (users.length === 0) {
      console.log('⚠️  NO HAY USUARIOS EN LA BASE DE DATOS\n');
      return;
    }
    
    for (const user of users) {
      console.log('═══════════════════════════════════════');
      console.log('ID:', user.id);
      console.log('Nombre:', user.nombre);
      console.log('Email:', user.email);
      console.log('Password existe:', user.password ? '✅ SÍ' : '❌ NO');
      
      if (user.password) {
        console.log('Password hash (30 chars):', user.password.substring(0, 30) + '...');
        
        // Verificar si es un hash válido de bcrypt
        const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        console.log('Es hash de bcrypt:', isBcryptHash ? '✅ SÍ' : '❌ NO');
        
        // Intentar validar con passwords comunes
        const testPasswords = ['password', '123456', 'admin', user.nombre.toLowerCase()];
        for (const testPass of testPasswords) {
          try {
            const match = await bcrypt.compare(testPass, user.password);
            if (match) {
              console.log(`🔓 PASSWORD ENCONTRADA: "${testPass}"`);
              break;
            }
          } catch (err) {
            // Ignorar errores de comparación
          }
        }
      }
      
      console.log('Rol:', user.rol);
      console.log('Activo:', user.isActive ? '✅ SÍ' : '❌ NO');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
