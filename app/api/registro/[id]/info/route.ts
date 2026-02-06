import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener información de la visión con organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        maxParticipantes: true,
        isActive: true,
        organizationId: true,
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        _count: {
          select: {
            VisionParticipante: true
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    if (!vision.isActive) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no está activa' },
        { status: 403 }
      );
    }

    const currentParticipants = vision._count.VisionParticipante;
    const availableSlots = vision.maxParticipantes 
      ? vision.maxParticipantes - currentParticipants 
      : null;

    return NextResponse.json({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre,
        descripcion: vision.descripcion,
        maxParticipantes: vision.maxParticipantes,
        currentParticipants,
        availableSlots,
        organization: vision.Organization
      }
    });

  } catch (error) {
    logger.error('Error al obtener información de visión:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar información' },
      { status: 500 }
    );
  }
}
