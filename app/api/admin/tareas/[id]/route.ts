import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/tareas/[id]
 * Obtiene una tarea específica por ID
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tareaId = parseInt(params.id);
    if (isNaN(tareaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const tarea = await prisma.adminTask.findUnique({
      where: { id: tareaId },
      include: {
        Creator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            Submissions: true
          }
        }
      }
    });

    if (!tarea) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    return NextResponse.json(tarea);

  } catch (error: any) {
    console.error('❌ Error obteniendo tarea admin:', error);
    return NextResponse.json(
      { error: 'Error al obtener tarea', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tareas/[id]
 * Actualiza una tarea admin (principalmente para toggle isActive)
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea ADMIN, COORDINADOR o MENTOR
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!usuario || !['ADMINISTRADOR', 'COORDINADOR', 'MENTOR'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const tareaId = parseInt(params.id);
    if (isNaN(tareaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const { isActive, fechaLimite, horaEvento, pointsReward, fechaEvento } = body;

    // Obtener la tarea actual para conocer su tipo
    const tareaActual = await prisma.adminTask.findUnique({
      where: { id: tareaId },
      select: { type: true, horaEvento: true }
    });

    if (!tareaActual) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    // Validar que las fechas no sean anteriores a ahora (considerando hora si existe)
    if (fechaLimite !== undefined && fechaLimite) {
      const hora = horaEvento !== undefined ? horaEvento : tareaActual.horaEvento;
      
      if (hora) {
        // Si tiene hora, validar fecha+hora completa
        const fechaHoraLimite = new Date(`${fechaLimite}T${hora}`);
        const ahora = new Date();
        
        if (fechaHoraLimite <= ahora) {
          return NextResponse.json(
            { error: 'La fecha y hora límite deben ser futuras' },
            { status: 400 }
          );
        }
      } else {
        // Si no tiene hora, solo validar que la fecha no sea anterior a hoy
        const fechaLimiteDate = new Date(fechaLimite);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaLimiteDate < hoy) {
          return NextResponse.json(
            { error: 'La fecha límite no puede ser anterior a hoy' },
            { status: 400 }
          );
        }
      }
    }

    if (fechaEvento !== undefined && fechaEvento) {
      const hora = horaEvento !== undefined ? horaEvento : tareaActual.horaEvento;
      
      if (hora) {
        // Si tiene hora, validar fecha+hora completa
        const fechaHoraEvento = new Date(`${fechaEvento}T${hora}`);
        const ahora = new Date();
        
        if (fechaHoraEvento <= ahora) {
          return NextResponse.json(
            { error: 'La fecha y hora del evento deben ser futuras' },
            { status: 400 }
          );
        }
      } else {
        // Si no tiene hora, solo validar que la fecha no sea anterior a hoy
        const fechaEventoDate = new Date(fechaEvento);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaEventoDate < hoy) {
          return NextResponse.json(
            { error: 'La fecha del evento no puede ser anterior a hoy' },
            { status: 400 }
          );
        }
      }
    }

    const updateData: any = {};
    
    if (isActive !== undefined) updateData.isActive = isActive;
    if (fechaLimite !== undefined) {
      if (fechaLimite) {
        const [year, month, day] = fechaLimite.split('-').map(Number);
        updateData.fechaLimite = new Date(year, month - 1, day, 12, 0, 0, 0);
      } else {
        updateData.fechaLimite = null;
      }
    }
    if (horaEvento !== undefined) updateData.horaEvento = horaEvento;
    if (pointsReward !== undefined) updateData.pointsReward = pointsReward;
    if (fechaEvento !== undefined) {
      if (fechaEvento) {
        const [year, month, day] = fechaEvento.split('-').map(Number);
        updateData.fechaEvento = new Date(year, month - 1, day, 12, 0, 0, 0);
      } else {
        updateData.fechaEvento = null;
      }
    }

    const tarea = await prisma.adminTask.update({
      where: { id: tareaId },
      data: updateData,
      include: {
        Creator: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Revalidar caché para que los cambios se reflejen inmediatamente
    revalidatePath('/dashboard');
    revalidatePath('/api/tareas/zona-ejecucion');

    console.log(`✅ Tarea ${tareaId} actualizada por usuario ${session.user.id}`);

    return NextResponse.json(tarea);

  } catch (error: any) {
    console.error('❌ Error actualizando tarea admin:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tarea', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tareas/[id]
 * Elimina una tarea admin (y sus submissions)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea ADMIN, COORDINADOR o MENTOR
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id }
    });

    if (!usuario || !['ADMINISTRADOR', 'COORDINADOR', 'MENTOR'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const tareaId = parseInt(params.id);
    if (isNaN(tareaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Primero eliminar todas las submissions asociadas
    await prisma.taskSubmission.deleteMany({
      where: { adminTaskId: tareaId }
    });

    // Luego eliminar la tarea
    await prisma.adminTask.delete({
      where: { id: tareaId }
    });

    console.log(`✅ Tarea ${tareaId} eliminada por ${usuario.nombre}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error eliminando tarea admin:', error);
    return NextResponse.json(
      { error: 'Error al eliminar tarea', details: error.message },
      { status: 500 }
    );
  }
}
