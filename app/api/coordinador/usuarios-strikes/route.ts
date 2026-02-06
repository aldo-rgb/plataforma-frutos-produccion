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

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    const tieneRolCoordinador = coordinadorRoles.includes(coordinador?.rol || '');
    const tieneFlagCoordinador = coordinador?.esCoordinador || coordinador?.esCoordinadorBasico || coordinador?.esCoordinadorAvanzado || coordinador?.esEntrenador;
    
    if (!coordinador || (!tieneRolCoordinador && !tieneFlagCoordinador)) {
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
      select: {
        id: true,
        nombre: true,
        email: true,
        strikes: true
      },
      orderBy: {
        strikes: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      usuarios
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo usuarios:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener usuarios',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
