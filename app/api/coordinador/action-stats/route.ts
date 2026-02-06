import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EstadoCarta } from '@prisma/client';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    
    if (!usuario || !coordinadorRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Buscar usuarios relacionados
    let whereClause: any = {};
    
    if (usuario.organizationId) {
      whereClause.organizationId = usuario.organizationId;
    } else {
      whereClause.coordinadorId = usuario.id;
    }

    // Obtener IDs de usuarios relacionados
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

    // Contar cartas existentes por estado
    const cartasExistentes = await prisma.cartaFrutos.findMany({
      where: {
        usuarioId: { in: usuarioIds }
      },
      select: {
        usuarioId: true,
        estado: true
      }
    });

    // Usuarios con carta
    const usuariosConCarta = new Set(cartasExistentes.map(c => c.usuarioId));
    const usuariosSinCarta = usuarioIds.length - usuariosConCarta.size;

    // Cartas pendientes: usuarios sin carta + cartas en estados no aprobados
    const cartasEnEstadoPendiente = cartasExistentes.filter(c => 
      [EstadoCarta.BORRADOR, EstadoCarta.EN_REVISION, EstadoCarta.CAMBIOS_REQUERIDOS, EstadoCarta.RECHAZADA].includes(c.estado as any)
    );
    const cartasPendientes = usuariosSinCarta + cartasEnEstadoPendiente.length;

    // Cartas autorizadas
    const cartasAutorizadas = cartasExistentes.filter(c => c.estado === EstadoCarta.APROBADA).length;

    // Alertas activas: usuarios con tareas postergadas +30 días
    const fechaLimite30Dias = new Date();
    fechaLimite30Dias.setDate(fechaLimite30Dias.getDate() - 30);
    
    const tareasPostergadas = await prisma.taskInstance.groupBy({
      by: ['usuarioId'],
      where: {
        usuarioId: { in: usuarioIds },
        dueDate: {
          lt: fechaLimite30Dias
        },
        status: 'PENDING'
      }
    });
    const alertasActivas = tareasPostergadas.length;

    // Participantes en riesgo (con 2+ llamadas perdidas)
    const participantesRiesgo = await prisma.usuario.count({
      where: {
        ...whereClause,
        rol: {
          in: ['PARTICIPANTE', 'GAMECHANGER']
        },
        llamadasPerdidas: {
          gte: 2
        }
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        cartasPendientes,
        cartasAutorizadas,
        alertasActivas,
        participantesRiesgo
      }
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo estadísticas de acción:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estadísticas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
