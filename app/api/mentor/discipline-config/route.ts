import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Obtener configuración de disciplina del mentor
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId') || session.user.id;

    const config = await prisma.disciplineConfig.findUnique({
      where: { mentorId: Number(mentorId) }
    });

    if (!config) {
      // Devolver configuración por defecto si no existe
      return NextResponse.json({
        allowedDays: [],
        startHour: '05:00',
        endHour: '08:00'
      });
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('Error al obtener configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear o actualizar configuración de disciplina
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
        error: 'Solo los mentores pueden configurar días de disciplina' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { allowedDays, startHour, endHour } = body;

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
    if (!timeRegex.test(startHour) || !timeRegex.test(endHour)) {
      return NextResponse.json({ 
        error: 'Formato de hora inválido. Debe ser HH:MM' 
      }, { status: 400 });
    }

    // Validar que startHour < endHour
    if (startHour >= endHour) {
      return NextResponse.json({ 
        error: 'La hora de inicio debe ser menor que la hora de fin' 
      }, { status: 400 });
    }

    const mentorId = Number(session.user.id);

    // Upsert: crear si no existe, actualizar si existe
    const config = await prisma.disciplineConfig.upsert({
      where: { mentorId },
      create: {
        mentorId,
        allowedDays,
        startHour,
        endHour
      },
      update: {
        allowedDays,
        startHour,
        endHour
      }
    });

    console.log(`✅ Configuración de disciplina guardada para mentor ${mentorId}:`, config);

    return NextResponse.json({ 
      success: true,
      config,
      message: 'Configuración guardada exitosamente' 
    });

  } catch (error) {
    console.error('Error al guardar configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Eliminar configuración de disciplina
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = Number(session.user.id);

    await prisma.disciplineConfig.delete({
      where: { mentorId }
    });

    console.log(`🗑️ Configuración de disciplina eliminada para mentor ${mentorId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Configuración eliminada exitosamente' 
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'No existe configuración para eliminar' 
      }, { status: 404 });
    }
    
    console.error('Error al eliminar configuración de disciplina:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
