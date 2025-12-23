import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Obtener configuración de disponibilidad del mentor
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId') || session.user.id;

    const schedule = await prisma.disciplineSchedule.findUnique({
      where: { mentorId: Number(mentorId) }
    });

    if (!schedule) {
      // Devolver configuración por defecto
      return NextResponse.json({
        allowedDays: [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
        startTime: '05:00',
        endTime: '08:00',
        isActive: false
      });
    }

    return NextResponse.json(schedule);

  } catch (error) {
    console.error('Error al obtener configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear o actualizar configuración de disponibilidad
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea MENTOR
    const user = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) }
    });

    if (user?.rol !== 'MENTOR' && user?.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ 
        error: 'Solo los mentores pueden configurar disponibilidad de disciplina' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { allowedDays, startTime, endTime, isActive } = body;

    // Validaciones
    if (!Array.isArray(allowedDays) || allowedDays.length === 0) {
      return NextResponse.json({ 
        error: 'Debes seleccionar al menos un día' 
      }, { status: 400 });
    }

    // Validar que los días estén en el rango correcto (0-6)
    if (allowedDays.some((day: number) => day < 0 || day > 6)) {
      return NextResponse.json({ 
        error: 'Días inválidos. Deben estar entre 0 (Domingo) y 6 (Sábado)' 
      }, { status: 400 });
    }

    // Validar formato de horas (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json({ 
        error: 'Formato de hora inválido. Debe ser HH:MM' 
      }, { status: 400 });
    }

    // Validar que startTime < endTime
    if (startTime >= endTime) {
      return NextResponse.json({ 
        error: 'La hora de inicio debe ser menor que la hora de fin' 
      }, { status: 400 });
    }

    const mentorId = Number(session.user.id);

    // Upsert: crear si no existe, actualizar si existe
    const schedule = await prisma.disciplineSchedule.upsert({
      where: { mentorId },
      create: {
        mentorId,
        allowedDays,
        startTime,
        endTime,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      },
      update: {
        allowedDays,
        startTime,
        endTime,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });

    console.log(`✅ Ventana de disponibilidad guardada para mentor ${mentorId}:`, schedule);

    return NextResponse.json({ 
      success: true,
      schedule,
      message: 'Ventana de disponibilidad guardada exitosamente' 
    });

  } catch (error) {
    console.error('Error al guardar configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Desactivar disponibilidad de disciplina
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = Number(session.user.id);

    // En lugar de borrar, desactivamos
    const schedule = await prisma.disciplineSchedule.update({
      where: { mentorId },
      data: { isActive: false }
    });

    console.log(`🔒 Disponibilidad de disciplina desactivada para mentor ${mentorId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Disponibilidad desactivada exitosamente' 
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'No existe configuración para desactivar' 
      }, { status: 404 });
    }
    
    console.error('Error al desactivar configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
