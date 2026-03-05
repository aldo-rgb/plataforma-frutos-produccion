import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST /api/admin/promote-to-next-level
// Solo ADMINISTRADOR puede usar esta API
// Crea enrollment Y ticket de entrada para el siguiente nivel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Solo ADMINISTRADOR puede usar esto
    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Solo ADMINISTRADOR puede realizar esta acción' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, visionId, currentLevel } = body;
    
    if (!userId || !visionId || !currentLevel) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }
    
    // Determinar el siguiente nivel
    const nextLevel = currentLevel === 'BASIC' ? 'ADVANCED' : currentLevel === 'ADVANCED' ? 'PL' : null;
    
    if (!nextLevel) {
      return NextResponse.json({ error: 'No hay nivel siguiente disponible' }, { status: 400 });
    }
    
    // Verificar que el usuario existe con su organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, organizationId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    if (!user.organizationId) {
      return NextResponse.json({ error: 'Usuario no tiene organización asignada' }, { status: 400 });
    }
    
    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { id: true, nombre: true, coordinadorId: true }
    });
    
    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }
    
    // Verificar el enrollment actual
    const currentEnrollment = await prisma.vision_enrollments.findFirst({
      where: { 
        userId, 
        visionId, 
        level: currentLevel as any
      }
    });
    
    if (!currentEnrollment) {
      return NextResponse.json({ error: 'No se encontró enrollment en el nivel actual' }, { status: 404 });
    }
    
    // PASO 1: Actualizar el nivel ACTUAL a PAID si no lo tiene
    if (currentEnrollment.paymentStatus !== 'PAID') {
      await prisma.vision_enrollments.update({
        where: { id: currentEnrollment.id },
        data: { paymentStatus: 'PAID' }
      });
      logger.debug(`[ADMIN] Enrollment ${currentLevel} actualizado a PAID para usuario ${userId}`);
    }
    
    // PASO 2: Verificar/crear enrollment para el siguiente nivel
    let existingNextEnrollment = await prisma.vision_enrollments.findFirst({
      where: { 
        userId, 
        visionId, 
        level: nextLevel as any
      }
    });
    
    if (existingNextEnrollment) {
      // Si ya existe, actualizar el paymentStatus a PAID
      await prisma.vision_enrollments.update({
        where: { id: existingNextEnrollment.id },
        data: { paymentStatus: 'PAID' }
      });
    } else {
      // Crear nuevo enrollment para el siguiente nivel
      existingNextEnrollment = await prisma.vision_enrollments.create({
        data: {
          userId,
          visionId,
          coordinatorId: currentEnrollment.coordinatorId || vision.coordinadorId,
          level: nextLevel as any,
          enrollmentStatus: 'ENROLLED',
          paymentStatus: 'PAID',
          enrolledAt: new Date(),
          updatedAt: new Date()
        }
      });
      logger.debug(`[ADMIN] Enrollment ${nextLevel} creado para usuario ${userId}`);
    }
    
    // PASO 3: Verificar/crear TICKET de entrada para el siguiente nivel
    let existingTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: userId,
        visionId,
        level: nextLevel as any
      }
    });
    
    let ticketAction = 'none';
    
    if (existingTicket) {
      // Actualizar ticket existente a PAID y ACTIVE
      if (existingTicket.status !== 'ACTIVE' || existingTicket.paymentStatus !== 'PAID') {
        await prisma.ticket.update({
          where: { id: existingTicket.id },
          data: { 
            status: 'ACTIVE',
            paymentStatus: 'PAID'
          }
        });
        ticketAction = 'updated';
      }
    } else {
      // Crear nuevo ticket de entrada
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 3); // Válido por 3 meses
      
      // Generar ID único para el ticket
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketId = `TKT-${nextLevel}-${Date.now()}-${randomPart}`;
      
      await prisma.ticket.create({
        data: {
          id: ticketId,
          ownerId: userId,
          organizationId: user.organizationId,
          visionId,
          level: nextLevel as any,
          type: 'STANDARD',
          status: 'ACTIVE',
          isTransferable: false,
          validUntil,
          paymentStatus: 'PAID',
          amountPaid: 0, // Regalo/promoción del admin
          isAnticipo: false,
          updatedAt: new Date()
        }
      });
      ticketAction = 'created';
      logger.debug(`[ADMIN] Ticket ${nextLevel} creado para usuario ${userId}`);
    }
    
    logger.debug(`[ADMIN] Usuario ${user.nombre} (ID: ${userId}) promovido a ${nextLevel} en visión ${vision.nombre}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `✅ Enrollment y Ticket de ${nextLevel} listos (PAID)`,
      action: ticketAction === 'created' ? 'created' : 'updated'
    });
    
  } catch (error: any) {
    logger.error('Error en promote-to-next-level:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
