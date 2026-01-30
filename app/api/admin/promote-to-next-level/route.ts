import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/promote-to-next-level
// Solo ADMINISTRADOR puede usar esta API
// Crea enrollment para el siguiente nivel con ticket pagado
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
    
    // Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
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
    
    // Verificar si ya existe enrollment para el siguiente nivel
    const existingNextEnrollment = await prisma.vision_enrollments.findFirst({
      where: { 
        userId, 
        visionId, 
        level: nextLevel as any
      }
    });
    
    if (existingNextEnrollment) {
      // Si ya existe, solo actualizar el paymentStatus a PAID
      await prisma.vision_enrollments.update({
        where: { id: existingNextEnrollment.id },
        data: { paymentStatus: 'PAID' }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `Enrollment de ${nextLevel} actualizado a PAID`,
        action: 'updated'
      });
    }
    
    // Crear nuevo enrollment para el siguiente nivel
    const newEnrollment = await prisma.vision_enrollments.create({
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
    
    console.log(`[ADMIN] Usuario ${user.nombre} (ID: ${userId}) promovido a ${nextLevel} con ticket PAID en visión ${vision.nombre}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Enrollment de ${nextLevel} creado con ticket PAID`,
      action: 'created',
      enrollmentId: newEnrollment.id
    });
    
  } catch (error: any) {
    console.error('Error en promote-to-next-level:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
