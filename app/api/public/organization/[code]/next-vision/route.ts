import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const organizationId = parseInt(code);
    
    console.log('🔍 Searching next vision for organization:', organizationId);

    if (isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, error: 'ID de organización inválido' },
        { status: 400 }
      );
    }

    // Buscar visión activa de nivel BASIC:
    // 1. Primero buscar visiones que aún no han terminado (endDate >= hoy o sin endDate)
    // 2. Si ya empezó pero no ha terminado, es válida para inscripción
    const today = new Date();
    
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId: organizationId,
        isActive: true,
        enabledLevels: {
          has: 'BASIC'
        },
        // La visión es válida si:
        // - No tiene endDate (visión sin fecha de fin definida)
        // - O su endDate es mayor o igual a hoy
        OR: [
          { endDate: null },
          { endDate: { gte: today } }
        ]
      },
      orderBy: {
        startDate: 'asc'
      },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        descripcion: true,
        maxParticipantes: true,
        Organization: {
          select: {
            address: true
          }
        },
        VisionParticipante: {
          select: {
            id: true
          }
        }
      }
    });

    console.log('📅 Next vision found:', nextVision);

    const response = {
      success: true,
      nextVision: nextVision ? {
        id: nextVision.id,
        nombre: nextVision.nombre,
        startDate: nextVision.startDate,
        descripcion: nextVision.descripcion,
        maxParticipantes: nextVision.maxParticipantes,
        currentParticipantes: nextVision.VisionParticipante?.length || 0,
        location: nextVision.Organization?.address || null
      } : null
    };

    console.log('✅ Sending response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching next vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información' },
      { status: 500 }
    );
  }
}
