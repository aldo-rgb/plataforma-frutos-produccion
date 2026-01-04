import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/disponibilidad/semanal
 * Obtiene la configuración de disponibilidad semanal del mentor
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    const disponibilidad = await prisma.disponibilidadSemanal.findMany({
      where: { 
        perfilMentorId: perfilMentor.id,
        activo: true
      },
      orderBy: [
        { diaSemana: 'asc' },
        { horaInicio: 'asc' }
      ]
    });

    return NextResponse.json({ 
      success: true, 
      disponibilidad 
    });

  } catch (error) {
    console.error('❌ Error al obtener disponibilidad:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

/**
 * POST /api/mentor/disponibilidad/semanal
 * Crea un nuevo bloque de disponibilidad semanal O actualiza todos los bloques de un día
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('📥 Body recibido:', JSON.stringify(body, null, 2));
    
    // Nuevo formato: { dia: number, bloques: [{horaInicio, horaFin}] }
    if (body.dia !== undefined && body.bloques !== undefined) {
      console.log('✅ Usando formato de actualización completa del día');
      return await actualizarDiaCompleto(session, body);
    }
    
    // Formato antiguo: { diaSemana, horaInicio, horaFin }
    const { diaSemana, horaInicio, horaFin } = body;

    // Validaciones
    if (diaSemana === undefined || !horaInicio || !horaFin) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 });
    }

    if (diaSemana < 0 || diaSemana > 6) {
      return NextResponse.json({ 
        error: 'Día de semana inválido (0-6)' 
      }, { status: 400 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    // Verificar solapamientos
    const solapamiento = await prisma.disponibilidadSemanal.findFirst({
      where: {
        perfilMentorId: perfilMentor.id,
        diaSemana,
        activo: true,
        OR: [
          {
            AND: [
              { horaInicio: { lte: horaInicio } },
              { horaFin: { gt: horaInicio } }
            ]
          },
          {
            AND: [
              { horaInicio: { lt: horaFin } },
              { horaFin: { gte: horaFin } }
            ]
          },
          {
            AND: [
              { horaInicio: { gte: horaInicio } },
              { horaFin: { lte: horaFin } }
            ]
          }
        ]
      }
    });

    if (solapamiento) {
      return NextResponse.json({ 
        error: 'Este horario se solapa con otro bloque existente' 
      }, { status: 400 });
    }

    const nuevaDisponibilidad = await prisma.disponibilidadSemanal.create({
      data: {
        perfilMentorId: perfilMentor.id,
        diaSemana,
        horaInicio,
        horaFin
      }
    });

    return NextResponse.json({ 
      success: true, 
      disponibilidad: nuevaDisponibilidad 
    });

  } catch (error) {
    console.error('❌ Error al crear disponibilidad:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

/**
 * Función auxiliar para actualizar todos los bloques de un día específico
 */
async function actualizarDiaCompleto(session: any, body: { dia: number; bloques: Array<{horaInicio: string, horaFin: string}> }) {
  try {
    const { dia, bloques } = body;
    console.log(`🔄 Actualizando día ${dia} con ${bloques.length} bloques`);
    
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      console.error('❌ Perfil de mentor no encontrado');
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    console.log(`🗑️ Eliminando bloques existentes para día ${dia}...`);
    // Eliminar todos los bloques existentes para ese día
    await prisma.disponibilidadSemanal.deleteMany({
      where: {
        perfilMentorId: perfilMentor.id,
        diaSemana: dia
      }
    });

    // Crear los nuevos bloques
    if (bloques.length > 0) {
      console.log(`➕ Creando ${bloques.length} nuevos bloques...`);
      await prisma.disponibilidadSemanal.createMany({
        data: bloques.map(bloque => ({
          perfilMentorId: perfilMentor.id,
          diaSemana: dia,
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
          activo: true
        }))
      });
    }

    // Obtener los bloques actualizados
    const disponibilidadActualizada = await prisma.disponibilidadSemanal.findMany({
      where: {
        perfilMentorId: perfilMentor.id,
        diaSemana: dia
      },
      orderBy: {
        horaInicio: 'asc'
      }
    });

    console.log(`✅ Día actualizado exitosamente. Bloques actuales: ${disponibilidadActualizada.length}`);
    return NextResponse.json({ 
      success: true, 
      disponibilidad: disponibilidadActualizada 
    });
  } catch (error) {
    console.error('❌ Error en actualizarDiaCompleto:', error);
    throw error;
  }
}

/**
 * DELETE /api/mentor/disponibilidad/semanal?id=123
 * Elimina un bloque de disponibilidad (con validación de conflictos)
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'ID requerido' 
      }, { status: 400 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    const disponibilidad = await prisma.disponibilidadSemanal.findUnique({
      where: { id: parseInt(id) }
    });

    if (!disponibilidad || disponibilidad.perfilMentorId !== perfilMentor.id) {
      return NextResponse.json({ 
        error: 'Disponibilidad no encontrada' 
      }, { status: 404 });
    }

    // 🔒 ESTRATEGIA A: Bloqueo Preventivo
    // Verificar si hay sesiones futuras confirmadas en este horario
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const conflictos = await prisma.solicitudMentoria.findMany({
      where: {
        perfilMentorId: perfilMentor.id,
        estado: 'CONFIRMADA',
        fechaSolicitada: { gte: hoy }
      },
      include: {
        Usuario: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Filtrar conflictos que caigan en este día/hora
    const conflictosFiltrados = conflictos.filter(sesion => {
      if (!sesion.fechaSolicitada) return false;
      const fechaSesion = new Date(sesion.fechaSolicitada);
      const diaSesion = fechaSesion.getDay();
      const horaSesion = fechaSesion.toTimeString().substring(0, 5); // "HH:mm"

      return diaSesion === disponibilidad.diaSemana &&
             horaSesion >= disponibilidad.horaInicio &&
             horaSesion < disponibilidad.horaFin;
    });

    if (conflictosFiltrados.length > 0) {
      return NextResponse.json({ 
        error: `No puedes eliminar este horario porque tienes ${conflictosFiltrados.length} sesión(es) confirmada(s)`,
        conflictos: conflictos.map(c => ({
          id: c.id,
          estudiante: c.Usuario.nombre,
          fecha: c.fechaSolicitada
        }))
      }, { status: 409 });
    }

    // Si no hay conflictos, eliminar
    await prisma.disponibilidadSemanal.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Horario eliminado correctamente' 
    });

  } catch (error) {
    console.error('❌ Error al eliminar disponibilidad:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
