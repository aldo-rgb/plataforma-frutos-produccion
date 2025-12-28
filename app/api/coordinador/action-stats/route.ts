import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario || usuario.rol !== 'COORDINADOR') {
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

    // Cartas pendientes: contar cartas en estados no aprobados
    const cartasPendientes = await prisma.cartaFrutos.count({
      where: {
        usuarioId: { in: usuarioIds },
        estado: {
          in: ['BORRADOR', 'EN_REVISION', 'PENDIENTE']
        }
      }
    });

    // Cartas autorizadas
    const cartasAutorizadas = await prisma.cartaFrutos.count({
      where: {
        usuarioId: { in: usuarioIds },
        estado: 'APROBADA'
      }
    });

    // Alertas activas: usuarios con tareas postergadas +30 días
    const fechaLimite30Dias = new Date();
    fechaLimite30Dias.setDate(fechaLimite30Dias.getDate() - 30);
    
    const tareasPostergadas = await prisma.tarea.groupBy({
      by: ['usuarioId'],
      where: {
        usuarioId: { in: usuarioIds },
        fechaLimite: {
          lt: fechaLimite30Dias
        },
        completada: false
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
    console.error('❌ Error obteniendo estadísticas de acción:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estadísticas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
