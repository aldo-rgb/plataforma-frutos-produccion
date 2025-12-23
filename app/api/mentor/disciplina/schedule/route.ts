import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener horarios de disciplina del mentor
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener todos los bloques de disciplina del mentor
    const schedules = await prisma.callAvailability.findMany({
      where: {
        mentorId: session.user.id,
        type: 'DISCIPLINE',
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      schedules
    });

  } catch (error) {
    console.error('Error obteniendo horarios de disciplina:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener horarios' },
      { status: 500 }
    );
  }
}

// POST: Guardar horarios de disciplina del mentor
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { horarios } = await req.json();

    // Validar formato
    if (!horarios || typeof horarios !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Formato de horarios inválido' },
        { status: 400 }
      );
    }

    // Eliminar todos los horarios de disciplina existentes del mentor
    await prisma.callAvailability.deleteMany({
      where: {
        mentorId: session.user.id,
        type: 'DISCIPLINE'
      }
    });

    // Crear nuevos horarios
    const bloques: Array<{
      mentorId: number;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      type: 'DISCIPLINE';
      isActive: boolean;
    }> = [];

    // Procesar cada día
    for (const [diaStr, horas] of Object.entries(horarios)) {
      const dia = parseInt(diaStr);
      const horasArray = horas as string[];

      if (!Array.isArray(horasArray) || horasArray.length === 0) continue;

      // Validar que todas las horas estén en el rango 05:00-08:00
      const horasInvalidas = horasArray.filter(h => {
        const hora = parseInt(h.split(':')[0]);
        return hora < 5 || hora >= 8;
      });

      if (horasInvalidas.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Horarios inválidos para disciplina. Solo se permite 05:00-08:00. Encontrados: ${horasInvalidas.join(', ')}` 
          },
          { status: 400 }
        );
      }

      // Ordenar horas y agrupar en bloques consecutivos
      const horasOrdenadas = horasArray
        .map(h => parseInt(h.split(':')[0]))
        .sort((a, b) => a - b);

      let bloqueActual = [horasOrdenadas[0]];

      for (let i = 1; i < horasOrdenadas.length; i++) {
        if (horasOrdenadas[i] === horasOrdenadas[i - 1] + 1) {
          // Consecutivo, agregar al bloque actual
          bloqueActual.push(horasOrdenadas[i]);
        } else {
          // No consecutivo, cerrar bloque actual y empezar uno nuevo
          bloques.push({
            mentorId: session.user.id,
            dayOfWeek: dia,
            startTime: `${String(bloqueActual[0]).padStart(2, '0')}:00`,
            endTime: `${String(bloqueActual[bloqueActual.length - 1] + 1).padStart(2, '0')}:00`,
            type: 'DISCIPLINE',
            isActive: true
          });
          bloqueActual = [horasOrdenadas[i]];
        }
      }

      // Cerrar último bloque
      if (bloqueActual.length > 0) {
        bloques.push({
          mentorId: session.user.id,
          dayOfWeek: dia,
          startTime: `${String(bloqueActual[0]).padStart(2, '0')}:00`,
          endTime: `${String(bloqueActual[bloqueActual.length - 1] + 1).padStart(2, '0')}:00`,
          type: 'DISCIPLINE',
          isActive: true
        });
      }
    }

    // Insertar todos los bloques
    if (bloques.length > 0) {
      await prisma.callAvailability.createMany({
        data: bloques
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Horarios de disciplina guardados correctamente',
      bloquesCreados: bloques.length
    });

  } catch (error) {
    console.error('Error guardando horarios de disciplina:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar horarios' },
      { status: 500 }
    );
  }
}
