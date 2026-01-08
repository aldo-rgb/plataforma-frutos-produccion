const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function backupUsuarios() {
  try {
    console.log('📦 Creando respaldo de la tabla Usuario...\n');
    
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' }
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                      new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    
    const filename = `/Users/aldokmps/plataforma-frutos-FINAL/backup_usuarios_${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(usuarios, null, 2));
    
    console.log(`✅ Respaldo creado exitosamente:`);
    console.log(`   📄 Archivo: ${filename}`);
    console.log(`   👥 Total usuarios: ${usuarios.length}`);
    console.log('');
    
    // Resumen por rol
    const porRol = usuarios.reduce((acc, u) => {
      acc[u.rol] = (acc[u.rol] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Resumen por rol:');
    Object.entries(porRol).forEach(([rol, count]) => {
      console.log(`   ${rol}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupUsuarios();
