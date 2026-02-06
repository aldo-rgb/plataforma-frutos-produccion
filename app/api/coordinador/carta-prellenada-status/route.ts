import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/coordinador/carta-prellenada-status
 * Obtiene estadísticas de cartas prellenadas (wizardStep >= 5) para coordinadores
 */
export async function GET(req: Request) {
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

    // Obtener usuarios de la organización del coordinador
    let usuarios: any[] = [];

    if (usuario.organizationId) {
      usuarios = await prisma.usuario.findMany({
        where: {
          organizationId: usuario.organizationId,
          isActive: true,
          rol: { in: ['PARTICIPANTE', 'ESTUDIANTE', 'ALUMNO'] }
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          profileImage: true,
          CartaFrutos: {
            select: {
              id: true,
              estado: true,
              wizardStep: true,
              wizardCompletedAt: true,
              fechaActualizacion: true
            }
          }
        }
      });
    }

    // Si no hay usuarios por organización, buscar por coordinadorId
    if (usuarios.length === 0) {
      usuarios = await prisma.usuario.findMany({
        where: {
          coordinadorId: usuario.id,
          isActive: true
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          profileImage: true,
          CartaFrutos: {
            select: {
              id: true,
              estado: true,
              wizardStep: true,
              wizardCompletedAt: true,
              fechaActualizacion: true
            }
          }
        }
      });
    }

    // Clasificar usuarios
    const cartasPrellenadas: any[] = [];
    const cartasPendientes: any[] = [];

    for (const user of usuarios) {
      const carta = user.CartaFrutos?.[0];
      const isPrellenada = carta && carta.wizardStep >= 5;

      const userData = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        profileImage: user.profileImage,
        cartaId: carta?.id || null,
        estado: carta?.estado || 'SIN_CARTA',
        wizardStep: carta?.wizardStep || 0,
        wizardCompletedAt: carta?.wizardCompletedAt || null,
        fechaActualizacion: carta?.fechaActualizacion || null
      };

      if (isPrellenada) {
        cartasPrellenadas.push(userData);
      } else {
        cartasPendientes.push(userData);
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: usuarios.length,
        prellenadas: cartasPrellenadas.length,
        pendientes: cartasPendientes.length,
        porcentaje: usuarios.length > 0 
          ? Math.round((cartasPrellenadas.length / usuarios.length) * 100) 
          : 0
      },
      cartasPrellenadas,
      cartasPendientes
    });

  } catch (error: any) {
    logger.error('Error en carta-prellenada-status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: error.message },
      { status: 500 }
    );
  }
}
