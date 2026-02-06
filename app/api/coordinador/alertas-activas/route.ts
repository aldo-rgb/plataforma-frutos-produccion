import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener usuarios del coordinador
    let whereClause: any = {};
    
    if (coordinador.organizationId) {
      whereClause.organizationId = coordinador.organizationId;
    } else {
      whereClause.coordinadorId = coordinador.id;
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        }
      },
      select: { id: true }
    });
    const usuarioIds = usuarios.map(u => u.id);

    // Fecha límite: 30 días atrás
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);

    // Buscar tareas postergadas de más de 30 días
    const tareasPostergadas = await prisma.tarea.findMany({
      where: {
        usuarioId: { in: usuarioIds },
        fechaLimite: {
          lt: fechaLimite
        },
        completada: false
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // Agrupar por usuario
    const alertasPorUsuario = new Map<number, any>();

    tareasPostergadas.forEach(tarea => {
      const diasRetraso = Math.floor(
        (Date.now() - tarea.fechaLimite.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!alertasPorUsuario.has(tarea.usuarioId)) {
        alertasPorUsuario.set(tarea.usuarioId, {
          usuarioId: tarea.usuarioId,
          usuario: {
            nombre: tarea.Usuario.nombre,
            email: tarea.Usuario.email
          },
          tareasPostergadas: 0,
          diasMaxPostergacion: 0
        });
      }

      const alerta = alertasPorUsuario.get(tarea.usuarioId);
      alerta.tareasPostergadas++;
      alerta.diasMaxPostergacion = Math.max(alerta.diasMaxPostergacion, diasRetraso);
    });

    const alertas = Array.from(alertasPorUsuario.values())
      .sort((a, b) => b.diasMaxPostergacion - a.diasMaxPostergacion);

    return NextResponse.json({
      success: true,
      alertas
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo alertas activas:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener alertas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
