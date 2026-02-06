const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function moveTicket() {
  try {
    // Buscar usuario Rodrigo Abed
    const user = await prisma.usuario.findFirst({
      where: {
        nombre: { contains: 'Rodrigo Abed' }
      },
      select: { id: true, nombre: true, email: true }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('👤 Usuario encontrado:', user);
    
    // Buscar su ticket de Vision 25
    const ticket = await prisma.ticket.findFirst({
      where: {
        ownerId: user.id,
        level: 'ADVANCED'
      },
      include: {
        vision: { select: { id: true, nombre: true } }
      }
    });
    
    if (!ticket) {
      console.log('❌ No tiene ticket ADVANCED');
      return;
    }
    
    console.log('🎫 Ticket actual:', {
      id: ticket.id,
      level: ticket.level,
      status: ticket.status,
      vision: ticket.vision?.nombre
    });
    
    // Buscar Vision 24
    const vision24 = await prisma.vision.findFirst({
      where: {
        nombre: { contains: '24' }
      },
      select: { id: true, nombre: true, organizationId: true }
    });
    
    if (!vision24) {
      console.log('❌ Vision 24 no encontrada');
      
      // Listar visiones disponibles
      const visiones = await prisma.vision.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' }
      });
      console.log('📋 Visiones disponibles:', visiones);
      return;
    }
    
    console.log('🎯 Vision destino:', vision24);
    
    // Mover el ticket
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { visionId: vision24.id }
    });
    
    console.log('✅ Ticket movido a Vision 24');
    
    // También mover el enrollment si existe
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        level: 'ADVANCED',
        visionId: ticket.visionId
      }
    });
    
    if (enrollment) {
      await prisma.vision_enrollments.update({
        where: { id: enrollment.id },
        data: { visionId: vision24.id }
      });
      console.log('✅ Enrollment también movido a Vision 24');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

moveTicket();
