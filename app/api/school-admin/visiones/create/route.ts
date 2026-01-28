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
      coordinadorId,
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

    // Validar que no exista otra visión con el mismo nombre en la organización
    const existingVision = await prisma.vision.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        organizationId: user.organizationId
      }
    });

    if (existingVision) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una visión con este nombre en tu organización' },
        { status: 400 }
      );
    }

    if (!coordinadorId) {
      return NextResponse.json(
        { success: false, error: 'Debes asignar un coordinador a la visión' },
        { status: 400 }
      );
    }

    // Validar que el coordinador existe y pertenece a la misma organización
    const coordinador = await prisma.usuario.findUnique({
      where: { id: parseInt(coordinadorId) },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        nombre: true
      }
    });

    if (!coordinador) {
      return NextResponse.json(
        { success: false, error: 'El coordinador seleccionado no existe' },
        { status: 400 }
      );
    }

    if (coordinador.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'El coordinador debe pertenecer a tu organización' },
        { status: 400 }
      );
    }

    if (coordinador.rol !== 'COORDINADOR' && coordinador.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'El usuario seleccionado no tiene rol de coordinador' },
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
        coordinadorId: parseInt(coordinadorId),
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
        updatedAt: new Date()
      },
    });

    console.log(`✅ Visión "${vision.nombre}" creada exitosamente`);
    console.log(`   Coordinador asignado: ${coordinador.nombre} (ID: ${coordinador.id})`);
    console.log(`   Organización: ${user.organizationId}`);

    return NextResponse.json({
      success: true,
      vision,
      message: `Visión creada exitosamente y asignada a ${coordinador.nombre}`,
    });
  } catch (error) {
    console.error('Error creating vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear la visión' },
      { status: 500 }
    );
  }
}
