import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener datos del expositor para la página de votación
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);
    
    if (isNaN(userId)) {
      return NextResponse.json({ 
        error: 'ID de usuario inválido' 
      }, { status: 400 });
    }

    const exhibitor = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        BusinessProfile: {
          select: {
            headline: true,
            description: true,
            logoUrl: true,
            status: true,
            visionId: true,
            vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!exhibitor) {
      return NextResponse.json({ 
        error: 'Expositor no encontrado' 
      }, { status: 404 });
    }

    return NextResponse.json({
      exhibitor: {
        id: exhibitor.id,
        nombre: exhibitor.nombre,
        apellido: '',
        imagen: exhibitor.BusinessProfile?.logoUrl || exhibitor.imagen,
        headline: exhibitor.BusinessProfile?.headline || null
      },
      visionId: exhibitor.BusinessProfile?.visionId || null,
      visionName: exhibitor.BusinessProfile?.vision?.nombre || null
    });

  } catch (error) {
    logger.error('Error fetching exhibitor:', error);
    return NextResponse.json({ 
      error: 'Error al obtener datos del expositor' 
    }, { status: 500 });
  }
}
