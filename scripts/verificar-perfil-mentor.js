/**
 * Script para verificar datos del perfil de mentor
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarPerfil() {
  try {
    const user = await prisma.usuario.findFirst({
      where: { 
        rol: 'MENTOR'
      },
      include: {
        PerfilMentor: true
      }
    });

    if (!user) {
      console.log('❌ No se encontró ningún mentor');
      return;
    }

    console.log('\n📊 DATOS DEL USUARIO MENTOR:');
    console.log('================================');
    console.log(`ID: ${user.id}`);
    console.log(`Nombre: ${user.nombre}`);
    console.log(`Email: ${user.email}`);
    console.log(`isActive: ${user.isActive}`);
    console.log(`profileImage: "${user.profileImage || '(vacío)'}"`);
    
    console.log('\n📋 PERFIL MENTOR:');
    console.log('================================');
    if (user.PerfilMentor) {
      console.log(`jobTitle: "${user.PerfilMentor.jobTitle || '(vacío)'}"`);
      console.log(`bioShort: "${user.PerfilMentor.bioShort || '(vacío)'}"`);
      console.log(`skills: ${JSON.stringify(user.PerfilMentor.skills || [])}`);
      console.log(`nivel: ${user.PerfilMentor.nivel}`);
    } else {
      console.log('❌ NO TIENE PerfilMentor asociado');
    }

    console.log('\n🔍 ANÁLISIS:');
    console.log('================================');
    const faltantes = [];
    if (!user.profileImage) faltantes.push('❌ profileImage está vacío');
    if (!user.PerfilMentor?.jobTitle) faltantes.push('❌ jobTitle está vacío');
    if (!user.PerfilMentor?.bioShort) faltantes.push('❌ bioShort está vacío');
    if (!user.PerfilMentor?.skills || user.PerfilMentor.skills.length === 0) faltantes.push('❌ skills está vacío');
    if (!user.isActive) faltantes.push('⚠️  isActive es false (esperando aprobación)');

    if (faltantes.length === 0) {
      console.log('✅ PERFIL COMPLETO');
    } else {
      console.log('Campos faltantes o inactivos:');
      faltantes.forEach(f => console.log(`  ${f}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verificarPerfil();
