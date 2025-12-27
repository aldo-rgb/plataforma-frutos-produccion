import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/quantum/detector
 * Detecta tareas retrasadas (+3 días) del usuario actual
 * Filtra solo tareas STANDARD (excluye MISSION, EXTRAORDINARY, CHALLENGE)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Calcular fecha límite (HOY - 3 días)
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    tresDiasAtras.setHours(0, 0, 0, 0);

    console.log('🔍 Buscando tareas retrasadas para:', usuario.nombre);
    console.log('📅 Fecha límite:', tresDiasAtras.toISOString());

    // Query estricto: PENDING + overdue > 3 días + STANDARD only
    const tareasRetrasadas = await prisma.taskInstance.findMany({
      where: {
        usuarioId: usuario.id,
        status: 'PENDING',
        dueDate: {
          lt: tresDiasAtras
        },
        Accion: {
          rarity: 'COMMON' // STANDARD tasks (excluye RARE, EPIC, LEGENDARY = misiones/extraordinarias)
        }
      },
      include: {
        Accion: {
          include: {
            Meta: {
              select: {
                categoria: true,
                metaPrincipal: true
              }
            }
          }
        }
      },
      orderBy: {
        dueDate: 'asc' // Más antiguas primero
      }
    });

    console.log(`📊 Tareas retrasadas encontradas: ${tareasRetrasadas.length}`);

    // Agrupar por categoría para mejor contexto
    const tareasPorCategoria = tareasRetrasadas.reduce((acc, tarea) => {
      const categoria = tarea.Accion.Meta?.categoria || 'SIN_CATEGORIA';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push({
        id: tarea.id,
        accionId: tarea.accionId,
        texto: tarea.Accion.texto,
        dueDate: tarea.dueDate,
        diasRetraso: Math.floor((new Date().getTime() - new Date(tarea.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        metaPrincipal: tarea.Accion.Meta?.metaPrincipal,
        categoria: tarea.Accion.Meta?.categoria,
        postponeCount: tarea.postponeCount
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Calcular estadísticas
    const stats = {
      total: tareasRetrasadas.length,
      categorias: Object.keys(tareasPorCategoria).length,
      diasPromedioRetraso: tareasRetrasadas.length > 0
        ? Math.floor(
            tareasRetrasadas.reduce((sum, t) => {
              return sum + Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / tareasRetrasadas.length
          )
        : 0,
      masRetrasada: tareasRetrasadas.length > 0
        ? Math.floor((new Date().getTime() - new Date(tareasRetrasadas[0].dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    };

    return NextResponse.json({
      needsIntervention: tareasRetrasadas.length > 0,
      stats,
      tareasPorCategoria,
      tareasRaw: tareasRetrasadas.map(t => ({
        id: t.id,
        accionId: t.accionId,
        texto: t.Accion.texto,
        dueDate: t.dueDate,
        diasRetraso: Math.floor((new Date().getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        categoria: t.Accion.Meta?.categoria
      })),
      message: tareasRetrasadas.length > 0
        ? `${tareasRetrasadas.length} tareas esperan tu atención`
        : 'Todo al día! 🎉'
    });

  } catch (error: any) {
    console.error('❌ Error en detector:', error);
    return NextResponse.json(
      { error: 'Error al detectar tareas', details: error.message },
      { status: 500 }
    );
  }
}
