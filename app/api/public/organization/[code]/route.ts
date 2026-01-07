import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    console.log('🔍 Searching organization with code:', code);

    // Buscar organización por ID o slug
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: code },
          { id: !isNaN(Number(code)) ? parseInt(code) : 0 }
        ]
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandColor: true,
        slug: true
      }
    });

    console.log('🏢 Organization found:', organization);

    if (!organization) {
      console.log('❌ Organization not found');
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Buscar la próxima visión de nivel BASIC que esté activa y tenga fecha futura
    // Nota: Usando organizationId en lugar de organizacionId
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId: organization.id,
        isActive: true,
        enabledLevels: {
          has: 'BASIC'
        },
        startDate: {
          gte: new Date()
        }
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
        VisionParticipante: {
          select: {
            id: true
          }
        }
      }
    });

    console.log('📅 Next vision found:', nextVision);
    console.log('📊 Query conditions:', {
      organizationId: organization.id,
      isActive: true,
      hasBasic: 'BASIC in enabledLevels',
      startDateGte: new Date().toISOString()
    });

    const response = {
      success: true,
      organization,
      nextVision: nextVision ? {
        id: nextVision.id,
        nombre: nextVision.nombre,
        startDate: nextVision.startDate,
        descripcion: nextVision.descripcion,
        maxParticipantes: nextVision.maxParticipantes,
        currentParticipantes: nextVision.VisionParticipante?.length || 0
      } : null
    };

    console.log('✅ Sending response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información' },
      { status: 500 }
    );
  }
}
