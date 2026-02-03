import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Crear una nueva solicitud de entrenador
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    // Verificar que no tenga una solicitud pendiente
    const existingApplication = await prisma.trainerApplication.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud de entrenador pendiente' },
        { status: 400 }
      );
    }

    // Verificar que no sea ya entrenador
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { esEntrenador: true, rol: true },
    });

    if (usuario?.esEntrenador || usuario?.rol === 'TRAINER') {
      return NextResponse.json(
        { error: 'Ya eres entrenador' },
        { status: 400 }
      );
    }

    // Validar campos requeridos - soportar ambos nombres de campos
    const {
      titulo,
      especialidad,
      especialidadOtra,
      especialidadesSecundarias,
      biografia,
      biografiaCompleta,
      experienciaAnios,
      experienciaDescripcion,
      certificaciones,
      logros,
      expertiseTags,
      metodologia,
      disponibilidad,
      ubicacion,
      documentos,
      documentosUrls,
      videoIntroUrl,
    } = body;

    // Usar biografiaCompleta si biografia no está presente
    const bioText = biografia || biografiaCompleta;

    if (!titulo || !especialidad || !bioText) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: título, especialidad y biografía son obligatorios' },
        { status: 400 }
      );
    }

    // Validar longitud mínima de biografía (20 palabras)
    const palabrasBio = bioText.trim().split(/\s+/).length;
    if (palabrasBio < 20) {
      return NextResponse.json(
        { error: 'La biografía debe tener al menos 20 palabras' },
        { status: 400 }
      );
    }

    // Preparar especialidad final
    const especialidadFinal = especialidad === 'Otros' && especialidadOtra 
      ? especialidadOtra 
      : especialidad;

    // Crear la solicitud directamente en estado PENDING (no hay pago como en mentor)
    const application = await prisma.trainerApplication.create({
      data: {
        userId,
        status: 'PENDING',
        titulo: titulo.trim(),
        especialidad: especialidadFinal.trim(),
        biografia: bioText.trim(),
        experienciaAnios: experienciaAnios ? parseInt(String(experienciaAnios)) : null,
        experienciaDescripcion: experienciaDescripcion?.trim() || null,
        certificaciones: Array.isArray(logros) ? logros.join(', ') : (certificaciones?.trim() || null),
        metodologia: Array.isArray(expertiseTags) ? expertiseTags.join(', ') : (metodologia?.trim() || null),
        disponibilidad: Array.isArray(especialidadesSecundarias) ? especialidadesSecundarias.join(', ') : (disponibilidad?.trim() || null),
        ubicacion: ubicacion?.trim() || null,
        documentos: documentosUrls || documentos || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de entrenador creada exitosamente',
      application,
    });
  } catch (error) {
    console.error('Error creating trainer application:', error);
    return NextResponse.json(
      { error: 'Error al crear la solicitud' },
      { status: 500 }
    );
  }
}
