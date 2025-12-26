import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      nombre, 
      descripcion, 
      maxParticipantes,
      startDate,
      endDate,
      forceFinanzasArea,
      forceRelacionesArea,
      forceTalentosArea,
      forceSaludArea,
      forcePazMentalArea,
      forceOcioArea,
      forceTransformationArea,
      transformationGuestsTarget,
      forceCommunityServiceArea 
    } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar que si se activa el área de transformación, tenga un target válido
    if (forceTransformationArea && (!transformationGuestsTarget || transformationGuestsTarget < 1)) {
      return NextResponse.json(
        { success: false, error: 'Debes especificar un número válido de invitados objetivo' },
        { status: 400 }
      );
    }

    // Crear la visión
    const vision = await prisma.vision.create({
      data: {
        nombre,
        descripcion,
        maxParticipantes,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        coordinadorId: user.id,
        organizationId: user.organizationId,
        isActive: true,
        forceFinanzasArea: forceFinanzasArea ?? undefined,
        forceRelacionesArea: forceRelacionesArea ?? undefined,
        forceTalentosArea: forceTalentosArea ?? undefined,
        forceSaludArea: forceSaludArea ?? undefined,
        forcePazMentalArea: forcePazMentalArea ?? undefined,
        forceOcioArea: forceOcioArea ?? undefined,
        forceTransformationArea: forceTransformationArea ?? undefined,
        transformationGuestsTarget: forceTransformationArea ? transformationGuestsTarget : null,
        forceCommunityServiceArea: forceCommunityServiceArea ?? undefined,
      },
    });

    return NextResponse.json({
      success: true,
      vision,
      message: 'Visión creada exitosamente',
    });
  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la visión' },
      { status: 500 }
    );
  }
}
