import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/admin/schools
 * Obtiene lista de todas las organizaciones/escuelas
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    logger.debug('🏫 Cargando organizaciones...');

    // Obtener todas las organizaciones con conteo de usuarios
    const schools = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandColor: true,
        _count: {
          select: {
            Users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.debug(`✅ ${schools.length} organizaciones encontradas`);

    return NextResponse.json({
      schools: schools.map(school => ({
        id: school.id,
        name: school.name,
        logo: school.logoUrl,
        brandColor: school.brandColor,
        studentCount: school._count.Users
      }))
    });

  } catch (error) {
    logger.error('❌ Error obteniendo escuelas:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo escuelas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

