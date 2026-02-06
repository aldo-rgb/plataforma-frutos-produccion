const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log('\n🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS\n');
    
    // Verificar usuarios
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📊 TOTAL DE USUARIOS:', usuarios.length);
    
    if (usuarios.length > 0) {
      console.log('\n👥 USUARIOS EN LA BASE DE DATOS:');
      usuarios.forEach((u, i) => {
        console.log(`\n${i + 1}. ${u.nombre}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Rol: ${u.rol}`);
        console.log(`   Activo: ${u.isActive ? '✅' : '❌'}`);
        console.log(`   Creado: ${u.createdAt.toLocaleString('es-MX')}`);
      });
    }
    
    // Verificar si hay datos de otros modelos
    const mentorData = await prisma.datosMentor.count();
    const cartas = await prisma.cartaDeFrutos.count();
    const metas = await prisma.meta.count();
    const sesiones = await prisma.sesionMentoria.count();
    
    console.log('\n\n📈 OTROS DATOS EN LA BASE:');
    console.log(`   Mentores: ${mentorData}`);
    console.log(`   Cartas de Frutos: ${cartas}`);
    console.log(`   Metas: ${metas}`);
    console.log(`   Sesiones de Mentoría: ${sesiones}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();
