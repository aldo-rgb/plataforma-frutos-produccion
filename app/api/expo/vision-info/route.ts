import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'visionId requerido' 
      }, { status: 400 });
    }

    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: {
        id: true,
        nombre: true,
        Organization: {
          select: {
            name: true
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ 
        success: false, 
        error: 'Visión no encontrada' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        organizacion: vision.Organization?.name || 'Organización'
      }
    });

  } catch (error) {
    console.error('Error obteniendo info de visión:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener información',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
