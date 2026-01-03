const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProfileImage() {
  try {
    // Reemplazar con el email del usuario que está teniendo el problema
    const userEmail = 'jorge@campos.com'; // Cambiar según sea necesario
    
    console.log('🔍 Verificando perfil de usuario...\n');
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        lastAvatarChangeDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('📋 Información del Usuario:');
    console.log('─────────────────────────────');
    console.log('ID:', usuario.id);
    console.log('Nombre:', usuario.nombre);
    console.log('Email:', usuario.email);
    console.log('\n📸 Estado del Avatar:');
    console.log('─────────────────────────────');
    console.log('Profile Image:', usuario.profileImage || '❌ NO TIENE');
    console.log('Última actualización:', usuario.lastAvatarChangeDate || 'Nunca');
    console.log('\n⏰ Timestamps:');
    console.log('─────────────────────────────');
    console.log('Creado:', usuario.createdAt);
    console.log('Actualizado:', usuario.updatedAt);

    // Verificar QuantumIdentity registros
    const identities = await prisma.quantumIdentity.findMany({
      where: { userId: usuario.id },
      orderBy: { generatedAt: 'desc' },
      take: 5
    });

    console.log('\n🌟 Registros de QuantumIdentity:');
    console.log('─────────────────────────────');
    console.log('Total de registros:', identities.length);
    
    if (identities.length > 0) {
      identities.forEach((identity, index) => {
        console.log(`\n${index + 1}. ID: ${identity.id}`);
        console.log('   Estado:', identity.status);
        console.log('   Avatar URL:', identity.avatarUrl || 'No generado');
        console.log('   Generado:', identity.generatedAt);
        console.log('   Completado:', identity.completedAt || 'Pendiente');
      });
    }

    // Verificar qué debería mostrar el check
    const hasProfileImage = !!usuario.profileImage;
    const requiresIdentity = !hasProfileImage;

    console.log('\n🎯 Estado del Check:');
    console.log('─────────────────────────────');
    console.log('hasProfileImage:', hasProfileImage);
    console.log('requiresIdentity:', requiresIdentity);
    console.log('Resultado:', requiresIdentity ? '🔴 MODAL DEBE MOSTRARSE' : '✅ MODAL NO DEBE MOSTRARSE');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfileImage();
