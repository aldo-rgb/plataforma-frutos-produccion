import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * ⚠️ API: Registrar llamada perdida (Strike)
 * POST /api/mentor/registrar-falta
 * 
 * Body:
 * {
 *   studentId: number,
 *   reason?: string (opcional)
 * }
 * 
 * Acciones:
 * 1. Crea un CallBooking con status MISSED
 * 2. Incrementa missedCallsCount del alumno
 * 3. Si llega a 3 strikes → marca isActive = false
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea mentor o coordinador
    if (session.user.rol !== 'MENTOR' && session.user.rol !== 'LIDER' && session.user.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'Solo mentores pueden registrar faltas' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, reason } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId es requerido' }, { status: 400 });
    }

    const mentorId = session.user.id;

    // Verificar que el alumno esté asignado a este mentor
    const alumno = await prisma.usuario.findFirst({
      where: {
        id: studentId,
        mentorId: mentorId
      }
    });

    if (!alumno) {
      return NextResponse.json({ 
        error: 'Alumno no encontrado o no está asignado a ti' 
      }, { status: 404 });
    }

    // Verificar si ya tiene 3 strikes
    if (alumno.missedCallsCount >= 3) {
      return NextResponse.json({ 
        error: 'El alumno ya tiene 3 strikes. No se pueden agregar más.' 
      }, { status: 400 });
    }

    // 1️⃣ Crear registro de llamada perdida
    const callBooking = await prisma.callBooking.create({
      data: {
        mentorId: mentorId,
        studentId: studentId,
        scheduledAt: new Date(), // Fecha actual (falta no programada)
        status: 'MISSED',
        duration: 15,
        notes: reason || 'Falta registrada manualmente por el mentor'
      }
    });

    // 2️⃣ Incrementar contador de faltas
    const nuevoContador = alumno.missedCallsCount + 1;
    
    // 3️⃣ Si llega a 3, desactivar alumno
    const shouldDeactivate = nuevoContador >= 3;
    
    const alumnoActualizado = await prisma.usuario.update({
      where: { id: studentId },
      data: {
        missedCallsCount: nuevoContador,
        ...(shouldDeactivate && { isActive: false })
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        missedCallsCount: true,
        isActive: true
      }
    });

    console.log(`⚠️ Strike registrado: ${alumno.nombre} ahora tiene ${nuevoContador}/3 faltas`);

    if (shouldDeactivate) {
      console.log(`💀 ALUMNO ELIMINADO: ${alumno.nombre} (3 strikes)`);
    }

    return NextResponse.json({
      success: true,
      message: shouldDeactivate 
        ? '🚨 Alumno ELIMINADO por acumular 3 faltas'
        : `✅ Falta registrada. ${alumno.nombre} tiene ${nuevoContador}/3 strikes`,
      alumno: alumnoActualizado,
      callBooking: {
        id: callBooking.id,
        status: callBooking.status,
        createdAt: callBooking.createdAt
      },
      deactivated: shouldDeactivate
    });

  } catch (error) {
    console.error('❌ Error al registrar falta:', error);
    return NextResponse.json({ 
      error: 'Error al registrar la falta',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * 🔄 API: Resetear strikes de un alumno (solo coordinadores)
 * DELETE /api/mentor/registrar-falta?studentId=123
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo coordinadores pueden resetear strikes
    if (session.user.rol !== 'COORDINADOR' && session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ 
        error: 'Solo coordinadores pueden resetear strikes' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = parseInt(searchParams.get('studentId') || '0');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId es requerido' }, { status: 400 });
    }

    // Resetear contador y reactivar alumno
    const alumno = await prisma.usuario.update({
      where: { id: studentId },
      data: {
        missedCallsCount: 0,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        missedCallsCount: true,
        isActive: true
      }
    });

    console.log(`🔄 Strikes reseteados para ${alumno.nombre} por ${session.user.name}`);

    return NextResponse.json({
      success: true,
      message: `Strikes reseteados. ${alumno.nombre} tiene una nueva oportunidad.`,
      alumno
    });

  } catch (error) {
    console.error('❌ Error al resetear strikes:', error);
    return NextResponse.json({ 
      error: 'Error al resetear strikes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
