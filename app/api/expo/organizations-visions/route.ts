import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener organizaciones con visiones activas (PL en curso)
export async function GET(req: NextRequest) {
  try {
    // Obtener organizaciones que tienen visiones activas con PL
    const organizations = await prisma.organization.findMany({
      where: {
        Visions: {
          some: {
            isActive: true,
            enabledLevels: {
              has: 'PL' // Tiene PL en los niveles habilitados
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        Visions: {
          where: {
            isActive: true,
            enabledLevels: {
              has: 'PL'
            }
          },
          select: {
            id: true,
            nombre: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Formatear respuesta
    const formattedOrgs = organizations.map(org => ({
      id: org.id,
      name: org.name,
      visions: org.Visions.map(v => ({
        id: v.id,
        nombre: v.nombre
      }))
    }));

    return NextResponse.json({
      success: true,
      organizations: formattedOrgs
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Error al cargar organizaciones' },
      { status: 500 }
    );
  }
}
