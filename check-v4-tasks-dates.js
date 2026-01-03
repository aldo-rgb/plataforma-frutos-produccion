const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkV4TasksDates() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    console.log(`\n📅 HOY ES: ${hoy.toISOString().split('T')[0]}\n`);
    
    // Buscar v4
    const user = await prisma.usuario.findUnique({
      where: { email: 'v4@next.com' },
      select: { id: true, nombre: true }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    // Obtener carta
    const carta = await prisma.cartaFrutos.findFirst({
      where: { userId: user.id },
      select: { id: true, estado: true, createdAt: true }
    });
    
    if (!carta) {
      console.log('❌ No tiene carta');
      return;
    }
    
    console.log(`👤 Usuario: ${user.nombre}`);
    console.log(`📜 Carta ID: ${carta.id}, Estado: ${carta.estado}`);
    console.log(`🗓️  Carta creada: ${carta.createdAt.toISOString()}\n`);
    
    // Contar tareas totales
    const totalTasks = await prisma.taskInstance.count({
      where: { cartaFrutosId: carta.id }
    });
    
    console.log(`📋 Total de tareas: ${totalTasks}\n`);
    
    // Agrupar por estado
    const porEstado = await prisma.taskInstance.groupBy({
      by: ['estado'],
      where: { cartaFrutosId: carta.id },
      _count: true
    });
    
    console.log('📊 Tareas por estado:');
    porEstado.forEach(e => {
      console.log(`   ${e.estado}: ${e._count}`);
    });
    console.log('');
    
    // Tareas de HOY
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    const tareasHoy = await prisma.taskInstance.findMany({
      where: {
        cartaFrutosId: carta.id,
        scheduledDate: {
          gte: hoy,
          lt: manana
        }
      },
      include: {
        Accion: {
          select: { nombre: true, area: true }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });
    
    console.log(`📅 Tareas programadas para HOY (${hoy.toISOString().split('T')[0]}): ${tareasHoy.length}\n`);
    
    tareasHoy.forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.Accion?.nombre || 'Sin nombre'}`);
      console.log(`   ID: ${t.id}`);
      console.log(`   Fecha programada: ${t.scheduledDate.toISOString()}`);
      console.log(`   Estado: ${t.estado}`);
      console.log(`   Área: ${t.Accion?.area || 'N/A'}`);
      console.log('');
    });
    
    // Tareas PASADAS (antes de hoy)
    const tareasPasadas = await prisma.taskInstance.findMany({
      where: {
        cartaFrutosId: carta.id,
        scheduledDate: {
          lt: hoy
        }
      },
      select: {
        id: true,
        scheduledDate: true,
        estado: true,
        Accion: {
          select: { nombre: true }
        }
      },
      orderBy: { scheduledDate: 'desc' },
      take: 5
    });
    
    console.log(`⚠️  Tareas con fecha ANTERIOR a hoy: ${tareasPasadas.length}\n`);
    
    if (tareasPasadas.length > 0) {
      console.log('Primeras 5:');
      tareasPasadas.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.Accion?.nombre || 'Sin nombre'}`);
        console.log(`   Fecha: ${t.scheduledDate.toISOString().split('T')[0]}`);
        console.log(`   Estado: ${t.estado}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkV4TasksDates();
