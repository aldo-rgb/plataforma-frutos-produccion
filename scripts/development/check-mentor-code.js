// Script para verificar código de mentor
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorCode() {
  try {
    const code = 'MENTOR-C9D889';
    
    console.log('🔍 Buscando código:', code);
    console.log('');
    
    // Buscar tal cual
    let found = await prisma.licenseCode.findUnique({
      where: { code: code }
    });
    
    if (found) {
      console.log('✅ Encontrado con guión:');
      console.log(JSON.stringify(found, null, 2));
      return;
    }
    
    // Buscar sin guión
    const codeWithoutDash = code.replace(/-/g, '');
    console.log('🔍 Buscando sin guión:', codeWithoutDash);
    
    found = await prisma.licenseCode.findUnique({
      where: { code: codeWithoutDash }
    });
    
    if (found) {
      console.log('✅ Encontrado sin guión:');
      console.log(JSON.stringify(found, null, 2));
      return;
    }
    
    console.log('❌ Código no encontrado en LicenseCode');
    console.log('');
    console.log('📋 Mostrando todos los códigos MENTOR_MEMBERSHIP:');
    
    const allCodes = await prisma.licenseCode.findMany({
      where: {
        type: 'MENTOR_MEMBERSHIP'
      },
      select: {
        code: true,
        type: true,
        used: true,
        expiresAt: true,
        createdAt: true
      }
    });
    
    if (allCodes.length === 0) {
      console.log('❌ No hay códigos de tipo MENTOR_MEMBERSHIP en la base de datos');
      console.log('');
      console.log('💡 Necesitas crear un código primero');
    } else {
      console.log(`Encontrados ${allCodes.length} códigos:`);
      allCodes.forEach(c => {
        console.log(`  - ${c.code} | Usado: ${c.used} | Expira: ${c.expiresAt ? c.expiresAt.toLocaleDateString() : 'Nunca'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorCode();
