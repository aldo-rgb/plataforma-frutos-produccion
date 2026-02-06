import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultAvailability } from '@/lib/gcDefaultAvailability';
import logger from '@/lib/logger';

/**
 * GET /api/gc-calls/my-post-entreno
 * Obtener información de la próxima llamada post-entreno del participante
 * Query: gameChangerId (opcional)
 * 
 * Post-Entreno son llamadas FUERA del horario de staff (7:00-9:30 AM)
 * Usa la disponibilidad configurable del GC (por defecto: Lun-Jue 6-8 AM)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const gameChangerIdParam = searchParams.get('gameChangerId');

    // SIEMPRE buscar por membresía del usuario para obtener el GC correcto
    const membership = await prisma.smallGroupMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      include: {
        group: {
          select: { leaderId: true, name: true },
        },
      },
    });
    
    let gcId: number | null = null;
    
    if (membership) {
      gcId = membership.group.leaderId;
      logger.debug(`📞 User ${user.id} is in squad "${membership.group.name}", GC leaderId: ${gcId}`);
    } else if (gameChangerIdParam) {
      // Fallback al parámetro si no hay membresía
      gcId = parseInt(gameChangerIdParam);
      logger.debug(`📞 User ${user.id} has no squad, using param gcId: ${gcId}`);
    }

    if (!gcId) {
      return NextResponse.json({
        success: true,
        hasGC: false,
        nextCall: null,
        hasAvailability: false,
      });
    }

    // Asegurar que el GC tenga disponibilidad por defecto
    await ensureDefaultAvailability(gcId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar próxima llamada agendada que NO sea del horario de staff (7:00-9:30)
    // Una llamada es post-entreno si el horario es antes de 07:00 o después de 09:30
    const allUpcomingSlots = await prisma.gCCallSlot.findMany({
      where: {
        participantId: user.id,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledDate: { gte: today },
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' },
      ],
      select: {
        id: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
      },
    });

    // Filtrar las que son post-entreno (fuera del horario 07:00-09:30)
    const postEntrenoSlots = allUpcomingSlots.filter(slot => {
      const [hours] = slot.scheduledTime.split(':').map(Number);
      // Post-entreno: antes de las 7 AM o a partir de las 10 AM
      return hours < 7 || hours >= 10;
    });

    const nextCall = postEntrenoSlots.length > 0 ? postEntrenoSlots[0] : null;

    // Verificar si el GC tiene disponibilidad configurada para post-entreno
    // Buscar disponibilidades con horarios fuera del rango de staff (7:00-9:30)
    const gcAvailabilities = await prisma.gCAvailability.findMany({
      where: {
        gameChangerId: gcId,
        isActive: true,
      },
      select: {
        startTime: true,
        endTime: true,
        dayOfWeek: true,
      },
    });

    logger.debug(`📞 Post-Entreno check for GC ${gcId}:`, {
      availabilities: gcAvailabilities.length,
      times: gcAvailabilities.map(a => `${a.dayOfWeek}: ${a.startTime}-${a.endTime}`),
    });

    // El horario de staff es 7:00-9:30 AM
    // Post-entreno es CUALQUIER disponibilidad que esté fuera de ese rango:
    // - Antes de las 7:00 (ej: 6:00-8:00 incluye tiempo antes de las 7)
    // - Después de las 9:30 (ej: 10:00-12:00)
    const hasPostEntrenoAvailability = gcAvailabilities.some(avail => {
      const [startHour, startMin] = avail.startTime.split(':').map(Number);
      const [endHour, endMin] = avail.endTime.split(':').map(Number);
      
      // Convertir a minutos para comparar más fácil
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      // Staff es 7:00 (420 min) a 9:30 (570 min)
      const staffStart = 7 * 60; // 420
      const staffEnd = 9 * 60 + 30; // 570
      
      // Es post-entreno si tiene tiempo fuera del rango de staff:
      // - Empieza antes de las 7:00 (startMinutes < 420)
      // - O termina después de las 9:30 (endMinutes > 570)
      const isPostEntreno = startMinutes < staffStart || endMinutes > staffEnd;
      
      logger.debug(`   Checking ${avail.startTime}-${avail.endTime}: start=${startMinutes}, end=${endMinutes}, isPostEntreno=${isPostEntreno}`);
      
      return isPostEntreno;
    });

    logger.debug(`📞 Result: hasPostEntrenoAvailability=${hasPostEntrenoAvailability}`);

    return NextResponse.json({
      success: true,
      hasGC: true,
      nextCall: nextCall ? {
        id: nextCall.id,
        date: nextCall.scheduledDate.toISOString().split('T')[0],
        time: nextCall.scheduledTime,
        status: nextCall.status,
      } : null,
      hasAvailability: hasPostEntrenoAvailability,
    });

  } catch (error) {
    logger.error('Error fetching post-entreno info:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información' },
      { status: 500 }
    );
  }
}
