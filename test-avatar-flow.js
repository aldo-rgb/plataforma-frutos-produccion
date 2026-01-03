const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAvatarFlow() {
  try {
    console.log('🧪 PRUEBA COMPLETA DEL FLUJO DE AVATAR\n');
    console.log('═══════════════════════════════════════\n');

    // 1. Verificar usuario actual (cambiar email según necesidad)
    const testEmail = 'jorge@campos.com';
    
    console.log('1️⃣ VERIFICANDO USUARIO...');
    const usuario = await prisma.usuario.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        lastAvatarChangeDate: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado con email:', testEmail);
      console.log('💡 Cambia el email en el script y vuelve a ejecutar\n');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Profile Image: ${usuario.profileImage ? '✅ SÍ' : '❌ NO'}`);
    if (usuario.profileImage) {
      console.log(`   URL: ${usuario.profileImage.substring(0, 60)}...`);
    }
    console.log('');

    // 2. Simular el check que hace el hook
    console.log('2️⃣ SIMULANDO CHECK DEL HOOK...');
    const hasProfileImage = !!usuario.profileImage;
    const requiresIdentity = !hasProfileImage;
    
    console.log(`   hasProfileImage: ${hasProfileImage}`);
    console.log(`   requiresIdentity: ${requiresIdentity}`);
    console.log(`   Resultado: ${requiresIdentity ? '🔴 MODAL SE MOSTRARÍA' : '✅ MODAL NO SE MOSTRARÍA'}`);
    console.log('');

    // 3. Verificar registros de QuantumIdentity
    console.log('3️⃣ VERIFICANDO REGISTROS QUANTUM IDENTITY...');
    const identities = await prisma.quantumIdentity.findMany({
      where: { userId: usuario.id },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        avatarUrl: true,
        generatedAt: true,
        completedAt: true,
        gender: true
      }
    });

    if (identities.length === 0) {
      console.log('   ⚠️ No hay registros de QuantumIdentity');
    } else {
      console.log(`   📊 Total de registros: ${identities.length}\n`);
      identities.forEach((identity, index) => {
        console.log(`   ${index + 1}. ID: ${identity.id}`);
        console.log(`      Estado: ${identity.status}`);
        console.log(`      Género: ${identity.gender || 'no especificado'}`);
        console.log(`      Avatar: ${identity.avatarUrl ? '✅' : '❌'}`);
        console.log(`      Generado: ${identity.generatedAt.toLocaleString()}`);
        console.log(`      Completado: ${identity.completedAt ? identity.completedAt.toLocaleString() : 'Pendiente'}`);
        console.log('');
      });
    }

    // 4. Verificar el último registro COMPLETED
    console.log('4️⃣ ANÁLISIS DEL ÚLTIMO AVATAR COMPLETADO...');
    const lastCompleted = identities.find(i => i.status === 'COMPLETED');
    
    if (!lastCompleted) {
      console.log('   ⚠️ No hay avatares completados');
    } else {
      console.log(`   ✅ Último avatar completado:`);
      console.log(`      ID: ${lastCompleted.id}`);
      console.log(`      Avatar URL: ${lastCompleted.avatarUrl ? 'Existe' : 'NO EXISTE'}`);
      console.log(`      Completado: ${lastCompleted.completedAt?.toLocaleString()}`);
      
      // Verificar si el avatarUrl del identity coincide con el profileImage del usuario
      if (lastCompleted.avatarUrl === usuario.profileImage) {
        console.log('   ✅ El avatar del identity COINCIDE con el profileImage del usuario');
      } else {
        console.log('   ⚠️ DESINCRONIZACIÓN DETECTADA:');
        console.log(`      - Identity avatarUrl: ${lastCompleted.avatarUrl}`);
        console.log(`      - Usuario profileImage: ${usuario.profileImage}`);
      }
    }
    console.log('');

    // 5. Diagnóstico final
    console.log('5️⃣ DIAGNÓSTICO FINAL');
    console.log('═══════════════════════════════════════');
    
    if (usuario.profileImage) {
      console.log('✅ ESTADO: CORRECTO');
      console.log('   El usuario tiene profileImage guardado.');
      console.log('   El modal NO debería aparecer.');
      console.log('');
      console.log('   Si el modal aparece, verifica:');
      console.log('   - Cooldown de localStorage (debe estar activo 10 seg)');
      console.log('   - Cache del navegador');
      console.log('   - Logs del servidor en /api/quantum-identity/check');
    } else {
      console.log('❌ ESTADO: INCORRECTO');
      console.log('   El usuario NO tiene profileImage.');
      console.log('   El modal DEBERÍA aparecer.');
      console.log('');
      if (lastCompleted && lastCompleted.avatarUrl) {
        console.log('   🔧 POSIBLE SOLUCIÓN:');
        console.log('   El avatar se generó pero no se guardó en Usuario.profileImage');
        console.log('   Ejecuta este comando para sincronizar:');
        console.log('');
        console.log(`   await prisma.usuario.update({`);
        console.log(`     where: { id: ${usuario.id} },`);
        console.log(`     data: { profileImage: "${lastCompleted.avatarUrl}" }`);
        console.log(`   });`);
      }
    }

  } catch (error) {
    console.error('❌ Error en el test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAvatarFlow();
