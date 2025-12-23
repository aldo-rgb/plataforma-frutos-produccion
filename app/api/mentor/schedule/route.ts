import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 📅 API: Gestión de Disponibilidad del Mentor (DOBLE CALENDARIO)
 * POST /api/mentor/schedule - Guardar/Actualizar horarios
 * GET  /api/mentor/schedule - Obtener horarios actuales
 * 
 * Tipos de calendario:
 * - DISCIPLINE: Llamadas 5-8 AM (15 min)
 * - MENTORSHIP: Mentorías pagadas (1 hora, horario libre)
 */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'MENTOR' && session.user.rol !== 'COORDINADOR') {
      return NextResponse.json({ 
        error: 'Solo mentores pueden configurar horarios' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { mentorId, schedule, type } = body; // 🔥 NUEVO: recibimos el tipo

    const finalMentorId = mentorId || session.user.id;

    if (session.user.rol === 'MENTOR' && finalMentorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'No puedes editar el horario de otro mentor' 
      }, { status: 403 });
    }

    if (!schedule || !Array.isArray(schedule)) {
      return NextResponse.json({ 
        error: 'El campo "schedule" debe ser un array' 
      }, { status: 400 });
    }

    if (!type || (type !== 'DISCIPLINE' && type !== 'MENTORSHIP')) {
      return NextResponse.json({ 
        error: 'El campo "type" debe ser DISCIPLINE o MENTORSHIP' 
      }, { status: 400 });
    }

    // 🔥 CLAVE: Solo borramos los horarios DEL TIPO que estamos editando
    await prisma.callAvailability.deleteMany({
      where: { 
        mentorId: Number(finalMentorId),
        type: type // Solo borramos este calendario específico
      }
    });

    console.log(`🗑️ Horarios de tipo ${type} eliminados para mentor ${finalMentorId}`);

    const activeSlots = schedule
      .filter((s: any) => s.isActive === true)
      .map((s: any) => {
        if (
          typeof s.dayOfWeek !== 'number' || 
          s.dayOfWeek < 0 || 
          s.dayOfWeek > 6
        ) {
          throw new Error(`dayOfWeek inválido: ${s.dayOfWeek}. Debe ser 0-6`);
        }

        if (!s.startTime || !s.endTime) {
          throw new Error('startTime y endTime son requeridos');
        }

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(s.startTime) || !timeRegex.test(s.endTime)) {
          throw new Error('Formato de tiempo inválido. Usar HH:MM (ej: 09:00)');
        }

        return {
          mentorId: Number(finalMentorId),
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: true,
          type: type // 🔥 Guardamos la etiqueta del tipo
        };
      });

    // 🔥 Validación estricta SOLO para DISCIPLINE
    if (type === 'DISCIPLINE') {
      const invalidTimes = activeSlots.some((s: any) => s.startTime < "05:00" || s.endTime > "08:00");

      if (invalidTimes) {
        return NextResponse.json({ 
          error: '⛔ Violación de Reglas: Los horarios de Disciplina deben estar entre 05:00 y 08:00.' 
        }, { status: 400 });
      }
    }

    if (activeSlots.length > 0) {
      await prisma.callAvailability.createMany({
        data: activeSlots
      });

      console.log(`✅ ${activeSlots.length} horarios de tipo ${type} guardados para mentor ${finalMentorId}`);
    } else {
      console.log(`⚠️ No se guardaron horarios de tipo ${type} (todos inactivos)`);
    }

    const savedAvailability = await prisma.callAvailability.findMany({
      where: { 
        mentorId: Number(finalMentorId),
        type: type
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      message: `Horario de ${type === 'DISCIPLINE' ? 'Disciplina' : 'Mentorías'} actualizado correctamente`,
      data: {
        mentorId: finalMentorId,
        type: type,
        slotsCount: savedAvailability.length,
        availability: savedAvailability
      }
    });

  } catch (error) {
    console.error('❌ Error guardando horario:', error);
    
    return NextResponse.json({ 
      error: 'Error al guardar horario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET: Obtener horarios del mentor (filtrado por tipo)
 * 
 * Query params:
 * - mentorId (opcional): ID del mentor
 * - type: DISCIPLINE o MENTORSHIP
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentorIdParam = searchParams.get('mentorId');
    const type = searchParams.get('type'); // 🔥 NUEVO: Filtramos por tipo
    
    const finalMentorId = mentorIdParam 
      ? Number(mentorIdParam) 
      : session.user.id;

    if (!type || (type !== 'DISCIPLINE' && type !== 'MENTORSHIP')) {
      return NextResponse.json({ 
        error: 'El parámetro "type" es requerido (DISCIPLINE o MENTORSHIP)' 
      }, { status: 400 });
    }

    if (
      session.user.rol === 'MENTOR' && 
      finalMentorId !== session.user.id
    ) {
      return NextResponse.json({ 
        error: 'No puedes ver el horario de otro mentor' 
      }, { status: 403 });
    }

    // 🔥 Filtramos por tipo de calendario
    const availability = await prisma.callAvailability.findMany({
      where: { 
        mentorId: finalMentorId,
        type: type as any
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    const groupedByDay: Record<number, any[]> = {};
    availability.forEach((slot: any) => {
      if (!groupedByDay[slot.dayOfWeek]) {
        groupedByDay[slot.dayOfWeek] = [];
      }
      groupedByDay[slot.dayOfWeek].push({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
        type: slot.type,
        createdAt: slot.createdAt
      });
    });

    console.log(`📅 Horarios de tipo ${type} consultados para mentor ${finalMentorId}: ${availability.length} slots`);

    return NextResponse.json({
      success: true,
      data: {
        mentorId: finalMentorId,
        type: type,
        totalSlots: availability.length,
        availability,
        groupedByDay
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo horario:', error);
    
    return NextResponse.json({ 
      error: 'Error al obtener horario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE: Eliminar un slot específico o todos los horarios
 * 
 * Query params:
 * - slotId (opcional): ID del slot a eliminar
 * - mentorId (opcional): Si no se proporciona slotId, elimina todos los del mentor
 * 
 * Ejemplo: 
 * - /api/mentor/schedule?slotId=123 (elimina slot específico)
 * - /api/mentor/schedule (elimina todos los horarios del mentor autenticado)
 */
export async function DELETE(request: Request) {
  try {
    // 1️⃣ Autenticación
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'MENTOR' && session.user.rol !== 'COORDINADOR') {
      return NextResponse.json({ 
        error: 'Solo mentores pueden eliminar horarios' 
      }, { status: 403 });
    }

    // 2️⃣ Obtener parámetros
    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    const mentorIdParam = searchParams.get('mentorId');

    const finalMentorId = mentorIdParam 
      ? Number(mentorIdParam) 
      : session.user.id;

    // 3️⃣ Validar permisos
    if (session.user.rol === 'MENTOR' && finalMentorId !== session.user.id) {
      return NextResponse.json({ 
        error: 'No puedes eliminar horarios de otro mentor' 
      }, { status: 403 });
    }

    // 4️⃣ Eliminar slot específico o todos
    if (slotId) {
      // Verificar que el slot pertenece al mentor
      const slot = await prisma.callAvailability.findUnique({
        where: { id: Number(slotId) }
      });

      if (!slot) {
        return NextResponse.json({ error: 'Slot no encontrado' }, { status: 404 });
      }

      if (slot.mentorId !== finalMentorId) {
        return NextResponse.json({ 
          error: 'Este slot no te pertenece' 
        }, { status: 403 });
      }

      await prisma.callAvailability.delete({
        where: { id: Number(slotId) }
      });

      console.log(`🗑️ Slot ${slotId} eliminado`);

      return NextResponse.json({
        success: true,
        message: 'Horario eliminado correctamente'
      });

    } else {
      // Eliminar todos los horarios del mentor
      const result = await prisma.callAvailability.deleteMany({
        where: { mentorId: finalMentorId }
      });

      console.log(`🗑️ ${result.count} horarios eliminados para mentor ${finalMentorId}`);

      return NextResponse.json({
        success: true,
        message: `${result.count} horarios eliminados`,
        deletedCount: result.count
      });
    }

  } catch (error) {
    console.error('❌ Error eliminando horario:', error);
    
    return NextResponse.json({ 
      error: 'Error al eliminar horario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
