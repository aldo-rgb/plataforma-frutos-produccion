import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// API pública para obtener visiones con productos activos (para registro de formulario médico)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Inicio del día actual para comparaciones
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Buscar visiones que tengan productos activos (que no hayan terminado)
    // Un producto está activo si endDate >= inicio del día actual
    const visions = await prisma.vision.findMany({
      where: {
        organizationId: parseInt(orgId),
        isActive: true,
        SchoolProduct: {
          some: {
            isActive: true,
            // Producto activo: aún no termina (endDate >= hoy)
            endDate: { gte: startOfToday }
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        SchoolProduct: {
          where: {
            isActive: true,
            endDate: { gte: startOfToday }
          },
          select: {
            id: true,
            name: true,
            levelType: true,
            startDate: true,
            endDate: true
          },
          orderBy: {
            startDate: 'asc'
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json({ visions });
  } catch (error) {
    console.error('Error fetching public visions:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
